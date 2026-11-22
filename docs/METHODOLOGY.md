# LunarNavi — Decision Support Methodology

> **Formal Mathematical Formulation & Algorithmic Specifications for Feasibility Gating, Vector-Normalized TOPSIS, Deterministic Monte Carlo Sensitivity Analysis, and Primary/Backup Selection.**

---

## 1. Mathematical Overview

LunarNavi solves a constrained multi-criteria decision problem over a finite discrete candidate set:

$$\mathcal{S} = \{s_1, s_2, \dots, s_m\}, \quad m = 16$$

evaluated against $n = 6$ physical, environmental, and scientific criteria:

$$\mathcal{C} = \{c_1, c_2, \dots, c_n\}$$

The analytical process executes in four strictly ordered phases:

```
[Candidate Sites S] 
       │
       ▼
[Phase 1: Feasibility Hard-Gate Filter]  ──► Excluded Sites (Documented Rationale)
       │
       ▼ Surviving Feasible Subset S_feas
[Phase 2: Vector-Normalized TOPSIS Engine]
       │
       ▼ Deterministic Closeness C_i*
[Phase 3: Stochastic Monte Carlo Simulation (Mulberry32, 500 Trials)]
       │
       ▼ Win Rates, Mean Ranks, Rank Jitter
[Phase 4: Primary & Complementary Backup Recommendation Logic]
```

---

## 2. Phase 1 — Feasibility Hard-Gate Filtering

Before applying compensatory multi-criteria scoring, candidates must satisfy mandatory engineering and survival constraints. A site failing any constraint is rejected from the active ranking matrix:

$$\text{Feasible}(s_i) = \begin{cases} 
\text{true} & \text{if } \theta(s_i) \le \theta_{\max} \land \gamma(s_i) \ge \gamma_{\min} \land z(s_i) \in [z_{\min}, z_{\max}] \\
\text{false} & \text{otherwise}
\end{cases}$$

Where:
- $\theta(s_i)$: Local surface slope gradient at 50m baseline (default maximum $\theta_{\max} = 15.0^\circ$ for landing safety).
- $\gamma(s_i)$: Direct-to-Earth communication visibility percentage (default minimum $\gamma_{\min} = 30.0\%$).
- $z(s_i)$: Surface elevation from LOLA DEM (within operational range).

Every excluded site is logged with its exact threshold violation to provide full operational transparency.

---

## 3. Phase 2 — Vector-Normalized TOPSIS Formulation

For the feasible subset $\mathcal{S}_{\text{feas}} = \{s_1, \dots, s_k\}$ ($k \le m$):

### 3.1. Decision Matrix Construction
$$X = [x_{ij}]_{k \times n} = \begin{bmatrix}
x_{11} & x_{12} & \cdots & x_{1n} \\
x_{21} & x_{22} & \cdots & x_{2n} \\
\vdots & \vdots & \ddots & \vdots \\
x_{k1} & x_{k2} & \cdots & x_{kn}
\end{bmatrix}$$

### 3.2. Vector Normalization
To convert heterogeneous physical dimensions (degrees, meters, percentages) into dimensionless units on a comparable geometric scale, LunarNavi applies vector normalization:

$$r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{p=1}^k x_{pj}^2}}, \quad \forall i \in \{1,\dots,k\}, \; j \in \{1,\dots,n\}$$

Unlike linear min-max normalization, vector normalization preserves the length of the column vector in Euclidean $k$-space:

$$\sum_{i=1}^k r_{ij}^2 = 1, \quad \forall j \in \{1,\dots,n\}$$

### 3.3. Weight Vector Application
Mission criteria weights $w_j \ge 0$ satisfy the normalization condition:

$$\sum_{j=1}^n w_j = 1.0$$

The weighted normalized decision matrix $V = [v_{ij}]_{k \times n}$ is computed as:

$$v_{ij} = w_j \cdot r_{ij}$$

### 3.4. Positive Ideal ($A^+$) and Negative Ideal ($A^-$) Solutions
The criteria set is partitioned into benefit criteria $J_B$ (where higher values are preferred) and cost criteria $J_C$ (where lower values are preferred):
- $J_B = \{\text{Solar Illumination}, \text{Earth Communication Visibility}, \text{Science Return Value}\}$
- $J_C = \{\text{Slope Gradient}, \text{Surface RMS Roughness}, \text{PSR Distance (for resource missions)}\}$

The virtual ideal benchmarks are:

$$A^+ = \{v_1^+, v_2^+, \dots, v_n^+\}, \quad v_j^+ = \begin{cases} \max_{1 \le i \le k}(v_{ij}), & j \in J_B \\ \min_{1 \le i \le k}(v_{ij}), & j \in J_C \end{cases}$$

$$A^- = \{v_1^-, v_2^-, \dots, v_n^-\}, \quad v_j^- = \begin{cases} \min_{1 \le i \le k}(v_{ij}), & j \in J_B \\ \max_{1 \le i \le k}(v_{ij}), & j \in J_C \end{cases}$$

### 3.5. Euclidean Distance Separation
For each candidate site $s_i$, the $L_2$-norm Euclidean distance to the Positive Ideal Solution ($S_i^+$) and Negative Ideal Solution ($S_i^-$) is computed:

$$S_i^+ = \sqrt{\sum_{j=1}^n (v_{ij} - v_j^+)^2}$$

$$S_i^- = \sqrt{\sum_{j=1}^n (v_{ij} - v_j^-)^2}$$

### 3.6. Relative Closeness to the Ideal Solution
The performance index $C_i^*$ (relative closeness) is:

$$C_i^* = \frac{S_i^-}{S_i^+ + S_i^-}, \quad 0 \le C_i^* \le 1$$

- When $C_i^* \to 1$: The site approaches the ideal state $A^+$.
- When $C_i^* \to 0$: The site approaches the anti-ideal state $A^-$.

Candidates are sorted in descending order of $C_i^*$ to establish the baseline deterministic ranking.

---

## 4. Phase 3 — Stochastic Monte Carlo Robustness Simulation

### 4.1. The Need for Sensitivity Quantification
Orbital remote sensing involves measurement uncertainties:
- Altimetric vertical resolution: $\pm 0.5\text{ m}$ to $\pm 1.0\text{ m}$.
- Slope calculation baseline variance: $\pm 1.5^\circ$.
- Illumination model variance across the 18.6-year precession cycle: $\pm 3.0\%$.

A static deterministic score cannot disclose whether a candidate's #1 rank is stable or an artifact of precise point estimates.

### 4.2. Mulberry32 PRNG Algorithm
To guarantee reproducibility across platforms, LunarNavi avoids `Math.random()` and utilizes **Mulberry32**, a fast, high-quality 32-bit pseudo-random number generator initialized with deterministic seed $a = 42$:

```typescript
function mulberry32(a: number) {
  return function(): number {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### 4.3. Perturbation Model
In each trial $t \in \{1, \dots, N\}$ ($N = 500$):

$$\tilde{x}_{ij}^{(t)} = \max\left(0, \; x_{ij} + \delta_{ij}^{(t)}\right)$$

Where $\delta_{ij}^{(t)} \sim \mathcal{N}(0, \sigma_j^2)$ is generated via the Box-Muller transform using Mulberry32:

- $\sigma_{\text{slope}} = 1.5^\circ$
- $\sigma_{\text{roughness}} = 0.8\text{ m}$
- $\sigma_{\text{illumination}} = 3.0\%$
- $\sigma_{\text{visibility}} = 2.5\%$

Surviving sites are re-ranked in each trial.

### 4.4. Robustness Metrics
1. **Win Rate ($W_i$)**: Percentage of trials where candidate $s_i$ ranked #1:
   $$W_i = \frac{1}{N} \sum_{t=1}^N \mathbb{I}\left(\text{Rank}_i^{(t)} = 1\right) \times 100\%$$
2. **Mean Rank ($\bar{R}_i$)**:
   $$\bar{R}_i = \frac{1}{N} \sum_{t=1}^N \text{Rank}_i^{(t)}$$
3. **Rank Standard Deviation ($\sigma_{R, i}$)**:
   $$\sigma_{R, i} = \sqrt{\frac{1}{N} \sum_{t=1}^N \left(\text{Rank}_i^{(t)} - \bar{R}_i\right)^2}$$

---

## 5. Phase 4 — Primary & Backup Selection Logic

### 5.1. Primary Landing Site
The candidate site $s_{\text{primary}}$ is selected by satisfying:

$$s_{\text{primary}} = \arg\max_{s_i \in \mathcal{S}_{\text{feas}}} C_i^*$$

Subject to:
- Feasibility hard gates verified.
- Monte Carlo win rate $W_{\text{primary}} \ge 40\%$ or highest mean rank stability.

### 5.2. Backup Landing Site
Space mission safety mandates a pre-certified contingency site in case:
1. Terminal descent terrain relative navigation identifies unexpected boulder fields.
2. Launch window slippage shifts shadow patterns, obscuring the primary landing zone.

The backup site $s_{\text{backup}}$ is selected such that:

$$s_{\text{backup}} = \arg\max_{s_i \in \mathcal{S}_{\text{feas}} \setminus \{s_{\text{primary}}\}} C_i^*$$

Subject to:
1. $C_i^* \ge 0.60$ (strictly viable overall performance).
2. All safety gates passed ($\theta \le 15^\circ$, coms $\ge 30\%$).
3. Independent operational profile or geographical diversity from $s_{\text{primary}}$.
