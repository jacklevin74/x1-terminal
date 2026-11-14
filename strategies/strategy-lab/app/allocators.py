"""Allocation maths for EXP-016..019 (no scipy: n <= ~15 traders, plain numpy is enough).

hrp_weights      Hierarchical Risk Parity (Lopez de Prado 2016): correlation distance, single-linkage
                 clustering, quasi-diagonal order, recursive bisection by inverse cluster variance.
clusters         groups of traders whose returns correlate above a threshold (same linkage, cut).
ExpertWeights    multiplicative-weights "aggregating algorithm" with sleeping experts and a
                 cluster-size penalty.
"""
from __future__ import annotations

import math

import numpy as np


def corr_distance(corr: np.ndarray) -> np.ndarray:
    return np.sqrt(np.clip((1 - corr) / 2, 0, 1))


def single_linkage_order(dist: np.ndarray) -> tuple[list[int], list[tuple[int, int, float]]]:
    """Agglomerative single linkage. Returns the leaf order of the dendrogram and the merges
    (cluster a, cluster b, distance) using ids >= n for merged clusters."""
    n = len(dist)
    members = {i: [i] for i in range(n)}
    d = {(i, j): dist[i, j] for i in range(n) for j in range(i + 1, n)}
    merges = []
    nxt = n
    while len(members) > 1:
        (a, b), dab = min(d.items(), key=lambda kv: kv[1])
        members[nxt] = members.pop(a) + members.pop(b)       # left-then-right keeps the leaf order
        merges.append((a, b, float(dab)))
        d = {k: v for k, v in d.items() if a not in k and b not in k}
        for c in members:
            if c == nxt:
                continue
            dc = min(dist[i, j] for i in members[nxt] for j in members[c])
            d[(min(c, nxt), max(c, nxt))] = dc
        nxt += 1
    return members[nxt - 1] if n else [], merges


def _cluster_var(cov: np.ndarray, idx: list[int]) -> float:
    sub = cov[np.ix_(idx, idx)]
    ivp = 1 / np.diag(sub)
    ivp /= ivp.sum()
    return float(ivp @ sub @ ivp)


def hrp_weights(returns: np.ndarray) -> np.ndarray:
    """returns: T x N matrix (rows = days, columns = traders). Weights sum to 1."""
    r = np.asarray(returns, dtype=float)
    n = r.shape[1]
    if n == 1:
        return np.ones(1)
    cov = np.cov(r, rowvar=False)
    sd = np.sqrt(np.diag(cov))
    sd[sd == 0] = 1e-12
    corr = np.clip(cov / np.outer(sd, sd), -1, 1)
    order, _ = single_linkage_order(corr_distance(corr))
    w = np.ones(n)
    stack = [order]
    while stack:
        items = stack.pop()
        if len(items) < 2:
            continue
        left, right = items[: len(items) // 2], items[len(items) // 2:]
        vl, vr = _cluster_var(cov, left), _cluster_var(cov, right)
        alpha = 1 - vl / (vl + vr) if vl + vr > 0 else 0.5
        w[left] *= alpha
        w[right] *= 1 - alpha
        stack += [left, right]
    return w / w.sum()


def clusters(returns: np.ndarray, min_corr: float = 0.5) -> list[int]:
    """Cluster id per column. Complete linkage: a group only forms if EVERY pair in it correlates at
    least min_corr (single linkage would chain A~B~C into one group even when A and C differ)."""
    r = np.asarray(returns, dtype=float)
    n = r.shape[1]
    if n < 2:
        return [0] * n
    c = np.nan_to_num(np.corrcoef(r, rowvar=False), nan=0.0)
    groups = [[i] for i in range(n)]
    while True:
        best, pair = None, None
        for a in range(len(groups)):
            for b in range(a + 1, len(groups)):
                worst = min(c[i, j] for i in groups[a] for j in groups[b])
                if worst >= min_corr and (best is None or worst > best):
                    best, pair = worst, (a, b)
        if pair is None:
            break
        a, b = pair
        groups[a] += groups.pop(b)
    out = [0] * n
    for k, g in enumerate(groups):
        for i in g:
            out[i] = k
    return out


class ExpertWeights:
    """Exponentially weighted average forecaster ("aggregating algorithm") over trader experts.

    update(): w_i <- w_i * exp(eta * gain_i) for awake experts only (sleeping experts keep their
    weight), then mix a share `alpha` of uniform weight back in so a cold expert can recover
    (fixed-share). effective(): weights of awake experts, each divided by sqrt(size of its cluster)
    so five traders doing the same trade do not get five votes."""

    def __init__(self, names: list[str], eta: float = 10.0, alpha: float = 0.02, state: dict | None = None):
        self.eta, self.alpha = eta, alpha
        self.w = {n: 1.0 / len(names) for n in names} if names else {}
        if state:
            self.w.update({k: v for k, v in state.items() if k in self.w})
            self._norm()

    def _norm(self) -> None:
        s = sum(self.w.values())
        if s > 0:
            self.w = {k: v / s for k, v in self.w.items()}

    def update(self, gains: dict[str, float], awake: set[str]) -> None:
        if not awake:
            return
        before = sum(self.w[k] for k in awake)
        for k in awake:
            g = max(-0.2, min(0.2, gains.get(k, 0.0)))     # clip one bad hour
            self.w[k] *= math.exp(self.eta * g)
        after = sum(self.w[k] for k in awake)
        if after > 0:                                     # sleeping experts' total share is protected
            for k in awake:
                self.w[k] *= before / after
        u = 1.0 / len(self.w)
        self.w = {k: (1 - self.alpha) * v + self.alpha * u for k, v in self.w.items()}
        self._norm()

    def effective(self, awake: set[str], cluster_of: dict[str, int]) -> dict[str, float]:
        size: dict[int, int] = {}
        for k in awake:
            size[cluster_of.get(k, -1)] = size.get(cluster_of.get(k, -1), 0) + 1
        e = {k: self.w[k] / math.sqrt(size[cluster_of.get(k, -1)]) for k in awake}
        s = sum(e.values())
        return {k: v / s for k, v in e.items()} if s > 0 else {}
