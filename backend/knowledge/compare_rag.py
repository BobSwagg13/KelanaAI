"""Compare RAG (Bedrock Knowledge Base) answers against plain base-model answers.

Every question in QUESTIONS is asked two ways against the SAME model
(``amazon.nova-lite-v1:0``):

  - RAG  - ``bedrock-agent-runtime.retrieve`` pulls the top passages from the
           managed Knowledge Base, then ``bedrock-runtime.converse`` answers
           with those passages prepended. (``retrieve_and_generate`` is not
           offered for managed knowledge bases, so generation is explicit here.)
  - Base - the same ``converse`` call with the question alone, no context.

Same model, same inference config on both sides, so retrieval is the only
variable and the diff between the two answers is what the knowledge base added.

Usage (run from the ``backend/`` directory):

    python knowledge/compare_rag.py --inspect      # list KB data sources, no generation
    python knowledge/compare_rag.py                # run every question (asks to confirm)
    python knowledge/compare_rag.py --yes          # run without the confirmation prompt
    python knowledge/compare_rag.py --from-cache   # re-render the report, zero AWS calls

Reads from ``backend/.env``:

    AWS_REGION, MODEL_ID, AWS_BEARER_TOKEN_BEDROCK   already used by the app
    AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY         SigV4 creds; the bearer
                                                     token cannot call the KB APIs
    KNOWLEDGE_BASE_ID                                the managed Bedrock KB to query

Writes:

    backend/knowledge/cache/rag-comparison-results.json   raw answers + sources
    docs/rag-comparison-report.md                         readable report
    docs/rag-comparison-report.pdf                        the same report as PDF
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent          # backend/knowledge
REPO_ROOT = BASE_DIR.parent.parent                  # repo root
CACHE_PATH = BASE_DIR / "cache" / "rag-comparison-results.json"
REPORT_MD = REPO_ROOT / "docs" / "rag-comparison-report.md"
REPORT_PDF = REPO_ROOT / "docs" / "rag-comparison-report.pdf"

load_dotenv(BASE_DIR.parent / ".env")

NUM_RESULTS = 5
MAX_TOKENS = 1024
TEMPERATURE = 0.7

# Prepended to the retrieved passages on the RAG path. The base path sends the
# bare question; the RAG path sends this + passages + the question through the
# identical converse() call, so retrieval is the only thing that differs.
RAG_INSTRUCTION = (
    "You are a travel assistant. Answer the question using only the reference "
    "passages below. Quote concrete details (numbers, names, rules, dates) from "
    "them. If the passages do not contain the answer, say so plainly rather "
    "than guessing."
)

# Each question is phrased so a good answer depends on a fact that lives only in
# the synced knowledge-base documents, not in the model's general training.
# The knowledge base holds 10 documents: an official Japan single-entry
# short-term-stay visa checklist (April 2025), Tokyo/Osaka/Kyoto travel guides,
# a Japan packing list, a North Korea guide (Koryo Tours, 2019), a Kazakhstan
# guide, an Indonesian traveler payment / cross-border QRIS guide, and an
# Indonesia customs & IMEI registration guide.
QUESTIONS = [
    "As an Indonesian traveller, how can I pay merchants abroad by scanning a "
    "QR code without exchanging cash? Which countries and local QR schemes "
    "support this, and which Indonesian apps can I use?",

    "I'm an Indonesian resident flying home with a new phone and a new laptop I "
    "bought overseas. What is the duty-free allowance, how many devices can I "
    "register for IMEI per arrival, and what taxes apply to the excess?",

    "According to the Japanese government's official checklist, which documents "
    "must a tourist submit for a single-entry short-term-stay visa, and does "
    "that checklist apply to every nationality?",

    "If I take a private tour to North Korea with Koryo Tours, which items are "
    "prohibited from being brought into the country, and may I carry a printed "
    "guidebook about the DPRK?",

    "What is the estimated daily budget for a backpacker in Kyoto, broken down "
    "into accommodation, food, transport, and attractions?",
]

# Written after the 2026-09-01 run by reading cache/rag-comparison-results.json.
# One entry per question, order aligned with QUESTIONS. Re-render with
# `python knowledge/compare_rag.py --from-cache` after editing.
ANALYSIS: list[str] = [
    # Q1 - Cross-Border QRIS
    "RAG named the mechanism correctly (Cross-Border QRIS / QRIS Antarnegara), "
    "the three live corridors and their local schemes (PromptPay in Thailand, "
    "DuitNow in Malaysia, NETS/SGQR in Singapore), the correct participating "
    "apps (BCA mobile, Livin' by Mandiri, BRImo, BNI Mobile, GoPay, Dana, OVO, "
    "ShopeePay) and the real settlement path (Bank Indonesia interbank rate, no "
    "markup). It was conservative - it left out the China / Japan / South Korea "
    "rollout that a retrieved passage mentioned as 'progressively rolling out'. "
    "The base model fabricated a country-by-country table of unrelated domestic "
    "wallets (PayPay, Kakao Pay, Touch 'n Go, GCash...), implied Japan and "
    "Korea are already usable, invented international capabilities for OVO, and "
    "introduced LinkAja, which is not a listed participant. Confident, "
    "well-formatted, and materially wrong.",

    # Q2 - Indonesia customs USD 500 + IMEI
    "RAG gave the figures that matter: USD 500 FOB duty-free per passenger per "
    "arrival, a maximum of two devices for IMEI registration, and excess taxed "
    "at 10% import duty on customs value plus 11% VAT, with the exemption lost "
    "if you register after leaving the customs area. Its one gap: it omitted "
    "the PPh 22 income tax (10% with an NPWP, 20% without) that appeared in a "
    "retrieved passage. The base model was wrong on every number - 'one device "
    "per arrival' (actual: two), 'import tax typically 5-10%' and 'customs "
    "duties 0-5%' (actual: 10% + 11%), and a '30 days to register the IMEI' "
    "window that does not exist in the source.",

    # Q3 - Japan single-entry short-term-stay visa checklist
    "RAG reproduced the distinctive parts of the April 2025 checklist - the "
    "guarantor documents (letter of guarantee, certified corporation register "
    "or company overview, proof of guarantor funds via income certificate, tax "
    "return Form 2, balance certificate or Juminhyo), the flight itinerary with "
    "flight numbers and dates - and, importantly, that the checklist excludes "
    "China, Russia, CIS countries, Ukraine, Georgia and the Philippines. It did "
    "this from a single retrieved chunk (score 0.60). The base model produced a "
    "plausible generic tourist-visa list (photos, bank statements, hotel "
    "booking, visa fee) and correctly guessed that requirements vary by "
    "nationality, but for vague reasons and without naming the guarantor "
    "documents or the excluded countries. Caveat: the retrieved chunk mixes the "
    "checklist's purpose-of-visit columns, so RAG's document list leans "
    "guarantor-heavy for a pure tourist.",

    # Q4 - North Korea prohibited items
    "The question turned on one specific point - may I carry a printed guidebook "
    "about the DPRK - and the two answers disagree. RAG, quoting the guide's own "
    "'DPRK customs prohibits written materials, printed and electronic, about "
    "the DPRK from entry', said no, alongside religious materials, Korean-"
    "language media and illicit drugs. The base model gave a broader, plausible "
    "list (adding weapons and recording devices) but concluded that 'printed "
    "guidebooks about North Korea are generally permitted' as long as they are "
    "not politically critical - the opposite of what the source states. A "
    "confident base answer that is wrong on exactly the point asked.",

    # Q5 - Kyoto backpacker budget
    "The weakest differentiator. RAG returned the guide's exact ranges "
    "(accommodation USD 25-50, food USD 15-30, transport USD 5-8, attractions "
    "USD 10-15 per day) with source attribution. The base model's estimate "
    "(lodging USD 20-40, transport USD 3-7, ~JPY 600 day pass, food USD 24-40) "
    "is close, arguably more practical - it breaks out yen and names the day "
    "pass - and overshoots only on food. Backpacker cost ranges are well "
    "represented in general training, so RAG's edge here is narrow: it matches "
    "'the Kyoto guide' precisely and avoids the food overshoot. Retrieval also "
    "pulled Tokyo and Osaka budget chunks, which the model correctly ignored.",
]

OVERALL_ANALYSIS = (
    "Hallucination versus omission. The base model consistently produced "
    "fuller, confident, well-formatted answers that carried fabricated "
    "specifics: an invented app/country table (Q1), a wrong IMEI device count "
    "and a nonexistent 30-day registration window (Q2), and a guidebook rule "
    "that is the opposite of the source (Q4). RAG erred the other way - terser, "
    "occasionally dropping a detail that was in the retrieved passages (the "
    "PPh 22 tax in Q2, the rollout countries in Q1) - but what it stated was "
    "traceable to a document.\n\n"
    "Where RAG helped most: niche, codified, jurisdiction-specific facts - "
    "Indonesian cross-border-payment policy, Indonesian customs thresholds, a "
    "specific government visa checklist. These are exactly what a general model "
    "knows thinly or in blended, dated form.\n\n"
    "Where RAG helped least: broad estimation questions the base model already "
    "covers well (Kyoto backpacker budget), where its answer was comparably "
    "useful and RAG's advantage shrank to exact-match-with-citation.\n\n"
    "Retrieval quality bounded the result. Q3 succeeded on a single chunk "
    "(score 0.60); Q1 and Q5 pulled in off-topic chunks (a QR-code passage from "
    "the North Korea guide; Tokyo and Osaka budgets) that the model had to "
    "filter out itself. A re-ranking step would tighten this.\n\n"
    "The model was held fixed (amazon.nova-lite-v1:0) with identical inference "
    "settings on both sides, so every difference above came from retrieved "
    "context, not a stronger model. For KelanaAI's domain - itinerary and "
    "logistics questions where correctness on visas, customs and payments "
    "matters - grounding the existing model in the knowledge base measurably "
    "improved factual accuracy and attached a citation to every claim, at the "
    "cost of occasionally terser answers. The base model should not be trusted "
    "for jurisdiction-specific numbers. Suggested next steps: add a re-ranker "
    "to drop off-topic chunks, and instruct the RAG prompt to carry every "
    "relevant figure from the retrieved passages through to the answer."
)


# --------------------------------------------------------------------------- #
# environment / clients                                                        #
# --------------------------------------------------------------------------- #

def _require(name: str) -> str:
    value = os.getenv(name)
    if not value:
        sys.exit(
            f"{name} is not set. Add it to backend/.env "
            f"(see this script's module docstring for the full list)."
        )
    return value.strip()


def _region() -> str:
    return _require("AWS_REGION")


def _agent_client():
    """Control plane - lists data sources. Needs SigV4 creds."""
    return boto3.client("bedrock-agent", region_name=_region())


def _agent_runtime_client():
    """retrieve / retrieve_and_generate. Needs SigV4 creds (not the bearer token)."""
    return boto3.client("bedrock-agent-runtime", region_name=_region())


def _runtime_client():
    """converse for the base model. Uses the Bedrock bearer token."""
    return boto3.client("bedrock-runtime", region_name=_region())


# --------------------------------------------------------------------------- #
# inspection                                                                   #
# --------------------------------------------------------------------------- #

def inspect_kb() -> None:
    kb_id = _require("KNOWLEDGE_BASE_ID")
    print(f"Knowledge base : {kb_id}")
    print(f"Region         : {_region()}\n")

    try:
        agent = _agent_client()
        sources = agent.list_data_sources(knowledgeBaseId=kb_id).get(
            "dataSourceSummaries", []
        )
    except NoCredentialsError:
        sys.exit(
            "No SigV4 credentials. bedrock-agent needs AWS_ACCESS_KEY_ID / "
            "AWS_SECRET_ACCESS_KEY in backend/.env - the Bedrock bearer token "
            "does not authorize Knowledge Base APIs."
        )
    except (ClientError, BotoCoreError) as exc:
        sys.exit(f"list_data_sources failed: {exc}")

    print(f"Data sources ({len(sources)}):")
    for summary in sources:
        ds_id = summary["dataSourceId"]
        detail = agent.get_data_source(
            knowledgeBaseId=kb_id, dataSourceId=ds_id
        )["dataSource"]
        cfg = detail.get("dataSourceConfiguration", {})
        s3 = cfg.get("s3Configuration", {})
        print(f"  - {summary['name']} ({ds_id})  status={summary['status']}")
        if s3:
            print(f"      bucket: {s3.get('bucketArn')}")
            if s3.get("inclusionPrefixes"):
                print(f"      prefixes: {s3['inclusionPrefixes']}")

    print("\nProbe retrieval for 'visa requirements' (top 5 chunks):")
    runtime = _agent_runtime_client()
    results = runtime.retrieve(
        knowledgeBaseId=kb_id,
        retrievalQuery={"text": "visa requirements"},
        retrievalConfiguration={
            "managedSearchConfiguration": {"numberOfResults": NUM_RESULTS}
        },
    ).get("retrievalResults", [])

    for i, r in enumerate(results, 1):
        uri = r.get("location", {}).get("s3Location", {}).get("uri", "?")
        score = r.get("score")
        snippet = " ".join(r.get("content", {}).get("text", "").split())[:160]
        print(f"  {i}. score={score:.3f}  {uri}" if isinstance(score, float)
              else f"  {i}. {uri}")
        print(f"     {snippet}...")


# --------------------------------------------------------------------------- #
# asking                                                                       #
# --------------------------------------------------------------------------- #

def _converse(client, model_id: str, text: str) -> str:
    resp = client.converse(
        modelId=model_id,
        messages=[{"role": "user", "content": [{"text": text}]}],
        inferenceConfig={"maxTokens": MAX_TOKENS, "temperature": TEMPERATURE},
    )
    return resp["output"]["message"]["content"][0]["text"].strip()


def retrieve_chunks(agent_runtime, kb_id: str, question: str) -> list[dict]:
    results = agent_runtime.retrieve(
        knowledgeBaseId=kb_id,
        retrievalQuery={"text": question},
        retrievalConfiguration={
            "managedSearchConfiguration": {"numberOfResults": NUM_RESULTS}
        },
    ).get("retrievalResults", [])

    chunks: list[dict] = []
    seen: set[tuple] = set()
    for r in results:
        uri = r.get("location", {}).get("s3Location", {}).get("uri", "")
        text = " ".join(r.get("content", {}).get("text", "").split())
        key = (uri, text[:80])
        if key in seen:
            continue
        seen.add(key)
        chunks.append({
            "uri": uri,
            "document": uri.rsplit("/", 1)[-1] or uri,
            "score": r.get("score"),
            "text": text,
        })
    return chunks


def ask_rag(agent_runtime, runtime, kb_id: str, model_id: str,
            question: str) -> dict:
    """retrieve() from the managed KB, then converse() with the passages.

    retrieve_and_generate is not offered for managed knowledge bases, so the
    generation step is done here with the same converse() call the base path
    uses - only the prepended context differs.
    """
    chunks = retrieve_chunks(agent_runtime, kb_id, question)

    context = "\n\n".join(
        f"[{i}] (source: {c['document']})\n{c['text']}"
        for i, c in enumerate(chunks, 1)
    ) or "(no passages retrieved)"

    prompt = f"{RAG_INSTRUCTION}\n\nReference passages:\n{context}\n\nQuestion: {question}"
    answer = _converse(runtime, model_id, prompt)

    sources = [
        {"uri": c["uri"], "document": c["document"], "score": c["score"],
         "snippet": c["text"][:400]}
        for c in chunks
    ]
    return {"answer": answer, "sources": sources}


def ask_base(runtime, model_id: str, question: str) -> str:
    return _converse(runtime, model_id, question)


def run_all() -> dict:
    kb_id = _require("KNOWLEDGE_BASE_ID")
    model_id = _require("MODEL_ID")

    agent_runtime = _agent_runtime_client()
    runtime = _runtime_client()

    items = []
    for i, question in enumerate(QUESTIONS, 1):
        print(f"[{i}/{len(QUESTIONS)}] {question[:70]}...")
        print("      RAG  ... ", end="", flush=True)
        try:
            rag = ask_rag(agent_runtime, runtime, kb_id, model_id, question)
            print(f"ok ({len(rag['sources'])} source(s))")
        except NoCredentialsError:
            sys.exit(
                "No SigV4 credentials for bedrock-agent-runtime. Add "
                "AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY to backend/.env."
            )
        except (ClientError, BotoCoreError) as exc:
            sys.exit(f"RAG retrieve/converse failed on Q{i}: {exc}")

        print("      Base ... ", end="", flush=True)
        try:
            base = ask_base(runtime, model_id, question)
            print("ok")
        except (ClientError, BotoCoreError) as exc:
            sys.exit(f"converse failed on Q{i}: {exc}")

        items.append({
            "question": question,
            "rag_answer": rag["answer"],
            "rag_sources": rag["sources"],
            "base_answer": base,
        })

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "region": _region(),
        "knowledge_base_id": kb_id,
        "generation_model": model_id,
        "method": (
            "RAG path: bedrock-agent-runtime.retrieve (managed KB, top "
            f"{NUM_RESULTS}) then bedrock-runtime.converse with the passages "
            "prepended. Base path: the same converse call with the bare "
            f"question. Same model ({model_id}), same inference config "
            f"(maxTokens={MAX_TOKENS}, temperature={TEMPERATURE}); retrieval is "
            "the only difference."
        ),
        "items": items,
    }

    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"\nRaw results -> {CACHE_PATH}")
    return payload


# --------------------------------------------------------------------------- #
# rendering                                                                    #
# --------------------------------------------------------------------------- #

def render_markdown(data: dict) -> str:
    lines: list[str] = []
    a = lines.append

    a("# RAG vs Base-Model: Answer Quality Comparison")
    a("")
    a("This report compares answers from a Retrieval-Augmented Generation (RAG) "
      "pipeline against answers from the same model with no retrieval, to show "
      "what a curated knowledge base adds.")
    a("")
    a("## Method")
    a("")
    a(f"- **Generated:** {data.get('generated_at', '?')}")
    a(f"- **Region:** {data.get('region', '?')}")
    a(f"- **Knowledge base:** `{data.get('knowledge_base_id', '?')}` "
      "(managed Bedrock KB; S3 data source `kelana-travel-docs`)")
    a(f"- **Model (both sides):** `{data.get('generation_model', '?')}`")
    a(f"- **RAG path:** `bedrock-agent-runtime.retrieve` (top {NUM_RESULTS} "
      "passages) then `bedrock-runtime.converse` with those passages prepended "
      "to the question. `retrieve_and_generate` is not offered for managed "
      "knowledge bases, so generation is done explicitly on this side.")
    a("- **Base path:** the same `converse` call with the bare question, no "
      "context.")
    a(f"- Same model, same inference config (`maxTokens={MAX_TOKENS}`, "
      f"`temperature={TEMPERATURE}`) on both sides - retrieval is the only "
      "variable.")
    a("")
    a("The knowledge base holds 10 documents: an official Japanese "
      "single-entry short-term-stay visa checklist (April 2025), Tokyo / Osaka "
      "/ Kyoto travel guides, a Japan packing list, a North Korea guide (Koryo "
      "Tours, 2019), a Kazakhstan guide, an Indonesian-traveller payment / "
      "cross-border QRIS guide, and an Indonesia customs & IMEI registration "
      "guide. Each of the five questions targets a fact that lives in one of "
      "these documents.")
    a("")
    a("---")
    a("")

    for i, item in enumerate(data.get("items", [])):
        a(f"## Q{i + 1}. {item['question']}")
        a("")
        a("### RAG answer")
        a("")
        a(item["rag_answer"] or "_(empty)_")
        a("")
        a("### Passages retrieved from the knowledge base")
        a("")
        if item["rag_sources"]:
            for s in item["rag_sources"]:
                name = s.get("document") or s["uri"].rsplit("/", 1)[-1] or s["uri"]
                score = s.get("score")
                label = f"**{name}**"
                if isinstance(score, (int, float)):
                    label += f" _(score {score:.3f})_"
                a(f"- {label}")
                a(f"  > {s['snippet']}")
        else:
            a("_Nothing was retrieved - the RAG answer had no grounding._")
        a("")
        a("### Base-model answer (no retrieval)")
        a("")
        a(item["base_answer"] or "_(empty)_")
        a("")
        a("### Analysis")
        a("")
        a(ANALYSIS[i].strip() if i < len(ANALYSIS) and ANALYSIS[i].strip()
          else "_To be written after reviewing the outputs._")
        a("")
        a("---")
        a("")

    a("## Overall analysis")
    a("")
    a(OVERALL_ANALYSIS.strip() or
      "_To be written after reviewing the outputs._")
    a("")

    return "\n".join(lines) + "\n"


_PUNCT = {
    "‘": "'", "’": "'", "“": '"', "”": '"',
    "–": "-", "—": "-", "…": "...", "•": "-",
    " ": " ", "−": "-", "×": "x",
}


def _latin1(text: str) -> str:
    """fpdf2's core fonts are latin-1 only; normalize then drop the rest."""
    for bad, good in _PUNCT.items():
        text = text.replace(bad, good)
    return text.encode("latin-1", "replace").decode("latin-1")


def render_pdf(data: dict, path: Path) -> None:
    from fpdf import FPDF

    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_margins(left=18, top=16, right=18)
    pdf.add_page()

    def _write(text: str, line_h: float) -> None:
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(pdf.epw, line_h, _latin1(text), wrapmode="CHAR")

    def heading(text: str, size: int, gap_before: int = 4) -> None:
        pdf.ln(gap_before)
        pdf.set_font("Helvetica", "B", size)
        _write(text, size * 0.5)
        pdf.ln(1)

    def body(text: str, size: int = 10) -> None:
        pdf.set_font("Helvetica", "", size)
        _write(text, 5)

    def quote(text: str) -> None:
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(90, 90, 90)
        _write(text, 4.5)
        pdf.set_text_color(0, 0, 0)

    heading("RAG vs Base-Model: Answer Quality Comparison", 17, gap_before=0)
    body("This report compares answers from a Retrieval-Augmented Generation "
         "(RAG) pipeline against answers from the same model with no retrieval, "
         "to show what a curated knowledge base adds.")

    heading("Method", 13)
    body(
        f"Generated: {data.get('generated_at', '?')}\n"
        f"Region: {data.get('region', '?')}\n"
        f"Knowledge base: {data.get('knowledge_base_id', '?')} "
        f"(managed Bedrock KB; S3 data source kelana-travel-docs, 10 documents)\n"
        f"Model (both sides): {data.get('generation_model', '?')}\n"
        f"RAG path: bedrock-agent-runtime.retrieve (top {NUM_RESULTS}) then "
        f"bedrock-runtime.converse with the passages prepended. "
        f"retrieve_and_generate is not offered for managed KBs.\n"
        f"Base path: the same converse call with the bare question.\n"
        f"Same model, same inference config (maxTokens={MAX_TOKENS}, "
        f"temperature={TEMPERATURE}); retrieval is the only variable."
    )

    for i, item in enumerate(data.get("items", [])):
        pdf.add_page()
        heading(f"Q{i + 1}. {item['question']}", 12, gap_before=0)

        heading("RAG answer", 11)
        body(item["rag_answer"] or "(empty)")

        heading("Passages retrieved from the knowledge base", 11)
        if item["rag_sources"]:
            for s in item["rag_sources"]:
                name = s.get("document") or s["uri"].rsplit("/", 1)[-1] or s["uri"]
                score = s.get("score")
                if isinstance(score, (int, float)):
                    name += f"  (score {score:.3f})"
                pdf.set_font("Helvetica", "B", 9)
                pdf.set_x(pdf.l_margin)
                pdf.multi_cell(pdf.epw, 4.5, _latin1(name), wrapmode="CHAR")
                quote(s["snippet"])
        else:
            body("Nothing was retrieved - the RAG answer had no grounding.")

        heading("Base-model answer (no retrieval)", 11)
        body(item["base_answer"] or "(empty)")

        heading("Analysis", 11)
        body(ANALYSIS[i].strip() if i < len(ANALYSIS) and ANALYSIS[i].strip()
             else "To be written after reviewing the outputs.")

    pdf.add_page()
    heading("Overall analysis", 13, gap_before=0)
    body(OVERALL_ANALYSIS.strip() or "To be written after reviewing the outputs.")

    path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(path))


def render_reports(data: dict) -> None:
    REPORT_MD.parent.mkdir(parents=True, exist_ok=True)
    REPORT_MD.write_text(render_markdown(data))
    print(f"Report      -> {REPORT_MD}")
    try:
        render_pdf(data, REPORT_PDF)
        print(f"Report      -> {REPORT_PDF}")
    except ImportError:
        print("fpdf2 not installed - skipped the PDF. "
              "Run: pip install fpdf2  (and add it to backend/requirements.txt)")


# --------------------------------------------------------------------------- #
# entrypoint                                                                   #
# --------------------------------------------------------------------------- #

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inspect", action="store_true",
                        help="list the KB data sources and probe retrieval; "
                             "make no generation calls")
    parser.add_argument("--from-cache", action="store_true",
                        help="re-render the report from the cached results only")
    parser.add_argument("--yes", action="store_true",
                        help="skip the confirmation prompt")
    args = parser.parse_args()

    if args.inspect:
        inspect_kb()
        return

    if args.from_cache:
        if not CACHE_PATH.exists():
            sys.exit(f"No cache at {CACHE_PATH}. Run a real comparison first.")
        render_reports(json.loads(CACHE_PATH.read_text()))
        return

    print(f"About to ask {len(QUESTIONS)} questions x 2 "
          f"(RAG + base) = {len(QUESTIONS) * 2} Bedrock calls.")
    if not args.yes and input("Continue? [y/N] ").strip().lower() != "y":
        print("Aborted. No calls made.")
        return

    render_reports(run_all())


if __name__ == "__main__":
    main()
