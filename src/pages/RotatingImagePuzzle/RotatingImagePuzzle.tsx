import { useState, useEffect, useCallback, useRef } from 'react'
import { PlayCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

import { chessterms } from '@/data/chessterms'

// A single chessterm entry. Derived from the dataset so the type stays
// accurate if columns change.
type Chessterm = (typeof chessterms)[number]

/**
 * Rotating Image Puzzle
 * ---------------
 * Twist on the classic jigsaw — a portrait of a chess player is sliced into
 * an N×N grid and each piece is rotated by a random multiple of 90°. The
 * player clicks each piece to rotate it clockwise; the puzzle is solved
 * when every piece is back at 0° (mod 360). Once solved, the grid collapses
 * into a single seamless image and the player's name + description appear
 * in the adjacent column.
 *
 * Grid size is selectable (3×3 up to 10×10) and there's a "lock on correct"
 * option that prevents accidentally rotating away from a correctly-aligned
 * piece — useful at larger grid sizes where the puzzle gets noisy.
 */
const RotatingImagePuzzle = () => {
  // Side length of the puzzle grid. The puzzle has gridSize² tiles.
  const [gridSize, setGridSize] = useState<number>(5)
  // Current rotation in degrees for each tile, indexed left-to-right, top-
  // to-bottom. Values accumulate (90, 180, 270, 360, 450, ...) so we use
  // `% 360` to check correctness — keeps the visual rotation smooth.
  const [rotation, setRotation] = useState<number[]>([])
  // True once every tile is back at a multiple of 360°. Drives the
  // grid-to-single-image collapse.
  const [isSolved, setIsSolved] = useState<boolean>(false)
  // True once the puzzle has been solved this round. Drives the reveal
  // panel and is separate from isSolved so it doesn't get reset mid-game.
  const [completed, setCompleted] = useState<boolean>(false)
  // The full dataset entry for the player being puzzled. Used for the
  // post-game name + description reveal.
  const [selectedPlayer, setSelectedPlayer] = useState<Chessterm | null>(null)
  // The src for the portrait image, built from the player's Key.
  const [imageName, setImageName] = useState<string>('')
  // "Lock on correct" mode: once a tile lands at 0° (mod 360), further
  // clicks on it are ignored. Helps at larger grid sizes.
  const [lockedOnCorrect, setLockedOnCorrect] = useState<boolean>(false)
  // Player name and description, captured at solve time. Stored separately
  // from selectedPlayer so the reveal panel doesn't change if a new game
  // starts while the player is still reading.
  const [playerTerm, setPlayerTerm] = useState<string>('')
  const [playerDescription, setPlayerDescription] = useState<string>('')

  // Ref + measured tile size. We use a ResizeObserver to compute the tile
  // size from the actual container width so each piece's background-size
  // can be set in pixels — that's how we get the slicing effect: every
  // tile shows the full image, just offset and rotated.
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [tileSize, setTileSize] = useState<number>(0)

  // Recompute tile size whenever the container resizes or the grid size
  // changes. Tile size = container width / gridSize. The cleanup disconnects
  // the observer to avoid leaking listeners across remounts.
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          const width = entry.contentRect.width
          setTileSize(width / gridSize)
        }
      }
    })

    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [imageName, gridSize])

  // Returns true when every tile's rotation is at a multiple of 360°. The
  // rotation values accumulate (so a tile rotated four times reads 360),
  // hence the modulo rather than a strict === 0 check.
  const checkIfSolved = useCallback((): boolean => {
    let allSolved = true

    rotation.forEach(angle => {
      const isPieceSolved = angle % 360 === 0
      if (!isPieceSolved) {
        allSolved = false
      }
    })

    return allSolved
  }, [rotation])

  // Called once when the puzzle is solved. Snapshots the player's Term and
  // Description so the reveal panel stays stable even if state changes.
  const handleSolved = useCallback(() => {
    if (selectedPlayer) {
      setPlayerTerm(selectedPlayer.Term)
      setPlayerDescription(selectedPlayer.Description)
    }
    setCompleted(true)
  }, [selectedPlayer])

  // Watch the rotation array — when it becomes all-aligned, flip both
  // solved flags. checkIfSolved is in the dep array so this re-runs on
  // every rotation change without us needing to call it manually.
  useEffect(() => {
    if (rotation.length > 0 && checkIfSolved()) {
      setIsSolved(true)
      handleSolved()
    }
  }, [rotation, checkIfSolved, handleSolved])

  /**
   * Starts a new round: picks a random player-type entry, resets the
   * reveal panel, and builds a fresh rotations array where each tile gets
   * a random rotation from {0°, 90°, 180°, 270°}.
   *
   * Note: 0° is included in the random pool, so occasionally a tile starts
   * already correct. That's intentional — matches the original behaviour.
   */
  const handleNewGame = useCallback(() => {
    setCompleted(false)
    setPlayerTerm('')
    setPlayerDescription('')
    setIsSolved(false)

    const chessPlayers = (chessterms as Chessterm[]).filter(
      term => term.Type === 'P' || term.Type === 'W'
    )
    const randomNumber = Math.floor(Math.random() * chessPlayers.length)
    const newSelectedChessPlayer = chessPlayers[randomNumber]

    setImageName(`/img/players/${newSelectedChessPlayer.Key}.png`)
    setSelectedPlayer(newSelectedChessPlayer)

    const randomized = Array(gridSize * gridSize)
      .fill(0)
      .map(() => Math.floor(Math.random() * 4) * 90)
    setRotation(randomized)
  }, [gridSize])

  // Rotates a single tile by 90° clockwise. In "lock on correct" mode,
  // tiles already at 0° (mod 360) ignore the click.
  const rotatePiece = (index: number) => {
    if (lockedOnCorrect && rotation[index] % 360 === 0) {
      return
    }
    const newRotation = [...rotation]
    newRotation[index] = newRotation[index] + 90
    setRotation(newRotation)
  }

  // Restart the game whenever grid size changes (which also covers the
  // initial mount). handleNewGame's only dep is gridSize, so this is
  // effectively a "run on gridSize change" effect.
  useEffect(() => {
    handleNewGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSize])

  useEffect(() => {
    document.title = 'Rotating Image Puzzle'
  }, [])

  return (
    <div className="page-container">
      <h1 className="heading-1">Rotating Image Puzzle</h1>
      <div className="w-full mt-6">
        {/* Controls row: Play + the two select dropdowns for lock mode and
          grid size. Wrapped in flex-wrap so it stacks on narrow screens. */}
        <div id="newGame" className="flex items-end flex-wrap gap-2 mb-4">
          <Button onClick={handleNewGame}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Play
          </Button>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">Lock on correct</Label>
            <Select
              value={lockedOnCorrect.toString()}
              onValueChange={value => setLockedOnCorrect(value === 'true')}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">No</SelectItem>
                <SelectItem value="true">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">Grid size</Label>
            <Select
              value={gridSize.toString()}
              onValueChange={value => setGridSize(parseInt(value))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 4, 5, 6, 7, 8, 9, 10].map(size => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} x {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Two equal columns at md+, stacked on mobile. Puzzle on the left,
          reveal panel (once solved) on the right. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="w-full">
            {imageName && (
              <div
                ref={containerRef}
                style={{
                  // When solved we swap from a grid to a single block-level
                  // image, which is why this is inline-styled rather than
                  // Tailwind classes — the layout actually changes.
                  display: isSolved ? 'block' : 'grid',
                  gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                  gap: isSolved ? '0px' : '2px',
                  width: '100%',
                  margin: '0',
                  textAlign: 'left',
                  justifyContent: 'start',
                }}
              >
                {isSolved ? (
                  <img
                    src={imageName}
                    alt="Rotated puzzle solution"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      margin: '0',
                    }}
                  />
                ) : (
                  // Each tile renders the full source image as its
                  // background, sized to gridSize × tileSize, then offset
                  // by its (x, y) position. That gives the slicing effect
                  // without ever actually cropping the image — and means
                  // rotation just spins the tile while the background
                  // stays put.
                  Array.from({ length: gridSize * gridSize }).map((_, index) => {
                    const x = (index % gridSize) * tileSize
                    const y = Math.floor(index / gridSize) * tileSize

                    return (
                      <div
                        key={index}
                        className="puzzle-piece"
                        onClick={() => rotatePiece(index)}
                        style={{
                          width: `${tileSize}px`,
                          height: `${tileSize}px`,
                          backgroundImage: `url(${imageName})`,
                          backgroundSize: `${tileSize * gridSize}px ${tileSize * gridSize}px`,
                          backgroundPosition: `-${x}px -${y}px`,
                          transform: `rotate(${rotation[index]}deg)`,
                          transition: 'transform 0.3s ease',
                          cursor:
                            rotation[index] % 360 === 0 && lockedOnCorrect ? 'default' : 'pointer',
                          border: isSolved ? 'none' : '1px solid transparent',
                        }}
                      />
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Reveal column — name + description, snapshotted at solve time
            so it stays stable even if a new game is started. */}
          <div className="w-full">
            {completed && (
              <div>
                <h2 className="text-xl font-semibold mb-2">{playerTerm}</h2>
                <p className="text-muted-foreground">{playerDescription}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RotatingImagePuzzle
