"""Performance statistics for a list of closed trades."""
from __future__ import annotations

from typing import Any


def max_drawdown(equity: list[float]) -> tuple[float, float]:
    """Returns (max drawdown in dollars, as a fraction of the peak)."""
    peak, mdd, mdd_pct = float("-inf"), 0.0, 0.0
    for e in equity:
        peak = max(peak, e)
        dd = peak - e
        if dd > mdd:
            mdd, mdd_pct = dd, dd / peak if peak > 0 else 0.0
    return mdd, mdd_pct


def max_consecutive_losses(pnls: list[float]) -> int:
    best = cur = 0
    for p in pnls:
        cur = cur + 1 if p <= 0 else 0
        best = max(best, cur)
    return best


def summarize(trades: list[dict[str, Any]], starting_equity: float) -> dict[str, Any]:
    n = len(trades)
    if n == 0:
        return {"trades": 0, "note": "no trades"}
    pnls = [t["net_pnl"] for t in trades]
    rs = [t["r_multiple"] for t in trades if t.get("r_multiple") is not None]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p <= 0]
    equity = [starting_equity]
    for p in pnls:
        equity.append(equity[-1] + p)
    mdd, mdd_pct = max_drawdown(equity)
    gross_loss = -sum(losses)
    by_reason: dict[str, int] = {}
    for t in trades:
        by_reason[t["exit_reason"]] = by_reason.get(t["exit_reason"], 0) + 1
    return {
        "trades": n,
        "win_rate": len(wins) / n,
        "expectancy_usd": sum(pnls) / n,
        "expectancy_r": sum(rs) / len(rs) if rs else None,
        "avg_win_usd": sum(wins) / len(wins) if wins else 0.0,
        "avg_loss_usd": sum(losses) / len(losses) if losses else 0.0,
        "profit_factor": (sum(wins) / gross_loss) if gross_loss > 0 else float("inf"),
        "net_pnl": sum(pnls),
        "return_pct": sum(pnls) / starting_equity,
        "total_fees": sum(t["fees"] for t in trades),
        "total_funding": sum(t["funding"] for t in trades),
        "max_drawdown_usd": mdd,
        "max_drawdown_pct": mdd_pct,
        "max_consecutive_losses": max_consecutive_losses(pnls),
        "exits": by_reason,
        "final_equity": equity[-1],
    }


def format_summary(name: str, s: dict[str, Any]) -> str:
    if not s.get("trades"):
        return f"{name}: no trades"
    pf = s["profit_factor"]
    lines = [
        f"{name}",
        f"  trades {s['trades']:>4}   win rate {s['win_rate']:.1%}   exits {s['exits']}",
        f"  expectancy ${s['expectancy_usd']:+.4f}/trade ({(s['expectancy_r'] or 0):+.3f} R)   "
        f"profit factor {'inf' if pf == float('inf') else f'{pf:.2f}'}",
        f"  net P&L ${s['net_pnl']:+.2f} ({s['return_pct']:+.2%})   fees ${s['total_fees']:.2f}   "
        f"funding paid ${s['total_funding']:+.2f}",
        f"  max drawdown ${s['max_drawdown_usd']:.2f} ({s['max_drawdown_pct']:.2%})   "
        f"max consecutive losses {s['max_consecutive_losses']}",
    ]
    return "\n".join(lines)
