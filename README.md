# Dungeon Explorer: Ancient Echoes

A browser-based, turn-based RPG dungeon crawler. Pick a class, explore dungeons, fight bosses, and unlock new skills as you progress.

**Play / source on Replit:** https://replit.com/@rohitvermarv667/Dungeon-Explorer

---

## Features

- **5 playable classes:** Warrior, Arcane Mage, Shadow Rogue, Holy Paladin, Allrounder
- **2 dungeons:** Dungeon of Trials and Grave of Giants
- **2 hub cities:** Pantheon and Niflheim
- **NPC dialogue trees** with branching conversations
- **Boss skill progression system**
- **Turn-based combat** with class-specific abilities
- **Procedurally generated maze levels** with reachability checks so the boss room, enemies and exit stairs can always be reached

## Tech Stack

- TypeScript
- pnpm workspace (monorepo)
- Built and hosted on [Replit](https://replit.com)

## Project Structure

```
.
├── artifacts/        # App packages (game client)
├── lib/              # Shared libraries
├── scripts/          # Utility scripts
├── attached_assets/  # Game assets
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

## Getting Started

### Requirements

- Node.js 18+
- [pnpm](https://pnpm.io/installation)

### Run locally

```bash
git clone https://github.com/Light-844/Dungeon-Explorer.git
cd Dungeon-Explorer
pnpm install
pnpm run dev
```

Then open the local URL printed in the terminal.

> If `pnpm run dev` isn't available, check the `scripts` section of `package.json` or the `artifacts/` folder for the correct start command.

## Roadmap

- [x] Class system and combat
- [x] Two dungeons and two hub cities
- [x] NPC dialogue trees
- [x] Maze generation with reachability validation
- [ ] More dungeons and bosses
- [ ] Save/load progress
- [ ] Sound and music

## Author

**Rohit Verma (Light)**

- GitHub: [Light-844](https://github.com/Light-844)
- LinkedIn: [rohitverma-analyst](https://linkedin.com/in/rohitverma-analyst)

## License

This project is for learning and portfolio purposes. Add a license file (e.g. MIT) if you want others to reuse it.
