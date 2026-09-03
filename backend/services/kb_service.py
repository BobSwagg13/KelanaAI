"""Knowledge-base-grounded chat for the /assistant feature.

Backs the conversation endpoints in ``main.py``. Each assistant turn is:

  1. ``bedrock-agent-runtime.retrieve`` - top passages from the managed KB for
     the latest user message. Needs SigV4 credentials (``AWS_ACCESS_KEY_ID`` /
     ``AWS_SECRET_ACCESS_KEY``); the ``AWS_BEARER_TOKEN_BEDROCK`` the app uses
     elsewhere does not authorize the Knowledge Base APIs.
  2. ``bedrock-runtime.converse`` - the prior turns go in as real ``messages``,
     the retrieved passages + instruction go in the ``system`` prompt. Uses the
     bearer token, like ``services/bedrock_service.py``.

``retrieve_and_generate`` is not offered for managed knowledge bases, so the
generation step is explicit. Failures raise ``KnowledgeBaseError``; the caller
surfaces it rather than persisting an ungrounded answer.
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
# Lower than the itinerary path: a grounded answer should stay close to the
# retrieved text, not improvise.
TEMPERATURE = 0.3
# How many trailing messages of a conversation to replay as context. Keeps the
# prompt bounded on long threads; ~10 turns is plenty for follow-ups.
HISTORY_LIMIT = 20

_INSTRUCTION = (
    "You are KelanaAI's travel assistant, answering in a multi-turn chat. Use "
    "the reference passages below as your source of truth; quote concrete "
    "details (numbers, names, rules, dates) from them. If they do not cover the "
    "question, say so plainly instead of guessing. Take the earlier messages "
    "into account when the user is following up."
)

_agent_runtime = boto3.client(
    "bedrock-agent-runtime", region_name=os.getenv("AWS_REGION")
)
_runtime = boto3.client("bedrock-runtime", region_name=os.getenv("AWS_REGION"))


class KnowledgeBaseError(Exception):
    """Raised when the assistant could not produce a grounded answer."""


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


def _converse(messages: list[dict], system: str | None = None,
              max_tokens: int = MAX_OUTPUT_TOKENS) -> str:
    kwargs = {
        "modelId": os.getenv("MODEL_ID"),
        "messages": messages,
        "inferenceConfig": {"maxTokens": max_tokens, "temperature": TEMPERATURE},
    }
    if system:
        kwargs["system"] = [{"text": system}]

    response = _runtime.converse(**kwargs)

    # A truncated prose answer is still usable here (unlike the itinerary JSON),
    # so max_tokens is tolerated; anything else stopping early is not.
    stop_reason = response.get("stopReason")
    if stop_reason not in ("end_turn", "max_tokens"):
        logger.error("Assistant stopped early: stopReason=%s", stop_reason)
        raise KnowledgeBaseError("The assistant stopped unexpectedly.")

    return response["output"]["message"]["content"][0]["text"].strip()


def generate_reply(history: list[dict], question: str) -> dict:
    """Answer ``question`` in the context of ``history``.

    ``history`` is prior turns oldest-first, each ``{"role", "content"}`` with
    role ``"user"`` or ``"assistant"``. Returns ``{"answer", "sources"}`` where
    ``sources`` is the list of retrieved passages the answer was grounded in.
    Raises ``KnowledgeBaseError`` on failure or when nothing was retrieved.
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

    passages = "\n\n".join(
        f"[{i}] (source: {c['document']})\n{c['text']}"
        for i, c in enumerate(chunks, 1)
    )
    system = f"{_INSTRUCTION}\n\nReference passages:\n{passages}"

    messages = [
        {"role": m["role"], "content": [{"text": m["content"]}]}
        for m in history[-HISTORY_LIMIT:]
    ]
    messages.append({"role": "user", "content": [{"text": question}]})

    try:
        answer = _converse(messages, system=system)
    except (BotoCoreError, ClientError) as e:
        logger.exception("Knowledge Base converse failed")
        raise KnowledgeBaseError(
            "The assistant could not generate an answer. Please try again."
        ) from e

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


def generate_title(first_question: str, first_answer: str) -> str:
    """A short title for a conversation, from its opening exchange.

    One cheap ``converse`` call. Never raises: on any failure it falls back to
    the trimmed first question, so a title is always available.
    """
    fallback = " ".join(first_question.split())[:80] or "New chat"
    try:
        raw = _converse(
            [{
                "role": "user",
                "content": [{
                    "text": (
                        "Write a title of at most 6 words for this travel-chat "
                        "conversation. Reply with the title only - no quotes, no "
                        "punctuation at the end.\n\n"
                        f"User: {first_question}\nAssistant: {first_answer}"
                    )
                }],
            }],
            max_tokens=24,
        )
    except (BotoCoreError, ClientError, KnowledgeBaseError):
        logger.warning("Title generation failed; using fallback", exc_info=True)
        return fallback

    title = raw.strip().strip('"').strip("'").splitlines()[0].strip()
    return title[:256] or fallback
