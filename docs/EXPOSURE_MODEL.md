# AirDose Personal Exposure Model

AirDose estimates the cumulative inhaled mass of fine particulate matter ($\text{PM}_{2.5}$) an individual absorbs into the pulmonary alveoli over time.

---

## 1. Fundamental Dosage Equation

The instantaneous rate of particulate inhalation is defined as:

$$\dot{m}_{\text{inhale}}(t) = C_{\text{ambient}}(t) \times I_f(t) \times B_f(t) \times V_E$$

The total inhaled dose over observation interval $[0, T]$ is the integral:

$$\text{Dose}_{\text{total}} = \sum_{i=1}^{N} C_{\text{ambient}, i} \times I_f, i \times B_f, i \times V_E \times \Delta t_i$$

### Variables and Units

| Symbol | Parameter | Unit | Default / Typical Range | Description |
| :--- | :--- | :--- | :--- | :--- |
| $C_{\text{ambient}}$ | Ambient $\text{PM}_{2.5}$ | $\mu\text{g/m}^3$ | $0 - 500\,\mu\text{g/m}^3$ | Outdoor particulate concentration sourced from nearest OpenAQ monitoring station. |
| $I_f$ | Infiltration Factor | dimensionless | $0.10 - 1.00$ | Ratio of indoor $\text{PM}_{2.5}$ to outdoor $\text{PM}_{2.5}$ after building envelope attenuation. |
| $B_f$ | Breathing Multiplier | dimensionless | $1.00 - 5.00$ | Ratio of current minute ventilation relative to basal resting respiration. |
| $V_E$ | Basal Tidal Ventilation | $\text{m}^3/\text{s}$ | $0.0001\,\text{m}^3/\text{s}$ | Resting respiratory volume ($\approx 6\,\text{L/min}$ for average adult). |
| $\Delta t$ | Elapsed Duration | $\text{seconds}$ | $\ge 1\,\text{s}$ | Observation time delta between position checkpoints. |

---

## 2. Micro-Environment Infiltration Factors ($I_f$)

When a user is indoors, outdoor particulates attenuate through windows, walls, and filtration systems. AirDose determines $I_f$ via geofenced locations or an EPA indoor air quality model:

$$I_f = I_{\text{envelope}} + \Delta_{\text{windows}} + \Delta_{\text{hvac}} + \Delta_{\text{ac}} - \Delta_{\text{purifier}}$$

### Infiltration Components

1. **Envelope Tightness ($I_{\text{envelope}}$)**:
   - Fully enclosed (sealed double-pane glass, weather-stripped): **0.35**
   - Partially enclosed (standard residential): **0.55**
   - Mostly open (ventilated balcony, open corridor): **0.75**
   - Fully open (outdoor pavilion, open storefront): **0.95**

2. **Window Opening Habits ($\Delta_{\text{windows}}$)**:
   - Almost never open: $+0.00$
   - Sometimes open: $+0.10$
   - Frequently open: $+0.25$
   - Usually open: $+0.40$

3. **Ventilation System Type ($\Delta_{\text{hvac}}$)**:
   - Mechanical HVAC with central filters: $-0.10$
   - Central AC: $-0.05$
   - Mixed ventilation: $+0.05$
   - Exhaust fans only: $+0.10$
   - Natural drafts: $+0.15$

4. **Air Purifier HEPA Attenuation ($\Delta_{\text{purifier}}$)**:
   - Operating constantly: $-0.35$
   - Operating most of the day: $-0.25$
   - Operating occasionally: $-0.15$
   - No purifier: $-0.00$

*Constraint*: $0.10 \le I_f \le 1.00$.

---

## 3. Physical Exertion Multipliers ($B_f$)

Physical activity increases respiratory rate and tidal volume, dramatically multiplying particulate deposition in the deep lungs.

| Mode | Multiplier ($B_f$) | Velocity Threshold | Typical Activity |
| :--- | :--- | :--- | :--- |
| **Rest** | $1.0\times$ | $< 0.5\text{ m/s}$ ($< 1.8\text{ km/h}$) | Desk work, sleeping, sitting, stationary |
| **Walking** | $1.8\times$ | $0.5 - 2.5\text{ m/s}$ ($1.8 - 9.0\text{ km/h}$) | Commuting on foot, brisk walking |
| **Running** | $3.5\times$ | $2.5 - 6.0\text{ m/s}$ ($9.0 - 21.6\text{ km/h}$) | Jogging, outdoor distance running |
| **Workout** | $5.0\times$ | Manual Lock | High-intensity functional training, gym |
| **Transit** | $1.1\times$ | $> 6.0\text{ m/s}$ ($> 21.6\text{ km/h}$) | Car, train, bus passenger |

---

## 4. Health Impact Benchmarks

### Berkeley Earth Cigarette Equivalence
Developed by Richard & Elizabeth Muller at UC Berkeley, calibrating inhaled $\text{PM}_{2.5}$ mass to cigarette smoke particulate equivalence:

$$\text{Cigarettes} \approx \frac{\text{Total Inhaled Dose } (\mu\text{g})}{20.0\,\mu\text{g}}$$

### WHO Daily Cap Reference
The World Health Organization (WHO) air quality guidelines recommend a 24-hour ambient mean of $\le 25\,\mu\text{g/m}^3$. At basal resting ventilation ($0.0001\text{ m}^3\text{/s} \times 86,400\text{ s} = 8.64\text{ m}^3\text{/day}$), this represents an inhaled daily baseline threshold of $\approx 216\,\mu\text{g/day}$. AirDose tracks personal progress against this daily cap.

---

## 5. Assumptions and Limitations

1. **Ambient Air Representation**: Ambient air values are interpolated from public monitoring stations. Micro-scale street canyons or localized vehicle exhaust plumes may exhibit variance.
2. **Indoor Internal Sources**: The current model assumes ambient air is the primary particulate source. Unmonitored indoor sources (e.g. frying, incense) are not included without local IoT sensor pairing.
3. **Adult Respiratory Baseline**: Basal minute ventilation ($V_E = 6\text{ L/min}$) is calibrated for average adults. Pediatric or athletic tidal baselines may differ.
