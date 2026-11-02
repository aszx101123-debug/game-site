# Maple Adventure — 2D RPG Demo

An original browser-playable side-scrolling RPG demo built with Canvas, HTML, CSS, and vanilla JavaScript. No build step or third-party runtime dependency is required.

## Controls
- `A` / `D` or arrow keys: move
- `Space` / `W` / `↑`: jump
- `J` / `Shift`: attack
- `E`: talk to the forest shop NPC
- `I`: open inventory
- `1`: use a red potion
- `S`: save immediately
- `Esc`: close open windows

## Features
- Side-scrolling forest map, platforms, and camera follow
- Canvas-drawn adventurer, slimes, shop NPC, and forest boss
- One-hit-per-swing attack, critical hits, knockback, HP, EXP, and leveling
- Meso, EXP, and potion drops with proximity pickup
- NPC potion shop, inventory, and potion use
- Local browser save with periodic autosave
- Responsive page and optional synthesized sound effects

## GitHub Pages
This folder is a static site. Enable GitHub Pages for the repository with the `main` branch and repository root as the publishing source; the game will be served from the `/maple-rpg/` path under the Pages site URL.

Progress is stored in this browser's `localStorage`; it is not synchronized between browsers or devices.
