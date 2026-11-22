# LunarNavi — Scientific Data Validation & Engine Verification

## 1. Candidate Site Coordinate Validation

Every candidate landing site in LunarNavi has been verified against official NASA Artemis publications, Lunar Reconnaissance Orbiter (LRO) team reports, and peer-reviewed lunar planetary science literature.

### Validation Methodology

1. **Official NASA Artemis III Candidate Regions**:
   - Primary Source: *NASA Artemis III Candidate Landing Regions* (NASA Announcement & Exploration Systems Development Directorate, Aug 2022 / SDR 2020).
   - Coordinates cross-referenced against IAU Mean Earth/Polar Axis (ME) frame.
   - Identified regions (e.g. *Connecting Ridge*, *de Gerlache Rim 2*, *Shackleton Connecting Ridge*, *Peak Near Shackleton*) strictly follow official NASA polygons.
2. **Scientific Research Locations**:
   - Peer-reviewed research sites (e.g., *Malapert Mountain*, *Amundsen Rim*, *Nobile Crater Rim 1*, *Haworth Crater Rim*) verified against LOLA topographic datasets (Smith et al. 2017, Mazarico et al. 2011).
   - Explicitly marked with designation `scientific-research-location` to prevent confusing research study points with official Artemis III downselected sites.
3. **Coordinate Frame Integrity**:
   - All latitudes reside within $[-90.0000^\circ, -80.0000^\circ]$.
   - All longitudes reside within $[-180.0000^\circ, +180.0000^\circ]$.
   - Coordinates verified via automated test suite (`tests/candidateLocations.test.ts` and `tests/locations.test.ts`).

---

## 2. Criteria Uncertainty & Data Quality Model

Each evaluation criterion for a candidate site is modeled as a structured `CriterionValue` object:

```typescript
export interface CriterionValue {
  value: number | null     // Nominal measured or derived value
  low: number | null       // Lower uncertainty bound (e.g. 5th percentile / seasonal minimum)
  high: number | null      // Upper uncertainty bound (e.g. 95th percentile / seasonal maximum)
  kind: ValueKind          // 'measured' | 'derived' | 'estimated'
  quality: Quality         // 'high' | 'medium' | 'low'
  source: string           // Authoritative scientific citation
  note?: string            // Operational context or caveat
}
```

### Classification of `ValueKind`

- `'measured'`: Directly extracted from calibrated instrument telemetry (e.g. LOLA laser altimeter pulse return elevation).
- `'derived'`: Computed via validated physical models and ray-tracing simulations (e.g. 50m slope gradient, 18.6-year illumination simulations).
- `'estimated'`: Inferred from indirect proxies or qualitative planetary geology rankings (e.g. regional volatile presence index, scientific sample return potential).

### Missing Data Handling (No Fabrication Policy)

LunarNavi strictly forbids guessing or imputing missing data:
- If an instrument measurement is absent or obstructed, `value: null`.
- Missing criteria are explicitly disclosed in the UI with a `"Data Unavailable"` warning badge and quality rating `'low'`.
- In mathematical evaluation, sites missing mandatory physical criteria fail the feasibility gate, safeguarding against certifying untested terrain.

---

## 3. Feasibility Engine Verification

The feasibility filter acts as a physical gatekeeper before multi-criteria ranking.

### Mathematical Formulation

Given a mission profile constraint $\mathcal{C}_k$ with direction $D_k \in \{\text{'max'}, \text{'min'}\}$, pass limit $L_{k,\text{pass}}$, marginal limit $L_{k,\text{marg}}$, and value $v_{ik}$:

- For upper-bound constraints ($D_k = \text{'max'}$, e.g. slope, roughness):
  $$\text{Status}_{ik} = \begin{cases}
  \text{Pass} & \text{if } v_{ik} \le L_{k,\text{pass}} \\
  \text{Marginal} & \text{if } L_{k,\text{pass}} < v_{ik} \le L_{k,\text{marg}} \\
  \text{Fail} & \text{if } v_{ik} > L_{k,\text{marg}}
  \end{cases}$$

- For lower-bound constraints ($D_k = \text{'min'}$, e.g. illumination, Earth communication):
  $$\text{Status}_{ik} = \begin{cases}
  \text{Pass} & \text{if } v_{ik} \ge L_{k,\text{pass}} \\
  \text{Marginal} & \text{if } L_{k,\text{marg}} \le v_{ik} < L_{k,\text{pass}} \\
  \text{Fail} & \text{if } v_{ik} < L_{k,\text{marg}}
  \end{cases}$$

### Overall Site Feasibility
A site is classified as:
- **`Pass`**: All constraints pass.
- **`Marginal`**: No constraint fails, but at least one is marginal.
- **`Fail`**: At least one essential constraint fails. Failed sites are excluded from final ranking.

---

## 4. TOPSIS Engine Verification

The Multi-Criteria Decision Analysis engine implements the **Technique for Order of Preference by Similarity to Ideal Solution (TOPSIS)**.

### Mathematical Properties Verified

1. **Euclidean Vector Normalization**:
   $$r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{k=1}^m x_{kj}^2}}$$
   *Property*: Guarantees scale invariance across disparate units (e.g. degrees vs meters vs percentages).

2. **Weighted Normalized Decision Matrix**:
   $$v_{ij} = w_j \cdot r_{ij}, \quad \text{where } \sum_{j=1}^n w_j = 1.0, \; w_j \ge 0$$

3. **Ideal ($A^+$) and Anti-Ideal ($A^-$) Reference Vectors**:
   For benefit criteria (illumination, resource, communication, science):
   $$v_j^+ = \max_i v_{ij}, \quad v_j^- = \min_i v_{ij}$$
   For cost criteria (slope, roughness):
   $$v_j^+ = \min_i v_{ij}, \quad v_j^- = \max_i v_{ij}$$

4. **Euclidean Separation Distances**:
   $$S_i^+ = \sqrt{\sum_{j=1}^n (v_{ij} - v_j^+)^2}, \quad S_i^- = \sqrt{\sum_{j=1}^n (v_{ij} - v_j^-)^2}$$

5. **Relative Closeness Coefficient**:
   $$C_i^* = \frac{S_i^-}{S_i^+ + S_i^-}$$
   *Property*: $C_i^* \in [0.0, 1.0]$. A value of $1.0$ indicates coincidence with the ideal solution; $0.0$ indicates coincidence with the anti-ideal solution.

---

## 5. Monte Carlo Robustness Verification

To quantify sensitivity against weight variations and sensor uncertainty, LunarNavi incorporates a stochastic Monte Carlo simulation.

### Deterministic PRNG (`Mulberry32`)

Standard `Math.random()` lacks reproducibility across different browsers and operating systems. LunarNavi utilizes a 32-bit state generator:

```typescript
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
```

### Verification Properties

1. **Deterministic Reproducibility**: Using seed `42`, 500 iterations produce exact identical rank distributions across repeated runs.
2. **Execution Timing**: Evaluating 12–16 sites across 500 trials completes in $\approx 130$ ms, verified in automated performance tests (`tests/montecarlo.test.ts`).
3. **Weight Normalization**: Perturbed weight vectors $\vec{w}' = \vec{w} \cdot (1 + \epsilon)$ where $\epsilon \sim \mathcal{N}(0, \sigma^2)$ are strictly re-projected onto the unit simplex:
   $$w_j'' = \frac{\max(w_j', 0.001)}{\sum_k \max(w_k', 0.001)}$$
