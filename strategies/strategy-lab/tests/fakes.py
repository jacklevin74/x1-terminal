"""Test doubles: a paper exchange with injectable faults."""
from __future__ import annotations

from app.execution.adapter import OrderAck
from app.execution.paper_exchange import PaperExchange
from app.monitoring.alerts import Notifier


class Quotes:
    def __init__(self, **px):
        self.px = {k: (v, v) for k, v in px.items()}

    def set(self, m, bid, ask=None):
        self.px[m] = (bid, ask if ask is not None else bid)

    def __call__(self, m):
        return self.px.get(m)


class FaultyExchange(PaperExchange):
    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)
        self.silent_stop_failure = False     # ack says resting, but nothing rests
        self.stop_raises = False
        self.partial_fraction = None         # e.g. 0.5 -> half the entry fills
        self.entry_raises = False
        self.entry_ack_lies = False          # ack says filled, nothing happened
        self.close_fails = False

    def place_entry(self, market, is_buy, size, limit_px, cloid):
        if self.entry_raises:
            raise ConnectionError("network down")
        if self.entry_ack_lies:
            return OrderAck("filled", oid=999, filled_size=size, avg_px=limit_px)
        if self.partial_fraction:
            size = round(size * self.partial_fraction, 5)
        return super().place_entry(market, is_buy, size, limit_px, cloid)

    def place_stop(self, market, is_buy, size, trigger_px, cloid):
        if self.stop_raises:
            raise TimeoutError("stop timed out")
        if self.silent_stop_failure:
            return OrderAck("resting", oid=123)
        return super().place_stop(market, is_buy, size, trigger_px, cloid)

    def close_position(self, market, cloid):
        if self.close_fails:
            return OrderAck("error", error="venue down")
        return super().close_position(market, cloid)


class RecordingNotifier(Notifier):
    def __init__(self, db):
        super().__init__(db, "paper")
        self.sent: list[tuple[str, str, str]] = []

    def notify(self, level, kind, message):
        self.sent.append((level, kind, message))
        super().notify(level, kind, message)

    def kinds(self):
        return [k for _, k, _ in self.sent]
