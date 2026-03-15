import { useState, useCallback } from 'react'
import './App.css'

const BOARD_SIZE = 10
const ROWS = 'ABCDEFGHIJ'.split('')
const COLS = Array.from({ length: 10 }, (_, i) => i + 1)

type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk'
type Board = CellState[][]
type Ship = {
  name: string
  size: number
  placed: boolean
  sunk: boolean
  cells: [number, number][]
}
type Orientation = 'horizontal' | 'vertical'
type GamePhase = 'placement' | 'battle' | 'gameOver'

const SHIP_TEMPLATES: { name: string; size: number }[] = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 },
]

function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 'empty' as CellState)
  )
}

function createShips(): Ship[] {
  return SHIP_TEMPLATES.map((t) => ({
    name: t.name,
    size: t.size,
    placed: false,
    sunk: false,
    cells: [],
  }))
}

function canPlaceShip(
  board: Board,
  row: number,
  col: number,
  size: number,
  orientation: Orientation
): boolean {
  for (let i = 0; i < size; i++) {
    const r = orientation === 'vertical' ? row + i : row
    const c = orientation === 'horizontal' ? col + i : col
    if (r >= BOARD_SIZE || c >= BOARD_SIZE) return false
    if (board[r][c] !== 'empty') return false
  }
  return true
}

function placeShipOnBoard(
  board: Board,
  row: number,
  col: number,
  size: number,
  orientation: Orientation
): [Board, [number, number][]] {
  const newBoard = board.map((r) => [...r])
  const cells: [number, number][] = []
  for (let i = 0; i < size; i++) {
    const r = orientation === 'vertical' ? row + i : row
    const c = orientation === 'horizontal' ? col + i : col
    newBoard[r][c] = 'ship'
    cells.push([r, c])
  }
  return [newBoard, cells]
}

function placeShipsRandomly(board: Board, ships: Ship[]): [Board, Ship[]] {
  const newBoard = board.map((r) => [...r])
  const newShips = ships.map((s) => ({ ...s, cells: [...s.cells] as [number, number][] }))

  for (const ship of newShips) {
    let placed = false
    let attempts = 0
    while (!placed && attempts < 1000) {
      const orientation: Orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical'
      const row = Math.floor(Math.random() * BOARD_SIZE)
      const col = Math.floor(Math.random() * BOARD_SIZE)
      if (canPlaceShip(newBoard, row, col, ship.size, orientation)) {
        const cells: [number, number][] = []
        for (let i = 0; i < ship.size; i++) {
          const r = orientation === 'vertical' ? row + i : row
          const c = orientation === 'horizontal' ? col + i : col
          newBoard[r][c] = 'ship'
          cells.push([r, c])
        }
        ship.cells = cells
        ship.placed = true
        placed = true
      }
      attempts++
    }
  }
  return [newBoard, newShips]
}

function checkSunk(board: Board, ship: Ship): boolean {
  return ship.cells.every(([r, c]) => board[r][c] === 'hit')
}

function markSunk(board: Board, ship: Ship): Board {
  const newBoard = board.map((r) => [...r])
  for (const [r, c] of ship.cells) {
    newBoard[r][c] = 'sunk'
  }
  return newBoard
}

function isValidTarget(board: Board, r: number, c: number): boolean {
  return (
    r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE &&
    board[r][c] !== 'hit' && board[r][c] !== 'miss' && board[r][c] !== 'sunk'
  )
}

function getSmartComputerTarget(
  board: Board,
  _lastHit: [number, number] | null,
  hitStack: [number, number][]
): [number, number] {
  if (hitStack.length >= 2) {
    // Detect direction from the hit pattern
    const sorted = [...hitStack].sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1])
    const isVertical = sorted[0][1] === sorted[1][1]
    const isHorizontal = sorted[0][0] === sorted[1][0]

    if (isVertical) {
      // All hits share the same column — extend up or down
      const col = sorted[0][1]
      const rows = sorted.map(([r]) => r).sort((a, b) => a - b)
      const minRow = rows[0]
      const maxRow = rows[rows.length - 1]
      // Try extending downward first
      if (isValidTarget(board, maxRow + 1, col)) return [maxRow + 1, col]
      // Try extending upward
      if (isValidTarget(board, minRow - 1, col)) return [minRow - 1, col]
    }

    if (isHorizontal) {
      // All hits share the same row — extend left or right
      const row = sorted[0][0]
      const cols = sorted.map(([, c]) => c).sort((a, b) => a - b)
      const minCol = cols[0]
      const maxCol = cols[cols.length - 1]
      // Try extending rightward first
      if (isValidTarget(board, row, maxCol + 1)) return [row, maxCol + 1]
      // Try extending leftward
      if (isValidTarget(board, row, minCol - 1)) return [row, minCol - 1]
    }

    // If direction-based targeting is blocked (e.g. hit a wall or miss), fall through to adjacent search
  }

  // Single hit or fallback: try all adjacent cells of each hit
  if (hitStack.length > 0) {
    for (const [hr, hc] of [...hitStack].reverse()) {
      const directions: [number, number][] = [
        [-1, 0], [1, 0], [0, -1], [0, 1],
      ]
      for (const [dr, dc] of directions) {
        if (isValidTarget(board, hr + dr, hc + dc)) {
          return [hr + dr, hc + dc]
        }
      }
    }
  }

  // Random targeting with checkerboard pattern
  const available: [number, number][] = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (
        board[r][c] !== 'hit' && board[r][c] !== 'miss' && board[r][c] !== 'sunk' &&
        (r + c) % 2 === 0
      ) {
        available.push([r, c])
      }
    }
  }

  if (available.length === 0) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] !== 'hit' && board[r][c] !== 'miss' && board[r][c] !== 'sunk') {
          return [r, c]
        }
      }
    }
  }

  return available[Math.floor(Math.random() * available.length)]
}

function getCellColor(cell: CellState, isPlayerBoard: boolean, showShips: boolean): string {
  switch (cell) {
    case 'empty':
      return 'bg-sky-100 hover:bg-sky-200'
    case 'ship':
      return showShips || isPlayerBoard ? 'bg-gray-500' : 'bg-sky-100 hover:bg-sky-200'
    case 'hit':
      return 'bg-red-500'
    case 'miss':
      return 'bg-blue-300'
    case 'sunk':
      return 'bg-red-800'
  }
}

function getCellSymbol(cell: CellState, isPlayerBoard: boolean, showShips: boolean): string {
  switch (cell) {
    case 'empty':
      return ''
    case 'ship':
      return showShips || isPlayerBoard ? '~' : ''
    case 'hit':
      return '\u{1F4A5}'
    case 'miss':
      return '~'
    case 'sunk':
      return '\u{1F480}'
  }
}

function App() {
  const [playerBoard, setPlayerBoard] = useState<Board>(createEmptyBoard)
  const [computerBoard, setComputerBoard] = useState<Board>(createEmptyBoard)
  const [playerShips, setPlayerShips] = useState<Ship[]>(createShips)
  const [computerShips, setComputerShips] = useState<Ship[]>(createShips)
  const [currentShipIndex, setCurrentShipIndex] = useState(0)
  const [orientation, setOrientation] = useState<Orientation>('horizontal')
  const [gamePhase, setGamePhase] = useState<GamePhase>('placement')
  const [message, setMessage] = useState('Place your Carrier (5 cells)')
  const [isPlayerTurn, setIsPlayerTurn] = useState(true)
  const [winner, setWinner] = useState<'player' | 'computer' | null>(null)
  const [hoverCells, setHoverCells] = useState<[number, number][]>([])
  const [, setComputerLastHit] = useState<[number, number] | null>(null)
  const [, setComputerHitStack] = useState<[number, number][]>([])
  const [, setPlayerSunkCount] = useState(0)
  const [computerSunkCount, setComputerSunkCount] = useState(0)

  const handlePlacement = useCallback(
    (row: number, col: number) => {
      if (gamePhase !== 'placement' || currentShipIndex >= SHIP_TEMPLATES.length) return

      const ship = playerShips[currentShipIndex]
      if (!canPlaceShip(playerBoard, row, col, ship.size, orientation)) {
        setMessage("Can't place ship there! Try again.")
        return
      }

      const [newBoard, cells] = placeShipOnBoard(playerBoard, row, col, ship.size, orientation)
      const newShips = [...playerShips]
      newShips[currentShipIndex] = { ...newShips[currentShipIndex], placed: true, cells }

      setPlayerBoard(newBoard)
      setPlayerShips(newShips)

      const nextIndex = currentShipIndex + 1
      if (nextIndex >= SHIP_TEMPLATES.length) {
        const [compBoard, compShips] = placeShipsRandomly(createEmptyBoard(), createShips())
        setComputerBoard(compBoard)
        setComputerShips(compShips)
        setGamePhase('battle')
        setMessage('All ships placed! Your turn - click on the enemy board to fire!')
      } else {
        setCurrentShipIndex(nextIndex)
        setMessage(
          `Place your ${SHIP_TEMPLATES[nextIndex].name} (${SHIP_TEMPLATES[nextIndex].size} cells)`
        )
      }
    },
    [gamePhase, currentShipIndex, playerShips, playerBoard, orientation]
  )

  const doComputerTurn = useCallback(() => {
    setPlayerBoard((prevPlayerBoard) => {
      setPlayerShips((prevPlayerShips) => {
        setComputerLastHit((prevLastHit) => {
          setComputerHitStack((prevHitStack) => {
            setPlayerSunkCount((prevSunkCount) => {
              const [row, col] = getSmartComputerTarget(prevPlayerBoard, prevLastHit, prevHitStack)

              let newBoard = prevPlayerBoard.map((r) => [...r])
              const newShips = prevPlayerShips.map((s) => ({
                ...s,
                cells: [...s.cells] as [number, number][],
              }))
              let sunkCount = prevSunkCount
              let newHitStack = [...prevHitStack]
              let newLastHit = prevLastHit

              if (newBoard[row][col] === 'ship') {
                newBoard[row][col] = 'hit'
                newLastHit = [row, col]
                newHitStack.push([row, col])

                let shipJustSunk = false
                for (let i = 0; i < newShips.length; i++) {
                  if (!newShips[i].sunk && checkSunk(newBoard, newShips[i])) {
                    newShips[i].sunk = true
                    newBoard = markSunk(newBoard, newShips[i])
                    sunkCount++
                    const sunkCellSet = new Set(
                      newShips[i].cells.map(([r, c]) => `${r},${c}`)
                    )
                    newHitStack = newHitStack.filter(
                      ([r, c]) => !sunkCellSet.has(`${r},${c}`)
                    )
                    setMessage(`Computer sunk your ${newShips[i].name}!`)
                    shipJustSunk = true
                  }
                }

                if (!shipJustSunk) {
                  setMessage('Computer hit your ship!')
                }
              } else {
                newBoard[row][col] = 'miss'
                setMessage(`Computer fired at ${ROWS[row]}${col + 1} and missed! Your turn.`)
              }

              if (sunkCount >= SHIP_TEMPLATES.length) {
                setGamePhase('gameOver')
                setWinner('computer')
                setMessage('Game Over! The computer destroyed all your ships!')
              } else {
                setIsPlayerTurn(true)
              }

              setComputerLastHit(newLastHit)
              setComputerHitStack(newHitStack)
              setPlayerSunkCount(sunkCount)
              setPlayerShips(newShips)
              setPlayerBoard(newBoard)

              return prevSunkCount
            })
            return prevHitStack
          })
          return prevLastHit
        })
        return prevPlayerShips
      })
      return prevPlayerBoard
    })
  }, [])

  const handlePlayerAttack = useCallback(
    (row: number, col: number) => {
      if (gamePhase !== 'battle' || !isPlayerTurn) return
      if (
        computerBoard[row][col] === 'hit' ||
        computerBoard[row][col] === 'miss' ||
        computerBoard[row][col] === 'sunk'
      )
        return

      let newBoard = computerBoard.map((r) => [...r])
      const newShips = computerShips.map((s) => ({
        ...s,
        cells: [...s.cells] as [number, number][],
      }))
      let sunkCount = computerSunkCount

      if (newBoard[row][col] === 'ship') {
        newBoard[row][col] = 'hit'
        setMessage('Direct hit!')

        for (let i = 0; i < newShips.length; i++) {
          if (!newShips[i].sunk && checkSunk(newBoard, newShips[i])) {
            newShips[i].sunk = true
            newBoard = markSunk(newBoard, newShips[i])
            sunkCount++
            setMessage(`You sunk their ${newShips[i].name}!`)
          }
        }
      } else {
        newBoard[row][col] = 'miss'
        setMessage('Miss!')
      }

      setComputerBoard(newBoard)
      setComputerShips(newShips)
      setComputerSunkCount(sunkCount)

      if (sunkCount >= SHIP_TEMPLATES.length) {
        setGamePhase('gameOver')
        setWinner('player')
        setMessage('You win! All enemy ships destroyed!')
        return
      }

      setIsPlayerTurn(false)
      setTimeout(() => {
        doComputerTurn()
      }, 800)
    },
    [gamePhase, isPlayerTurn, computerBoard, computerShips, computerSunkCount, doComputerTurn]
  )

  const handleBoardHover = useCallback(
    (row: number, col: number) => {
      if (gamePhase !== 'placement' || currentShipIndex >= SHIP_TEMPLATES.length) return
      const ship = SHIP_TEMPLATES[currentShipIndex]
      const cells: [number, number][] = []
      const valid = canPlaceShip(playerBoard, row, col, ship.size, orientation)
      for (let i = 0; i < ship.size; i++) {
        const r = orientation === 'vertical' ? row + i : row
        const c = orientation === 'horizontal' ? col + i : col
        if (r < BOARD_SIZE && c < BOARD_SIZE) {
          cells.push([r, c])
        }
      }
      if (valid) {
        setHoverCells(cells)
      } else {
        setHoverCells([])
      }
    },
    [gamePhase, currentShipIndex, playerBoard, orientation]
  )

  const resetGame = () => {
    setPlayerBoard(createEmptyBoard())
    setComputerBoard(createEmptyBoard())
    setPlayerShips(createShips())
    setComputerShips(createShips())
    setCurrentShipIndex(0)
    setOrientation('horizontal')
    setGamePhase('placement')
    setMessage('Place your Carrier (5 cells)')
    setIsPlayerTurn(true)
    setWinner(null)
    setHoverCells([])
    setComputerLastHit(null)
    setComputerHitStack([])
    setPlayerSunkCount(0)
    setComputerSunkCount(0)
  }

  const randomPlacement = () => {
    if (gamePhase !== 'placement') return
    const [newBoard, newShips] = placeShipsRandomly(createEmptyBoard(), createShips())
    setPlayerBoard(newBoard)
    setPlayerShips(newShips)
    setCurrentShipIndex(SHIP_TEMPLATES.length)

    const [compBoard, compShips] = placeShipsRandomly(createEmptyBoard(), createShips())
    setComputerBoard(compBoard)
    setComputerShips(compShips)
    setGamePhase('battle')
    setMessage('Ships placed randomly! Your turn - click on the enemy board to fire!')
  }

  const isHoverCell = (row: number, col: number) => {
    return hoverCells.some(([r, c]) => r === row && c === col)
  }

  const renderBoard = (
    board: Board,
    isPlayerBoard: boolean,
    onClick: (row: number, col: number) => void,
    onHover?: (row: number, col: number) => void,
    interactive?: boolean
  ) => {
    return (
      <div className="inline-block">
        <div className="flex">
          <div className="w-8 h-8" />
          {COLS.map((col) => (
            <div
              key={col}
              className="w-8 h-8 flex items-center justify-center text-xs font-bold text-slate-600"
            >
              {col}
            </div>
          ))}
        </div>
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            <div className="w-8 h-8 flex items-center justify-center text-xs font-bold text-slate-600">
              {ROWS[rowIndex]}
            </div>
            {row.map((cell, colIndex) => {
              const hovering = isPlayerBoard && isHoverCell(rowIndex, colIndex)
              const cellColor = getCellColor(cell, isPlayerBoard, false)
              const symbol = getCellSymbol(cell, isPlayerBoard, false)
              const canClick =
                interactive && cell !== 'hit' && cell !== 'miss' && cell !== 'sunk'

              return (
                <div
                  key={colIndex}
                  className={`w-8 h-8 border border-slate-300 flex items-center justify-center text-sm
                    ${hovering ? 'bg-green-400' : cellColor}
                    ${canClick ? 'cursor-crosshair' : 'cursor-default'}
                    transition-colors duration-150`}
                  onClick={() => canClick && onClick(rowIndex, colIndex)}
                  onMouseEnter={() => onHover?.(rowIndex, colIndex)}
                  onMouseLeave={() => setHoverCells([])}
                >
                  {symbol}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-white">
      <div className="text-center py-6">
        <h1 className="text-4xl font-bold tracking-wider mb-1">
          <span className="text-red-400">BATTLE</span>
          <span className="text-blue-300">SHIP</span>
        </h1>
        <p className="text-slate-400 text-sm">Naval Combat Strategy Game</p>
      </div>

      <div className="text-center mb-6">
        <div className="inline-block bg-slate-800 border border-slate-600 rounded-lg px-6 py-3 shadow-lg">
          <p className="text-lg font-medium text-amber-300">{message}</p>
        </div>
      </div>

      <div className="text-center mb-6 flex justify-center gap-3">
        {gamePhase === 'placement' && (
          <>
            <button
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-md"
              onClick={() =>
                setOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal')
              }
            >
              Rotate to {orientation === 'horizontal' ? 'vertical' : 'horizontal'}
            </button>
            <button
              className="bg-green-600 hover:bg-green-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-md"
              onClick={randomPlacement}
            >
              Random Placement
            </button>
          </>
        )}
        <button
          className="bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-md"
          onClick={resetGame}
        >
          New Game
        </button>
      </div>

      <div className="flex justify-center gap-16 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-2 text-center">YOUR FLEET</h3>
          <div className="flex flex-col gap-1">
            {playerShips.map((ship, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="flex gap-0.5">
                  {Array.from({ length: ship.size }, (_, j) => (
                    <div
                      key={j}
                      className={`w-3 h-3 rounded-sm ${
                        ship.sunk
                          ? 'bg-red-800'
                          : ship.placed
                            ? 'bg-gray-400'
                            : 'bg-slate-600'
                      }`}
                    />
                  ))}
                </div>
                <span className={ship.sunk ? 'text-red-500 line-through' : 'text-slate-300'}>
                  {ship.name}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-2 text-center">ENEMY FLEET</h3>
          <div className="flex flex-col gap-1">
            {computerShips.map((ship, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="flex gap-0.5">
                  {Array.from({ length: ship.size }, (_, j) => (
                    <div
                      key={j}
                      className={`w-3 h-3 rounded-sm ${ship.sunk ? 'bg-red-800' : 'bg-slate-600'}`}
                    />
                  ))}
                </div>
                <span className={ship.sunk ? 'text-red-500 line-through' : 'text-slate-300'}>
                  {ship.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-12 flex-wrap pb-12">
        <div className="text-center">
          <h2 className="text-lg font-bold text-blue-300 mb-3">YOUR WATERS</h2>
          {renderBoard(
            playerBoard,
            true,
            handlePlacement,
            gamePhase === 'placement' ? handleBoardHover : undefined,
            gamePhase === 'placement'
          )}
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-red-300 mb-3">ENEMY WATERS</h2>
          {renderBoard(
            computerBoard,
            false,
            handlePlayerAttack,
            undefined,
            gamePhase === 'battle' && isPlayerTurn
          )}
        </div>
      </div>

      {gamePhase === 'gameOver' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800 border-2 border-slate-500 rounded-2xl p-10 text-center shadow-2xl">
            <h2 className="text-4xl font-bold mb-4">
              {winner === 'player' ? (
                <span className="text-green-400">VICTORY!</span>
              ) : (
                <span className="text-red-400">DEFEAT!</span>
              )}
            </h2>
            <p className="text-xl text-slate-300 mb-6">
              {winner === 'player'
                ? 'You destroyed all enemy ships!'
                : 'The enemy destroyed all your ships!'}
            </p>
            <button
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg px-8 py-3 rounded-lg transition-colors shadow-lg"
              onClick={resetGame}
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      <div className="text-center pb-8">
        <div className="inline-flex gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-sky-100 border border-slate-400 rounded-sm" />{' '}
            Water
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-gray-500 rounded-sm" /> Ship
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-red-500 rounded-sm" /> Hit
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-blue-300 rounded-sm" /> Miss
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-red-800 rounded-sm" /> Sunk
          </span>
        </div>
      </div>
    </div>
  )
}

export default App
