# Changelog

All notable updates and improvements to the Battleship Game are documented here.

## [v1.1.0] - 2026-03-15

### Fixed
- **Hover preview on enemy board** — During the ship placement phase, the green hover preview was incorrectly appearing on the ENEMY WATERS board as well as YOUR WATERS. Fixed so the placement preview only displays on the player's own board.

## [v1.0.0] - 2026-03-15

### Added
- **Initial release** of the Battleship game
- **Ship Placement Phase** — Place 5 ships on a 10x10 grid by clicking cells, with horizontal/vertical rotation toggle
- **Random Placement** — One-click auto-placement of all ships
- **Battle Phase** — Turn-based combat against a computer AI
- **Smart Computer AI** — The computer uses hunt-and-target strategy: follows up on hits by checking adjacent cells, and uses a checkerboard search pattern for efficient targeting
- **Hit/Miss/Sunk detection** — Visual feedback with color-coded cells (red for hit, blue for miss, dark red for sunk)
- **Fleet status panels** — Real-time tracking of YOUR FLEET and ENEMY FLEET ship status
- **Victory/Defeat overlay** — End-of-game screen with Play Again option
- **Legend** — Color key for cell states (Water, Ship, Hit, Miss, Sunk)
- **New Game button** — Reset and start a fresh game at any time
- **Detailed README** — Game instructions, fleet info, tech stack, and setup guide
