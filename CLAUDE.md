# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a traffic simulator built with [Processing](https://processing.org/), a Java-based creative coding framework. Source files use the `.pde` extension. The Processing IDE compiles and runs sketches directly, and can export platform-specific executables (which are gitignored).

## Development

Processing sketches are run from the Processing IDE or via the `processing-java` CLI tool:

```sh
# Run the sketch
processing-java --sketch=$(pwd) --run

# Export to a platform executable
processing-java --sketch=$(pwd) --export
```

The main sketch file must share the name of the parent directory (e.g., `traffic-simulator.pde`). Additional `.pde` files in the same directory are compiled together as tabs/classes.

## Architecture

- The main `.pde` file contains `setup()` (runs once on start) and `draw()` (runs every frame as the main loop)
- Additional `.pde` files define classes or helper functions and are compiled alongside the main sketch
- No build artifacts are committed; the `application.*` and `applet` directories are all gitignored
