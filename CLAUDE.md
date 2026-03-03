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

### Opening the browser in WSL

`wslview` and `xdg-open` are not available. Use Windows interop instead:

```sh
cmd.exe /c start http://localhost:8080
```

After starting the server, validate it is reachable:

```sh
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080
# expect: 200
```

## Validation policy

After completing any action, validate that it succeeded before reporting success to the user. Examples:
- After starting the dev server: confirm the port is bound (`lsof -ti:8080`) and returns HTTP 200 (`curl`)
- After editing a file: re-read the changed section to confirm the edit applied correctly
- After running a command: check its exit code and, where possible, verify the observable effect

## Architecture

- `setup()` — runs once on start; creates the canvas and initializes cars
- `draw()` — runs every frame (~60 fps); clears canvas, draws road, updates and displays all cars
- `mousePressed()` — disrupts cars within `DISRUPTION_RADIUS` of the click point
- `Car` class — manages position, speed, and a three-state machine (`normal` → `decelerating` → `accelerating` → `normal`)

## Simulation behaviour

- Cars travel downward and wrap to the top when they exit the bottom of the canvas.
- Clicking near the road triggers a traffic disruption: affected cars brake to near-stop, then gradually accelerate back to default speed.
- Car color reflects speed: white = full speed, red = near-stopped.
