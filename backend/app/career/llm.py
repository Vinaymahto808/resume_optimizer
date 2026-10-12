"""Provider selection for the copilot features.

Every feature works without a key (deterministic fallbacks); when a key is
configured the LLM is used for generation and re-scoring. Preference order:
Anthropic, then Groq, then OpenAI.
"""
import logging
import os
from typing import Optional

from app.config import settings
from app.llm_executor import LLMExecutor, LLMProvider

logger = logging.getLogger(__name__)

_DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5"


def _executor() -> Optional[LLMExecutor]:
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    if anthropic_key:
        model = os.getenv("ANTHROPIC_MODEL", _DEFAULT_ANTHROPIC_MODEL)
        return LLMExecutor(provider=LLMProvider.ANTHROPIC, api_key=anthropic_key, model=model, max_retries=2)
    if settings.GROQ_API_KEY:
        return LLMExecutor(provider=LLMProvider.GROQ, api_key=settings.GROQ_API_KEY, max_retries=2)
    if settings.OPENAI_API_KEY:
        return LLMExecutor(provider=LLMProvider.OPENAI, api_key=settings.OPENAI_API_KEY,
                           model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), max_retries=2)
    return None


def llm_available() -> bool:
    return _executor() is not None


def llm_json(prompt: str, max_tokens: int = 2000, temperature: float = 0.4) -> Optional[dict]:
    executor = _executor()
    if executor is None:
        return None
    response = executor.execute_json(prompt, temperature=temperature, max_tokens=max_tokens)
    if response.success and isinstance(response.parsed_json, dict):
        return response.parsed_json
    logger.warning("LLM JSON call failed: %s", response.error)
    return None


def llm_text(prompt: str, max_tokens: int = 1500, temperature: float = 0.6) -> Optional[str]:
    executor = _executor()
    if executor is None:
        return None
    response = executor.execute(prompt, temperature=temperature, max_tokens=max_tokens)
    if response.success:
        return response.content
    logger.warning("LLM text call failed: %s", response.error)
    return None
