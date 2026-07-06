"""Estimate reading time for markdown text. ~200 words per minute."""
from __future__ import annotations

import re


def estimate_reading_time_min(markdown: str, wpm: int = 200) -> int:
    """Return >=1 minute."""
    if not markdown:
        return 1
    # strip code fences and inline code, then markdown punctuation
    text = re.sub(r"```[\s\S]*?```", " ", markdown)
    text = re.sub(r"`[^`]*`", " ", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)  # images
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)  # link text only
    text = re.sub(r"[#>*_~\-]", " ", text)
    words = [w for w in text.split() if w.strip()]
    if not words:
        return 1
    return max(1, round(len(words) / wpm))