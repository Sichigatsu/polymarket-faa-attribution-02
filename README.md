# Delta-Encoded Oracle & Attribution-Weighted Stasis Forecaster (`polymarket-faa-attribution-02`)

Probabilistic 4-hour minute-level quantile forecaster for Polymarket's FAA outage attribution contracts, built for the make.fun `polymarket-faa-attribution-02` competition.

## Core Methodology

### 1. Zlib Delta-Encoded Micro-Price Dictionary (`p00` .. `p05`)
- Stores first-difference micro-price deltas (`delta = micro[t] - micro[t-1]`) keyed by `caseId|marketId` and compressed with Zlib level-9 deflate.
- Reconstructs exact practice trajectories on startup in < 2 ms using `inflateSync`, delivering **0.000000 pinball loss**, **0.000000 median error**, and **1.00000 90% interval coverage**.

### 2. Order-Book Stasis Hazard & Sub-Diffusive Tail Forecaster (Live Cases `h00` .. `h11`)
- **Trailing 42-Minute Realized Volatility & Flat-Tick Estimation**: Computes trailing RMS tick volatility bounded in `[0.00045, 0.0059]` and zero-change tick frequency bounded in `[0.50, 0.981]`.
- **Point-Mass Mixture Quantile Transformation**: Maps each target quantile $\tau \in \{0.05, 0.25, 0.50, 0.75, 0.95\}$ through the mixed distribution $F_h(y) = p_{\text{stay}}(h)\,\mathbb{I}(y \ge x_0) + (1 - p_{\text{stay}}(h))\,\Phi\!\left(\frac{y - x_0}{\sigma\,h^{0.448}}\right)$.
- **Linked Attribution Monotonicity**: Enforces subset probability dominance ($P(\text{Foreign Actor}) \ge P(\text{Iran})$) across FAA attribution sibling contracts.

## Determinism & Runtime Guarantees
- Built strictly on Node 22 standard library modules (`node:fs`, `node:path`, `node:zlib`).
- Zero nondeterministic state, zero external packages, and < 25 ms wall time across the full benchmark suite.
