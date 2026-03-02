# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based traffic simulator built with [p5.js](https://p5js.org/). The sketch runs entirely in the browser — no build step required.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Entry point; loads p5.js from CDN and `sketch.js` |
| `sketch.js` | Full simulation: constants, `Car` class, `setup()`, `draw()`, `mousePressed()` |

## Development

Serve the project with any static file server and open `index.html`:

```sh
# Python (built-in)
python3 -m http.server 8080
# then open http://localhost:8080 in your browser
```

No npm install or compilation needed — p5.js is loaded directly from the CDN.

## Architecture

- `setup()` — runs once on start; creates the canvas and initializes cars
- `draw()` — runs every frame (~60 fps); clears canvas, draws road, updates and displays all cars
- `mousePressed()` — disrupts cars within `DISRUPTION_RADIUS` of the click point
- `Car` class — manages position, speed, and a three-state machine (`normal` → `decelerating` → `accelerating` → `normal`)

## Simulation behaviour

- Cars travel downward and wrap to the top when they exit the bottom of the canvas.
- Clicking near the road triggers a traffic disruption: affected cars brake to near-stop, then gradually accelerate back to default speed.
- Car color reflects speed: white = full speed, red = near-stopped.
