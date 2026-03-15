# Battleship Game

A classic Battleship naval combat strategy game built with React, TypeScript, and Tailwind CSS. Play against a smart computer AI that hunts down your ships.

## How to Play

### Ship Placement Phase
1. Place your fleet on the board by clicking cells on **YOUR WATERS**
2. Use the **Rotate** button to toggle between horizontal and vertical orientation
3. Or click **Random Placement** to auto-place all ships

### Battle Phase
1. Click on cells in **ENEMY WATERS** to fire at the computer's fleet
2. The computer will fire back after each of your turns
3. Hits are shown in red, misses in blue, and sunk ships in dark red
4. Sink all 5 enemy ships to win

### Fleet
| Ship        | Size |
|-------------|------|
| Carrier     | 5    |
| Battleship  | 4    |
| Cruiser     | 3    |
| Submarine   | 3    |
| Destroyer   | 2    |

## Tech Stack

- **React** with TypeScript
- **Vite** for fast builds and dev server
- **Tailwind CSS** for styling

## Getting Started

```bash
cd v1
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
cd v1
npm run build
```

The production build will be output to `v1/dist`.
