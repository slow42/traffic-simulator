# Traffic Simulator

A browser-based intersection traffic simulator built with [p5.js](https://p5js.org/). No build step — open `index.html` and go.

## What it does

Simulates a 4-way stop intersection with realistic time-of-day traffic flow. Cars spawn from all four directions, queue at stop lines, and take turns clearing the intersection using a first-come-first-served right-of-way policy.

Traffic volume follows a 24-hour schedule with configurable morning and evening rush hours. Everything — speeds, congestion, timing — can be tuned live from the Config panel.

## Features

### Simulation
- **Physically calibrated motion** — approach and proceed speeds expressed in km/h; acceleration and braking modelled per frame at ~60 fps
- **Car-following model** — cars maintain a safe gap behind the vehicle ahead using a kinematic braking formula
- **Time-of-day traffic flow** — Gaussian rush-hour peaks at 8 AM (inbound) and 5 PM (outbound), configurable per direction
- **Stochastic arrivals** — inter-arrival times drawn from a Gaussian distribution around the scheduled flow rate
- **Sim clock** — displays `H:MM:SS AM/PM`; runs at 60× real time by default (one full day in ~24 minutes)

### Config panel
- **Live parameter sliders** — adjust approach speed, proceed speed, acceleration, braking, following gap, congestion scale, arrival variance, and sim speed; all take effect immediately
- **Text input override** — type an exact value into any slider's text box and press Enter
- **Persistent defaults** — save your current slider values or congestion schedule as the default for future page loads via _Set as default_
- **Editable congestion schedule** — drag data points on the 24-hour chart per direction to reshape traffic demand; click anywhere on the chart to **jump the simulation to that hour**

### Debug panel
Real-time charts updated every second:

| Chart | What it shows |
|---|---|
| Throughput per Lane | Cars clearing the intersection per second, per direction |
| Queue Depth per Lane | Cars stopped or braking at the stop line |
| Avg Wait Time per Lane | Mean time cars spend waiting at the stop line (seconds) |
| Intersection Utilization | % of frames the intersection was occupied |

### Live stats sidebar
Per-direction queue depth and flow rate (cars/s), plus overall intersection utilization — visible alongside the canvas at all times.

## Getting started

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

No npm, no build, no dependencies to install. p5.js, Chart.js, and Tailwind CSS are all loaded from CDN.

> **WSL users:** open with `cmd.exe /c start http://localhost:8080`

## Files

| File | Purpose |
|---|---|
| `index.html` | UI shell — navbar, panels, Chart.js setup, config sliders, live stats |
| `sketch.js` | p5.js simulation — `Car` class, intersection manager, flow model, drawing |

## Architecture

```
setup()              — create canvas, seed congestion schedule from localStorage
draw()               — 60 fps loop: spawn → update → display → sample metrics
Car                  — state machine: traveling → braking → stopped → proceeding → exiting
intersection         — FIFO queue; admits one car at a time
simHour()            — wall-clock time scaled by SIM_SPEED, offsettable via jumpToHour()
getCongestionRate()  — interpolates the 24-point schedule, scaled by CONGESTION_SCALE
nextSpawnInterval()  — converts veh/hr to frames between spawns, with Gaussian jitter
```

### Car state machine

```
traveling ──(within BRAKE_DIST)──► braking ──(d≤1)──► stopped
    stopped ──(intersection grants go)──► proceeding ──(cleared box)──► exiting
```

Car colour reflects state:
- **White** — travelling at approach speed
- **Red gradient** — braking (white → red as speed drops to zero)
- **Green gradient** — proceeding through the intersection (dark green → white as speed builds)

## Planned modes

The mode selector lists these — not yet implemented:
- Roundabout
- Traffic Lights

## Tech stack

| Library | Version | Role |
|---|---|---|
| [p5.js](https://p5js.org/) | 1.9.4 | Canvas rendering and simulation loop |
| [Chart.js](https://www.chartjs.org/) | latest | Debug and congestion schedule charts |
| [chartjs-plugin-dragdata](https://github.com/chrispahm/chartjs-plugin-dragdata) | 2.2.5 | Draggable congestion schedule points |
| [Tailwind CSS](https://tailwindcss.com/) | CDN | UI styling |
