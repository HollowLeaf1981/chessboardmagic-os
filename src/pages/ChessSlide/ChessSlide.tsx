import { useState, useEffect, useCallback, useRef } from 'react'
import { Chess } from 'chess.js'
import { PlayCircle, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { openings } from '@/data/eco'
import { getPieceImageSrc, getSquareStyle } from '@/config/chessboard'

// A single ECO opening entry: name + PGN string.
type Opening = (typeof openings)[number]

// One quadrant of a 4-piece tile. Each tile holds four chess squares (a 2×2
// chunk of the full board), stored as piece strings like "wP", "bN", or "".
type PieceCode = string

// A single sliding tile. `id` is the tile's "home" position (1..16); `null`
// means this is the empty slot. `colour` is a 4-element array kept from the
// original data shape (one entry per quadrant) — values aren't currently
// read in the simplified version but the structure is preserved so the
// shuffle/swap logic doesn't need to change.
interface Tile {
  id: number | null
  colour: number[]
  piece: [PieceCode, PieceCode, PieceCode, PieceCode]
}

type PuzzleGrid = Tile[][]

/**
 * The starting puzzle: a 4×4 grid of tiles, each tile representing a 2×2
 * chunk of an 8×8 chess board. Tile 1 is the top-left chunk (a8/b8/a7/b7),
 * tile 16 is the bottom-right (g2/h2/g1/h1). The four piece strings per
 * tile are arranged top-left, top-right, bottom-left, bottom-right.
 *
 * The middle 8 tiles start blank — they'll be filled in from the chosen
 * opening's FEN before each new round.
 */
const initialPuzzle: PuzzleGrid = [
  [
    { id: 1, colour: [1, 0, 0, 1], piece: ['bR', 'bN', 'bP', 'bP'] },
    { id: 2, colour: [1, 0, 0, 1], piece: ['bB', 'bQ', 'bP', 'bP'] },
    { id: 3, colour: [1, 0, 0, 1], piece: ['bK', 'bB', 'bP', 'bP'] },
    { id: 4, colour: [1, 0, 0, 1], piece: ['bN', 'bR', 'bP', 'bP'] },
  ],
  [
    { id: 5, colour: [1, 0, 0, 1], piece: ['', '', '', ''] },
    { id: 6, colour: [1, 0, 0, 1], piece: ['', '', '', ''] },
    { id: 7, colour: [1, 0, 0, 1], piece: ['', '', '', ''] },
    { id: 8, colour: [1, 0, 0, 1], piece: ['', '', '', ''] },
  ],
  [
    { id: 9, colour: [1, 0, 0, 1], piece: ['', '', '', ''] },
    { id: 10, colour: [1, 0, 0, 1], piece: ['', '', '', ''] },
    { id: 11, colour: [1, 0, 0, 1], piece: ['', '', '', ''] },
    { id: 12, colour: [1, 0, 0, 1], piece: ['', '', '', ''] },
  ],
  [
    { id: 13, colour: [1, 0, 0, 1], piece: ['wP', 'wP', 'wR', 'wN'] },
    { id: 14, colour: [1, 0, 0, 1], piece: ['wP', 'wP', 'wB', 'wQ'] },
    { id: 15, colour: [1, 0, 0, 1], piece: ['wP', 'wP', 'wK', 'wB'] },
    { id: 16, colour: [1, 0, 0, 1], piece: ['wP', 'wP', 'wN', 'wR'] },
  ],
]

/**
 * Tile id → its top-left square on the 8×8 board. Tile 1 covers a8/b8/a7/b7,
 * so it anchors at (file 0, rank 8). The quadrant within the tile then adds
 * (0,0), (1,0), (0,1), or (1,1) to that anchor. This table replaces the
 * 200-line nested if/else in the original — same outputs, just a lookup.
 */
const TILE_ANCHORS: Record<number, { file: number; rank: number }> = {
  1: { file: 0, rank: 8 },
  2: { file: 2, rank: 8 },
  3: { file: 4, rank: 8 },
  4: { file: 6, rank: 8 },
  5: { file: 0, rank: 6 },
  6: { file: 2, rank: 6 },
  7: { file: 4, rank: 6 },
  8: { file: 6, rank: 6 },
  9: { file: 0, rank: 4 },
  10: { file: 2, rank: 4 },
  11: { file: 4, rank: 4 },
  12: { file: 6, rank: 4 },
  13: { file: 0, rank: 2 },
  14: { file: 2, rank: 2 },
  15: { file: 4, rank: 2 },
  16: { file: 6, rank: 2 },
}

const FILES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

/**
 * Returns the algebraic square name (e.g. "C5") for one of the four
 * quadrants of a tile. Quadrant numbering matches the original:
 *   1 = top-left, 2 = top-right, 3 = bottom-left, 4 = bottom-right.
 */
function getTileTooltip(id: number | null, quadrant: number): string {
  if (id === null) return ''
  const anchor = TILE_ANCHORS[id]
  if (!anchor) return ''
  const dx = quadrant === 1 || quadrant === 3 ? 0 : 1
  const dy = quadrant === 1 || quadrant === 2 ? 0 : 1
  return `${FILES[anchor.file + dx]}${anchor.rank - dy}`
}

interface TileProps {
  tile: Tile
  onClick: () => void
  uniqueKey: string
  tileWidth: number
}

// 1×1 transparent GIF used as a placeholder where a square has no piece.
// Keeps the layout stable without needing a separate empty-cell branch.
const BLANK_IMG =
  'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='

// A single tile in the sliding grid. Each tile shows a 2×2 chunk of the
// chess board: four square cells with optional pieces. Empty slots (id ===
// null) render as a transparent block so the layout stays uniform.
const TileView = ({ tile, onClick, uniqueKey, tileWidth }: TileProps) => {
  const halfTile = tileWidth / 2

  return (
    <div
      style={{
        width: tileWidth,
        height: tileWidth,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: tile.id === null ? 'auto' : 'pointer',
        userSelect: 'none',
        background: 'white',
      }}
      onClick={tile.id !== null ? onClick : undefined}
    >
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', height: '100%' }}
      >
        {[0, 1, 2, 3].map(index => {
          const isDark = tile.colour && tile.colour[index] === 0
          const pieceCode = tile.piece[index]
          const hasPiece = tile.id !== null && pieceCode !== ''
          const pieceSize = halfTile - (tileWidth >= 120 ? 10 : 5)

          return (
            <TooltipProvider key={`${uniqueKey}-${index}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    style={{
                      ...getSquareStyle(tile.id ? isDark : false),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: tile.id ? '0.5px solid black' : 'none',
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    {hasPiece ? (
                      <img
                        src={getPieceImageSrc(pieceCode)}
                        alt={`Piece ${index}`}
                        width={pieceSize}
                        height={pieceSize}
                      />
                    ) : (
                      <img src={BLANK_IMG} alt="" width={pieceSize} height={pieceSize} />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>{getTileTooltip(tile.id, index + 1)}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Chess Slide
 * ---------------
 * 15-puzzle variant where each tile is a 2×2 chunk of a chess board. A
 * random 12-move opening is picked from the ECO dataset, played out into a
 * FEN, and the resulting position is sliced into 16 tiles. One tile is
 * removed to create the empty slot, then the whole grid is shuffled. The
 * player slides tiles into the empty slot to reconstruct the original
 * position. A Check button verifies the arrangement — 15 or more correctly
 * placed tiles counts as a win, otherwise it reports the number of matches.
 */
const ChessSlide = () => {
  // The current 4×4 grid of tiles. Starts at the initial position so
  // there's something to render before the first round loads.
  const [puzzle, setPuzzle] = useState<PuzzleGrid>(initialPuzzle)
  // The selected opening's PGN, used to derive the target FEN.
  const [selectedPgn, setSelectedPgn] = useState<string>('')
  // The opening's name, shown above the puzzle as the goal.
  const [selectedPgnName, setSelectedPgnName] = useState<string>('')
  // Result of the last Check: "Completed" (win), "Incompleted" (partial),
  // or "" (not checked yet).
  const [status, setStatus] = useState<string>('')
  // Count of correctly-placed tiles after the last Check. Only meaningful
  // when status === "Incompleted".
  const [matches, setMatches] = useState<number | undefined>(undefined)

  // Ref + measured width for the puzzle grid. ResizeObserver keeps the
  // tile size in sync with the available column width so the grid scales
  // responsively.
  const leftColumnRef = useRef<HTMLDivElement | null>(null)
  const [gridWidth, setGridWidth] = useState<number>(500)

  /**
   * Plays a PGN string through chess.js and returns the resulting FEN.
   * The PGN is stripped of move numbers and whitespace first so chess.js's
   * loader doesn't choke on formatting.
   */
  function getFen(pgn: string): string {
    const chess = new Chess()
    const cleanPgn = pgn.replace(/\d+\.\s+/g, '')
    const moves = cleanPgn.split(/\s+/).filter(Boolean)
    moves.forEach(move => {
      chess.move(move)
    })
    return chess.fen()
  }

  function getRandomNumber(n: number): number {
    return Math.floor(Math.random() * n)
  }

  /**
   * Parses a FEN into an 8×8 array of piece strings. Empty squares become
   * empty strings; pieces become 2-char codes like "wP" or "bN" so they
   * match the asset filenames in /img/chesspieces/wikipedia/.
   */
  function parseFen(fen: string): string[][] {
    const board: string[][] = []
    const rows = fen.split(' ')[0].split('/')

    for (const row of rows) {
      const newRow: string[] = []
      for (const char of row) {
        if (!isNaN(Number(char))) {
          // Digit → that many empty squares.
          newRow.push(...Array(Number(char)).fill(''))
        } else {
          // FEN uses uppercase for white, lowercase for black; we re-encode
          // as "wP" / "bP" so it matches the piece image naming scheme.
          if (char === char.toUpperCase()) {
            newRow.push(`w${char}`)
          } else {
            newRow.push(`b${char.toLowerCase()}`)
          }
        }
      }
      board.push(newRow)
    }

    return board
  }

  // Fisher-Yates shuffle of a 4×4 grid via a 1D flatten/shuffle/rebuild.
  // Used to scramble the puzzle once the pieces have been placed.
  function shuffle2DArray(arr2D: PuzzleGrid): PuzzleGrid {
    const flatArray = arr2D.flat()

    for (let i = flatArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[flatArray[i], flatArray[j]] = [flatArray[j], flatArray[i]]
    }

    const size = Math.sqrt(flatArray.length)
    const shuffled2DArray: PuzzleGrid = []
    for (let i = 0; i < size; i++) {
      const row: Tile[] = []
      for (let j = 0; j < size; j++) {
        row.push(flatArray[i * size + j])
      }
      shuffled2DArray.push(row)
    }

    return shuffled2DArray
  }

  // Whenever a new PGN is selected, derive the FEN, slice it into 16 tile
  // chunks (each tile is a 2×2 area of the board), blank out one random
  // tile to create the empty slot, then shuffle everything.
  useEffect(() => {
    if (selectedPgn) {
      const fenArray = parseFen(getFen(selectedPgn))
      const newPuzzle: PuzzleGrid = JSON.parse(JSON.stringify(initialPuzzle))

      // Each tile covers two ranks (rowPair) and two files (colPair). The
      // four quadrant pieces come from the matching 2×2 block of the FEN
      // array. This replaces the 16 hand-rolled assignments in the
      // original — same result, one nested loop.
      for (let rowPair = 0; rowPair < 4; rowPair++) {
        for (let colPair = 0; colPair < 4; colPair++) {
          const r = rowPair * 2
          const c = colPair * 2
          newPuzzle[rowPair][colPair].piece = [
            fenArray[r][c],
            fenArray[r][c + 1],
            fenArray[r + 1][c],
            fenArray[r + 1][c + 1],
          ]
        }
      }

      // Note: original used getRandomNumber(3) here which only ever hits
      // rows/cols 0–2 (i.e. never picks tiles in the bottom row or right
      // column). Preserved as-is — flagged in the notes below.
      newPuzzle[getRandomNumber(3)][getRandomNumber(3)].id = null
      const shuffledPuzzle = shuffle2DArray(newPuzzle)
      setPuzzle(shuffledPuzzle)
    }
  }, [selectedPgn])

  /**
   * Starts a new round: picks a 12-move opening at random, sets the name
   * and PGN, and clears any status from the previous round. The puzzle
   * itself gets rebuilt by the effect above when selectedPgn changes.
   */
  const initializePuzzle = useCallback(() => {
    const filteredOpenings = (openings as Opening[]).filter(opening => opening.length === 12)
    const randomIndex = Math.floor(Math.random() * filteredOpenings.length)
    const newSelectedPgn = filteredOpenings[randomIndex]

    setSelectedPgnName(newSelectedPgn.name)
    setSelectedPgn(newSelectedPgn.pgn)
    setStatus('')
    setMatches(undefined)
  }, [])

  /**
   * Verifies the player's arrangement. Counts how many tiles have their
   * id matching the position they occupy (tile 1 in slot 1, tile 2 in
   * slot 2, etc.). 15 or more counts as a win — that's everything except
   * the empty slot, which can't be checked the same way.
   */
  const checkPuzzle = () => {
    const completedPuzzle = [...puzzle]
    let counter = 1
    let correct = 0
    for (let row = 0; row < completedPuzzle.length; row++) {
      for (let col = 0; col < completedPuzzle[row].length; col++) {
        if (completedPuzzle[row][col].id === counter) {
          correct = correct + 1
        }
        counter = counter + 1
      }
    }

    counter = 1

    if (correct >= 15) {
      // Win — write the expected ids back into every tile so the empty
      // slot fills in visually, then flag completion.
      for (let row = 0; row < completedPuzzle.length; row++) {
        for (let col = 0; col < completedPuzzle[row].length; col++) {
          completedPuzzle[row][col] = {
            ...completedPuzzle[row][col],
            id: counter,
          }
          counter = counter + 1
        }
      }
      setPuzzle(completedPuzzle)
      setStatus('Completed')
      return
    }

    setStatus('Incompleted')
    setMatches(correct)
  }

  // Finds the row/col of the empty (id === null) tile. Returns (-1, -1)
  // as a defensive fallback — shouldn't happen since every round blanks
  // exactly one tile.
  const findEmptyTile = (): { row: number; col: number } => {
    for (let row = 0; row < puzzle.length; row++) {
      for (let col = 0; col < puzzle[row].length; col++) {
        if (puzzle[row][col].id === null) {
          return { row, col }
        }
      }
    }
    return { row: -1, col: -1 }
  }

  /**
   * Click handler for a tile. If the clicked tile is orthogonally adjacent
   * to the empty slot, swap them — that's the slide. Diagonal clicks and
   * clicks on non-adjacent tiles are no-ops.
   */
  const handleTileClick = (row: number, col: number) => {
    const { row: emptyRow, col: emptyCol } = findEmptyTile()

    if (
      (row === emptyRow && Math.abs(col - emptyCol) === 1) ||
      (col === emptyCol && Math.abs(row - emptyRow) === 1)
    ) {
      const newPuzzle = [...puzzle]
      const emptyItem = newPuzzle[emptyRow][emptyCol]
      newPuzzle[emptyRow][emptyCol] = newPuzzle[row][col]
      newPuzzle[row][col] = emptyItem
      setPuzzle(newPuzzle)
    }
  }

  // Track the left-column width so the puzzle scales with the viewport.
  // The -50 accounts for padding inside the column.
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect) {
          const newWidth = entry.contentRect.width
          setGridWidth(newWidth)
        }
      }
    })

    if (leftColumnRef.current) {
      observer.observe(leftColumnRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Auto-start a game on mount.
  useEffect(() => {
    initializePuzzle()
  }, [initializePuzzle])

  useEffect(() => {
    document.title = 'Chess Slide'
  }, [])

  return (
    <div className="page-container">
      <h1 className="heading-1">Chess Slide</h1>
      <div className="w-full mt-6">
        {/* Controls row. */}
        <div className="inline-flex flex-wrap items-center gap-2 mb-4">
          <Button onClick={initializePuzzle}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Play
          </Button>
          <Button onClick={checkPuzzle}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Check
          </Button>
        </div>

        {/* Two equal columns at md+, stacked on mobile. Puzzle on the left,
          target info above it; status below. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div ref={leftColumnRef} className="w-full">
            {/* The opening being targeted — name + PGN moves so the player
              knows what board they're trying to reconstruct. */}
            <div id="target" className="mb-4">
              <h2 className="text-xl font-semibold">{selectedPgnName}</h2>
              <p className="text-muted-foreground">{selectedPgn}</p>
            </div>

            {/* The puzzle grid itself. Width is computed from the column so
              tile size scales with the viewport. */}
            <div id="chessboard" className="mb-4" style={{ width: gridWidth }}>
              {puzzle.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                  {row.map((tile, columnIndex) => (
                    <div key={columnIndex} className="flex" style={{ border: '1.5px solid #FFF' }}>
                      <TileView
                        tile={tile}
                        onClick={() => handleTileClick(rowIndex, columnIndex)}
                        uniqueKey={`${rowIndex}-${columnIndex}`}
                        tileWidth={gridWidth / 4}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Status line — only shows after the player clicks Check. */}
            <div>
              <p>
                {status === 'Completed'
                  ? 'Completed!'
                  : status === 'Incompleted'
                    ? `Status: ${matches} correct squares`
                    : ''}
              </p>
            </div>
          </div>

          {/* Right column is empty for now — reserved space for parity with
            the other games' two-column layout. */}
          <div className="w-full" />
        </div>
      </div>
    </div>
  )
}

export default ChessSlide
