# Maple Adventure — World Alpha

An original browser-playable 2D side-scrolling RPG. This is an evolving single-player RPG project inspired by classic side-scrolling MMORPG progression; it does not use MapleStory artwork, music, characters, or other proprietary assets.

## Play
Open the GitHub Pages game path after Pages has been enabled:
`/maple-rpg/`

## Controls
- `A` / `D` or arrow keys: move
- `Space` / `W` / `↑`: jump
- `J` / `Shift`: basic attack
- `2`, `3`, `4`: job skills
- `E`: talk to the forest shop NPC (in the first region)
- `I`: open inventory
- `1`: use a red potion
- `S`: save immediately
- `Esc`: close open windows

## Current systems
- Three playable jobs: Warrior, Mage, and Archer, each with three job skills
- Three connected regions: Green Forest, Mushroom Hills, and Frozen Cave
- Region progression gated by defeating the area's boss
- Region-specific monsters, boss HP, rewards, and quest targets
- Monster respawns, critical hits, knockback, HP, EXP, leveling, and stat growth
- Meso, EXP, potion, weapon, and armor drops
- Equipment pickups improve attack or defense and are shown in inventory
- Forest potion shop, inventory, camera follow, platforms, and simple synthesized sound
- Autosave and manual save through browser localStorage

## Development status
This is an early playable foundation, not yet a full online MMORPG. The next milestones are: a proper town hub and portal/map UI; expanded monster and boss attack patterns; a larger equipment/upgrade system; NPC dialogue and multi-step quest chains; character animations and original art/audio; and, only after the single-player foundation is stable, server-backed accounts and multiplayer.

## Technical notes
- Built with Canvas 2D, HTML, CSS, and vanilla JavaScript.
- No build step is required.
- Save data currently lives in this browser's localStorage and does not sync between devices.
- The current project is a static GitHub Pages site. Static Pages hosting is public; account-restricted access requires a protected hosting/authentication layer.

## GitHub Pages
Enable GitHub Pages with the `main` branch and repository root as the publishing source; the game is served from the `/maple-rpg/` path under the Pages site URL.
