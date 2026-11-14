"""Shared maths for EXP-009..012: Ornstein-Uhlenbeck fit + Monte Carlo exit levels, Hurst exponent,
and the "better than luck?" sign-flip test. Pure functions, no I/O.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np


# -- Ornstein-Uhlenbeck ---------------------------------------------------------
@dataclass(frozen=True)
class OU:
    mu: float          # long-run mean
    theta: float       # reversion speed per bar
    sigma_eq: float    # stationary standard deviation
    resid: float       # one-bar shock standard deviation
    b: float           # AR(1) coefficient

    @property
    def half_life(self) -> float:
        return math.log(2) / self.theta if self.theta > 0 else math.inf


def fit_ou(x: np.ndarray) -> OU | None:
    """Fit x_t = a + b x_{t-1} + e by least squares. None unless 0 < b < 1 (mean-reverting)."""
    x = np.asarray(x, dtype=float)
    x = x[np.isfinite(x)]
    if len(x) < 50:
        return None
    prev, nxt = x[:-1], x[1:]
    vx = prev.var()
    if vx <= 0:
        return None
    b = float(((prev - prev.mean()) * (nxt - nxt.mean())).mean() / vx)
    if not 0 < b < 1:
        return None
    a = float(nxt.mean() - b * prev.mean())
    resid = float(np.std(nxt - (a + b * prev)))
    if resid <= 0:
        return None
    return OU(mu=a / (1 - b), theta=-math.log(b), sigma_eq=resid / math.sqrt(1 - b * b), resid=resid, b=b)


@dataclass(frozen=True)
class Levels:
    tp_z: float        # take profit when z has reverted to this (same sign as entry side's start)
    stop_z: float      # stop when |z| reaches this
    horizon: int       # time stop, bars
    ev: float          # expected net log-return per unit notional
    p_tp: float        # share of simulated paths that hit the take-profit


def mc_levels(ou: OU, z0: float, cost_tp: float, cost_stop: float, cost_time: float,
              tp_grid=(0.0, 0.5, 1.0), stop_grid=(3.5, 4.0, 5.0), horizon_hl: float = 3.0,
              n_paths: int = 2000, seed: int = 0) -> Levels | None:
    """Simulate OU paths from z0 (in units of sigma_eq) and pick the take-profit / stop pair with the
    highest expected net return for a trade that bets on reversion (short when z0 > 0).
    Costs are round-trip fractions of notional for each exit type. None if nothing has EV > 0."""
    if not math.isfinite(ou.half_life) or z0 == 0:
        return None
    horizon = max(2, int(round(horizon_hl * ou.half_life)))
    rng = np.random.default_rng(seed)
    side = -1.0 if z0 > 0 else 1.0                      # we profit when x moves toward mu
    s = ou.sigma_eq
    x = np.full(n_paths, z0 * s)
    shocks = rng.standard_normal((horizon, n_paths)) * ou.resid
    paths = np.empty((horizon, n_paths))
    for t in range(horizon):
        x = ou.b * x + shocks[t]
        paths[t] = x
    zs = paths / s
    best = None
    for tp in tp_grid:
        if abs(tp) >= abs(z0):
            continue
        for st in stop_grid:
            if st <= abs(z0):
                continue
            # distance to targets measured on the side of entry
            hit_tp = (zs * np.sign(z0)) <= tp
            hit_st = (zs * np.sign(z0)) >= st
            t_tp = np.where(hit_tp.any(0), hit_tp.argmax(0), horizon)
            t_st = np.where(hit_st.any(0), hit_st.argmax(0), horizon)
            tp_first = t_tp < t_st
            st_first = t_st < t_tp
            # e.g. z0 = +2.5, tp = 0.5: the short gains (2.5 - 0.5) * sigma_eq
            pnl = np.where(tp_first, (abs(z0) - tp) * s - cost_tp,
                  np.where(st_first, -(st - abs(z0)) * s - cost_stop,
                           side * (zs[-1] - z0) * s - cost_time))
            ev = float(pnl.mean())
            if best is None or ev > best.ev:
                best = Levels(tp, st, horizon, ev, float(tp_first.mean()))
    return best if best and best.ev > 0 else None


# -- Hurst exponent -------------------------------------------------------------
def hurst(log_prices: np.ndarray, lags=(1, 2, 4, 8, 16)) -> float | None:
    """Variance-scaling estimate: std of k-bar log returns grows like k^H.
    H ~ 0.5 random walk, > 0.5 trending (persistent), < 0.5 mean-reverting."""
    p = np.asarray(log_prices, dtype=float)
    p = p[np.isfinite(p)]
    if len(p) < max(lags) * 8:
        return None
    sds = []
    for k in lags:
        r = p[k:] - p[:-k]
        sd = r.std()
        if sd <= 0:
            return None
        sds.append(sd)
    slope = np.polyfit(np.log(lags), np.log(sds), 1)[0]
    return float(slope)


# -- luck check -----------------------------------------------------------------
def sign_flip_pvalue(gross: list[float], costs: list[float], n: int = 10_000, seed: int = 0) -> float | None:
    """Share of random-direction versions of the same trades that did at least as well.
    Null hypothesis: the strategy has no skill choosing long vs short, so each trade's gross P&L was
    equally likely to have the opposite sign. Costs are paid either way. Needs >= 10 trades."""
    g = np.asarray(gross, dtype=float)
    c = np.asarray(costs, dtype=float)
    if len(g) < 10:
        return None
    actual = float((g - c).sum())
    rng = np.random.default_rng(seed)
    signs = rng.choice([-1.0, 1.0], size=(n, len(g)))
    sims = (signs * np.abs(g)).sum(1) - c.sum()
    return float((sims >= actual - 1e-12).mean())
