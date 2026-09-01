"""Answer a free-text question against the managed Bedrock Knowledge Base.

Backs ``POST /api/v1/ask``. Two steps, mirroring ``knowledge/compare_rag.py``:

  1. ``bedrock-agent-runtime.retrieve`` - the top passages from the managed KB.
     Needs SigV4 credentials (``AWS_ACCESS_KEY_ID`` / ``AWS_SECRET_ACCESS_KEY``);
     the ``AWS_BEARER_TOKEN_BEDROCK`` the app uses elsewhere does not authorize
     the Knowledge Base APIs.
  2. ``bedrock-runtime.converse`` - an answer grounded in those passages. Uses
     the bearer token, exactly like ``services/bedrock_service.py``.

``retrieve_and_generate`` is not offered for managed knowledge bases, so the
generation step is explicit here. Failures raise ``KnowledgeBaseError`` and are
never turned into an ungrounded answer.
"""

from dotenv import load_dotenv
from botocore.exceptions import BotoCoreError, ClientError
import boto3
import logging
import os

load_dotenv()

logger = logging.getLogger(__name__)

KNOWLEDGE_BASE_ID = os.getenv("KNOWLEDGE_BASE_ID")
NUM_RESULTS = 5
MAX_OUTPUT_TOKENS = 1024
# Lower than the itinerary path: a grounded Q&A answer wants to stick close to
# the retrieved text, not improvise.
TEMPERATURE = 0.3

_INSTRUCTION = (
    "You are KelanaAI's travel assistant. Answer the traveller's question "
    "using only the reference passages below. Quote concrete details (numbers, "
    "names, rules, dates) from them. If the passages do not contain the answer, "
    "say so plainly instead of guessing."
)

_agent_runtime = boto3.client(
    "bedrock-agent-runtime", region_name=os.getenv("AWS_REGION")
)
_runtime = boto3.client("bedrock-runtime", region_name=os.getenv("AWS_REGION"))


class KnowledgeBaseError(Exception):
    """Raised when the assistant could not produce a grounded answer.

    The caller surfaces this to the user rather than returning a placeholder;
    an ungrounded answer served from this endpoint would defeat its purpose.
    """


def _retrieve(question: str) -> list[dict]:
    results = _agent_runtime.retrieve(
        knowledgeBaseId=KNOWLEDGE_BASE_ID,
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
        if not text or key in seen:
            continue
        seen.add(key)
        chunks.append({
            "document": uri.rsplit("/", 1)[-1] or uri or "knowledge base",
            "score": r.get("score"),
            "text": text,
        })
    return chunks


def ask_knowledge_base(question: str) -> dict:
    """Return ``{"answer": str, "sources": [...]}`` for ``question``.

    ``sources`` is the list of retrieved passages the answer was grounded in,
    each ``{document, snippet, score}``. Raises ``KnowledgeBaseError`` on any
    failure or when nothing relevant was retrieved.
    """
    if not KNOWLEDGE_BASE_ID:
        raise KnowledgeBaseError("The knowledge base is not configured.")

    question = question.strip()

    try:
        chunks = _retrieve(question)
    except (BotoCoreError, ClientError) as e:
        logger.exception("Knowledge Base retrieve failed")
        raise KnowledgeBaseError(
            "Could not reach the knowledge base. Please try again."
        ) from e

    if not chunks:
        raise KnowledgeBaseError(
            "The knowledge base has nothing on that. Try rephrasing, or ask "
            "about visas, customs, cross-border payments, or Japan travel."
        )

    context = "\n\n".join(
        f"[{i}] (source: {c['document']})\n{c['text']}"
        for i, c in enumerate(chunks, 1)
    )
    prompt = (
        f"{_INSTRUCTION}\n\nReference passages:\n{context}\n\nQuestion: {question}"
    )

    try:
        response = _runtime.converse(
            modelId=os.getenv("MODEL_ID"),
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={
                "maxTokens": MAX_OUTPUT_TOKENS,
                "temperature": TEMPERATURE,
            },
        )
    except (BotoCoreError, ClientError) as e:
        logger.exception("Knowledge Base converse failed")
        raise KnowledgeBaseError(
            "The assistant could not generate an answer. Please try again."
        ) from e

    # Unlike the itinerary path a truncated prose answer is still usable, so
    # max_tokens is tolerated; anything else stopping early is not.
    stop_reason = response.get("stopReason")
    if stop_reason not in ("end_turn", "max_tokens"):
        logger.error("Assistant stopped early: stopReason=%s", stop_reason)
        raise KnowledgeBaseError("The assistant stopped unexpectedly.")

    answer = response["output"]["message"]["content"][0]["text"].strip()
    if not answer:
        raise KnowledgeBaseError("The assistant returned an empty answer.")

    sources = [
        {
            "document": c["document"],
            "snippet": c["text"][:500],
            "score": (
                round(c["score"], 3)
                if isinstance(c["score"], (int, float))
                else None
            ),
        }
        for c in chunks
    ]
    return {"answer": answer, "sources": sources}
