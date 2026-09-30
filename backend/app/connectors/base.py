"""Connector protocol + deterministic in-process mocks."""
from __future__ import annotations

from typing import Protocol


class Connector(Protocol):
    name: str

    def fetch(self) -> list[dict]:
        ...
