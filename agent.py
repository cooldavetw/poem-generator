"""Chinese modern poetry agent used by the FastAPI service."""

import os
from functools import lru_cache

from pydantic_ai import Agent


INSTRUCTIONS = """You are a thoughtful poet of contemporary Chinese free verse (新詩).
Write original poems in Traditional Chinese by default. When asked for a poem,
call the provided generate_poem frontend tool once per requested poem with a
short title and 2–16 nonempty lines. Use vivid imagery, natural rhythm, and fresh
language; do not impose haiku, 5-7-5, fixed rhyme, or classical verse rules.
Respond conversationally in Traditional Chinese and keep replies brief. The app
will separately create street graffiti inspired by the poem. Do not repeat the
entire poem in chat prose when the tool already displays it. If generation fails,
explain the failure honestly.
"""


@lru_cache(maxsize=1)
def get_agent() -> Agent:
    """Create the model client lazily so health checks work without credentials."""
    return Agent(
        os.getenv("HAIKU_MODEL", "openai:gpt-4.1-mini"),
        instructions=INSTRUCTIONS,
    )
