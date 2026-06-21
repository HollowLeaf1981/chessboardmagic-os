import { useState, useEffect, useCallback, useRef } from 'react'
import { PlayCircle, RotateCcw, CheckCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { chessterms } from '@/data/chessterms'

import './Wordsearch.css'

// A single chessterm entry. Derived from the dataset so the type stays
// accurate if columns change.
type Chessterm = (typeof chessterms)[number]

// One cell of the wordsearch grid. `letter` is the displayed character,
// `selected` is true while the player is dragging across it, and `found`
// is a wordIndex+1 once the cell belongs to a found word (0 if not).
// Using a 1-indexed found counter means we can mod by 10 to cycle through
// ten distinct found-color CSS classes.
interface Cell {
  letter: string
  selected: boolean
  found: number
}

type Grid = Cell[][]

// Per-word tracking record. `word` is the uppercase key the player needs
// to spell out; `found` is 0 until the word is located, then it gets the
// same wordIndex+1 used in the grid cells so they share a colour band.
interface FoundWord {
  word: string
  found: number
}

interface Coords {
  row: number
  col: number
}

/**
 * Wordsearch
 * ---------------
 * Classic wordsearch puzzle with chess terms hidden in a 20×20 grid of
 * random letters. The player click-drags (or finger-drags on touch) across
 * a straight line (horizontal, vertical, or diagonal) to mark a word; if
 * the dragged path spells one of the target words, the cells lock into a
 * found state with a colour band and the word's definition appears in the
 * side panel.
 *
 * Words are split into small (≤5), medium (≤10), and large (<20) buckets
 * with fixed counts per bucket (4/5/1), so each round has a similar mix of
 * easy and hard targets. Placement uses eight directions (4 cardinal + 4
 * diagonal) with up to 50 attempts per word before giving up — the empty
 * grid is large enough that this practically never fails. Remaining empty
 * cells are filled with random A–Z noise.
 */
function Wordsearch() {
  // The square the player started a drag on, or null if no drag is active.
  const [clickedSquare, setClickedSquare] = useState<Coords | null>(null)
  // The square the player is currently hovering over during a drag.
  // Stored so handleMouseUp can compute the dragged line without needing
  // the mouse-up coordinates.
  const [currentSquare, setCurrentSquare] = useState<Coords | null>(null)
  // The string of letters along the currently-dragged line. Compared
  // against the target words on mouse-up.
  const [selectedString, setSelectedString] = useState<string>('')
  // The list of target words for this round + their found state.
  const [foundWords, setFoundWords] = useState<FoundWord[]>([])
  // Display info for the most-recently-found word — name, category label,
  // and the dataset's description. Drives the side panel.
  const [foundWordName, setFoundWordName] = useState<string>('')
  const [foundWordDefinition, setFoundWordDefinition] = useState<string>('')
  const [foundWordType, setFoundWordType] = useState<string>('')

  // Fixed-for-now configuration. Kept as state so they could be made
  // user-configurable later without refactoring.
  const [type] = useState<string>('A')
  const [boardSize] = useState<number>(20)
  const customWords = ''

  const wordsearchRef = useRef<HTMLDivElement | null>(null)
  const [cellSize, setCellSize] = useState<number>(25)

  const MIN_CELL_SIZE = 26 // tap-target floor; below this touch gets unreliable

  useEffect(() => {
    if (!wordsearchRef.current) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          const computed = entry.contentRect.width / boardSize
          setCellSize(Math.max(MIN_CELL_SIZE, computed))
        }
      }
    })
    observer.observe(wordsearchRef.current)
    return () => observer.disconnect()
  }, [boardSize])

  const createEmptyGrid = useCallback((rows: number, cols: number): Grid => {
    const grid: Grid = []
    for (let i = 0; i < rows; i++) {
      const row: Cell[] = []
      for (let j = 0; j < cols; j++) {
        row.push({
          letter: '',
          selected: false,
          found: 0,
        })
      }
      grid.push(row)
    }
    return grid
  }, [])

  const [grid, setGrid] = useState<Grid>(createEmptyGrid(boardSize, boardSize))

  // How many target words of each size to pick per round. The split
  // matches what the original used.
  const smallWordCount = 4
  const mediumWordCount = 5
  const largeWordCount = 1

  // Incrementing counter used as both the cell `found` value and the
  // word's `found` value, so they share a colour (counter % 10 indexes
  // the .found-N CSS classes).
  const [foundWordCounter, setFoundWordCounter] = useState<number>(0)
  // True once every target word has been found.
  const [gameCompleted, setGameCompleted] = useState<boolean>(false)
  // True until the first game is generated. The empty grid that exists
  // before then shouldn't be rendered.
  const [firstGame, setFirstGame] = useState<boolean>(true)

  useEffect(() => {
    document.title = 'Wordsearch'
  }, [])

  const generateRandomLetter = useCallback((): string => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const randomIndex = Math.floor(Math.random() * alphabet.length)
    return alphabet[randomIndex]
  }, [])

  const getRandomInt = useCallback((min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }, [])

  // Returns `count` distinct integers from [min, max] via a shuffle-and-
  // slice. Used to pick target words without repeats within a size bucket.
  const getRandomUniqueNumbers = useCallback(
    (min: number, max: number, count: number): number[] => {
      if (count === 0) return []
      const result = Array.from({ length: max - min + 1 }, (_, i) => i + min)
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[result[i], result[j]] = [result[j], result[i]]
      }
      return result.slice(0, count)
    },
    []
  )

  // Mouse-down on a cell: start a drag, capture the origin, and seed the
  // selected string with the first letter.
  function handleMouseDown(row: number, col: number) {
    if (row >= 0 && row < grid.length && col >= 0 && col < grid[row].length) {
      const newGrid = [...grid]
      clearHighlighting(newGrid)
      setSelectedString(newGrid[row][col].letter)
      newGrid[row][col].selected = true
      setGrid(newGrid)
      setClickedSquare({ row, col })
    }
  }

  // Mouse-up anywhere: end the drag. If the selected string matches any
  // unfound target word, lock in the line, populate the side panel from
  // the dataset, and check for round completion.
  function handleMouseUp() {
    setClickedSquare(null)

    const updatedFoundWords = foundWords.map(wordObj => {
      if (selectedString.toUpperCase() === wordObj.word) {
        setFoundGrid()
        if (customWords.length === 0) {
          const foundItem = chessterms.find(term => selectedString.toUpperCase() === term.Key)
          if (foundItem) {
            setFoundWordName(foundItem.Term)
            setFoundWordDefinition(foundItem.Description)
            setFoundWordType(getWordType(foundItem.Type))
          }
        } else {
          setFoundWordName(selectedString)
          setFoundWordType('Custom')
          setFoundWordDefinition('')
        }
        return { ...wordObj, found: foundWordCounter + 1 }
      }
      return wordObj
    })

    setFoundWords(updatedFoundWords)
    if (areAllWordsFound(updatedFoundWords)) {
      setGameCompleted(true)
    }
  }

  const areAllWordsFound = (foundWords: FoundWord[]): boolean => {
    return foundWords.every(word => word.found > 0)
  }

  // Locks the dragged line into the grid by marking every cell along it
  // with the current `foundWordCounter + 1`. Direction is derived from the
  // delta between drag origin and current square; non-straight drags fall
  // back to just the origin cell.
  function setFoundGrid() {
    if (!clickedSquare || !currentSquare) return
    const newGrid = [...grid]
    const { row, col } = currentSquare
    const rowDiff = row - clickedSquare.row
    const colDiff = col - clickedSquare.col
    clearHighlighting(newGrid)

    if (rowDiff === 0 && colDiff !== 0) {
      // Horizontal
      const colIncrement = colDiff > 0 ? 1 : -1
      for (let j = clickedSquare.col; j !== col; j += colIncrement) {
        newGrid[row][j].found = foundWordCounter + 1
      }
    } else if (colDiff === 0 && rowDiff !== 0) {
      // Vertical
      const rowIncrement = rowDiff > 0 ? 1 : -1
      for (let i = clickedSquare.row; i !== row; i += rowIncrement) {
        newGrid[i][col].found = foundWordCounter + 1
      }
    } else if (Math.abs(rowDiff) === Math.abs(colDiff)) {
      // Diagonal
      const rowDirection = rowDiff > 0 ? 1 : -1
      const colDirection = colDiff > 0 ? 1 : -1
      let i = clickedSquare.row
      let j = clickedSquare.col
      while (i !== row && j !== col) {
        newGrid[i][j].found = foundWordCounter + 1
        i += rowDirection
        j += colDirection
      }
    } else {
      // Drag wasn't straight — bail out.
      setSelectedString('')
      clearHighlighting(newGrid)
      newGrid[clickedSquare.row][clickedSquare.col].found = foundWordCounter + 1
      setGrid(newGrid)
      return
    }

    newGrid[row][col].found = foundWordCounter + 1
    setGrid(newGrid)
    setFoundWordCounter(foundWordCounter + 1)
  }

  // Mouse-enter on a cell during a drag: redraw the selected line from
  // the drag origin to this cell. Mirrors setFoundGrid's geometry but
  // uses the `selected` flag for live highlighting instead of `found`.
  function handleMouseEnter(row: number, col: number) {
    setCurrentSquare({ row, col })
    if (clickedSquare) {
      const newGrid = [...grid]
      let letters = ''
      const rowDiff = row - clickedSquare.row
      const colDiff = col - clickedSquare.col

      clearHighlighting(newGrid)

      if (rowDiff === 0 && colDiff !== 0) {
        const colIncrement = colDiff > 0 ? 1 : -1
        for (let j = clickedSquare.col; j !== col; j += colIncrement) {
          newGrid[row][j].selected = true
          letters += newGrid[row][j].letter
        }
      } else if (colDiff === 0 && rowDiff !== 0) {
        const rowIncrement = rowDiff > 0 ? 1 : -1
        for (let i = clickedSquare.row; i !== row; i += rowIncrement) {
          newGrid[i][col].selected = true
          letters += newGrid[i][col].letter
        }
      } else if (Math.abs(rowDiff) === Math.abs(colDiff)) {
        const rowDirection = rowDiff > 0 ? 1 : -1
        const colDirection = colDiff > 0 ? 1 : -1
        let i = clickedSquare.row
        let j = clickedSquare.col
        while (i !== row && j !== col) {
          newGrid[i][j].selected = true
          letters += newGrid[i][j].letter
          i += rowDirection
          j += colDirection
        }
      } else {
        setSelectedString('')
        clearHighlighting(newGrid)
        newGrid[clickedSquare.row][clickedSquare.col].selected = true
        setGrid(newGrid)
        return
      }

      newGrid[row][col].selected = true
      letters += newGrid[row][col].letter
      setGrid(newGrid)
      setSelectedString(letters)
    }
  }

  // Touch equivalents. Touch events fire on the *originating* element,
  // not the element under the finger, so for touchmove we use
  // elementFromPoint to find which cell the finger is currently over
  // and reuse the mouse handlers' logic.
  function handleTouchStart(row: number, col: number) {
    handleMouseDown(row, col)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!clickedSquare) return
    const touch = e.touches[0]
    const element = document.elementFromPoint(touch.clientX, touch.clientY)
    const td = element?.closest('td[data-row][data-col]') as HTMLElement | null
    if (td) {
      const row = parseInt(td.dataset.row!, 10)
      const col = parseInt(td.dataset.col!, 10)
      handleMouseEnter(row, col)
    }
  }

  function handleTouchEnd() {
    handleMouseUp()
  }

  // Clears the in-progress drag highlight on every cell. Doesn't touch
  // `found` — that's permanent until the round resets.
  function clearHighlighting(newGrid: Grid) {
    for (let i = 0; i < newGrid.length; i++) {
      for (let j = 0; j < newGrid[i].length; j++) {
        newGrid[i][j].selected = false
      }
    }
  }

  // Resets the round without picking new words — clears all found-state
  // from the grid and word list so the player can re-attempt the same
  // puzzle. Different from "Play", which generates a fresh grid + words.
  function resetGame() {
    setFoundWordName('')
    setFoundWordDefinition('')
    setFoundWordType('')
    setFoundWordCounter(0)
    setGameCompleted(false)
    const updatedFoundWords = foundWords.map(wordObj => ({
      ...wordObj,
      found: 0,
    }))
    setFoundWords(updatedFoundWords)

    const newGrid = grid.map(row =>
      row.map(cell => ({
        ...cell,
        found: 0,
      }))
    )
    setGrid(newGrid)
  }

  // Sorts the chessterms dataset into three size buckets so we can pick a
  // fixed number from each — gives every round a consistent mix of easy
  // and hard words. Custom-word mode bypasses the dataset entirely and
  // treats the comma-separated input as the full word list.
  const categorizeWords = useCallback((): [Chessterm[], Chessterm[], Chessterm[]] => {
    const smallWords: Chessterm[] = []
    const mediumWords: Chessterm[] = []
    const largeWords: Chessterm[] = []

    let filteredTerms: Chessterm[] =
      type !== 'A'
        ? (chessterms as Chessterm[]).filter(
            term => term.Type === type && parseInt(String(term.Length), 10) <= boardSize
          )
        : (chessterms as Chessterm[]).filter(term => parseInt(String(term.Length), 10) <= boardSize)

    if (customWords.length > 0) {
      filteredTerms = customWords.split(',').map(item => ({
        Term: item,
        Key: item.replace(/\s/g, '').toUpperCase(),
        Length: item.length,
        Type: 'T',
        Description: 'N/A',
      })) as unknown as Chessterm[]
    }

    filteredTerms.forEach(term => {
      if (term.Length <= 5) smallWords.push(term)
      else if (term.Length <= 10) mediumWords.push(term)
      else if (term.Length < 20) largeWords.push(term)
    })

    return [smallWords, mediumWords, largeWords]
  }, [type, boardSize, customWords])

  // Picks N words from each size bucket without repeats. Falls back to
  // however many words exist if a bucket has fewer than the requested
  // count (getRandomUniqueNumbers handles that naturally).
  const selectRandomWords = useCallback(
    (smallWords: Chessterm[], mediumWords: Chessterm[], largeWords: Chessterm[]): Chessterm[] => {
      const selectedWords: Chessterm[] = []

      const addWords = (words: Chessterm[], count: number) => {
        const randomIndices = getRandomUniqueNumbers(0, words.length - 1, count)
        randomIndices.forEach(index => selectedWords.push(words[index]))
      }

      addWords(smallWords, smallWordCount)
      addWords(mediumWords, mediumWordCount)
      addWords(largeWords, largeWordCount)

      return selectedWords
    },
    [getRandomUniqueNumbers]
  )

  // Places each target word in the grid. Tries up to 50 random
  // direction+position combos per word; bails out if it can't find a
  // valid spot, which is rare on a 20×20 grid with only 10 words.
  const placeWordsInGrid = useCallback(
    (grid: Grid, wordList: Chessterm[]) => {
      wordList.forEach(wordObj => {
        let isValidPlacement = false
        let attempts = 0

        do {
          if (attempts > 50) break

          // 8 directions: 0/1 horizontal (right/left), 2/3 vertical
          // (down/up), 4–7 the four diagonals. Each pair of arrays gives
          // the row/col delta per step for that direction.
          const direction = Math.floor(Math.random() * 8)
          const rowIncrement = [0, 0, 1, -1, 1, 1, -1, -1]
          const colIncrement = [1, -1, 0, 0, 1, -1, -1, 1]
          let rowPosition: number
          let colPosition: number

          // Pick a starting cell that leaves room for the whole word in
          // the chosen direction. Each branch clamps the random range so
          // we don't run off the edge.
          if (direction === 0) {
            rowPosition = getRandomInt(0, boardSize - 1)
            colPosition = getRandomInt(0, boardSize - wordObj.Length - 1)
          } else if (direction === 1) {
            rowPosition = getRandomInt(0, boardSize - 1)
            colPosition = getRandomInt(wordObj.Length - 1, boardSize - 1)
          } else if (direction === 2) {
            rowPosition = getRandomInt(0, boardSize - wordObj.Length)
            colPosition = getRandomInt(0, boardSize - 1)
          } else if (direction === 3) {
            rowPosition = getRandomInt(wordObj.Length - 1, boardSize - 1)
            colPosition = getRandomInt(0, boardSize - 1)
          } else if (direction === 4) {
            rowPosition = getRandomInt(0, boardSize - wordObj.Length - 1)
            colPosition = getRandomInt(0, boardSize - wordObj.Length - 1)
          } else if (direction === 5) {
            rowPosition = getRandomInt(0, boardSize - wordObj.Length - 1)
            colPosition = getRandomInt(wordObj.Length - 1, boardSize - 1)
          } else if (direction === 6) {
            rowPosition = getRandomInt(wordObj.Length - 1, boardSize - 1)
            colPosition = getRandomInt(wordObj.Length - 1, boardSize - 1)
          } else {
            rowPosition = getRandomInt(wordObj.Length - 1, boardSize - 1)
            colPosition = getRandomInt(0, boardSize - wordObj.Length)
          }

          // Validate every cell along the proposed path is empty.
          for (let j = 0; j < wordObj.Length; j++) {
            if (
              grid[rowPosition + j * rowIncrement[direction]][
                colPosition + j * colIncrement[direction]
              ].letter !== ''
            ) {
              isValidPlacement = false
              attempts++
              break
            } else {
              isValidPlacement = true
            }
          }

          // Path is clear — write the letters in.
          if (isValidPlacement) {
            for (let j = 0; j < wordObj.Length; j++) {
              grid[rowPosition + j * rowIncrement[direction]][
                colPosition + j * colIncrement[direction]
              ].letter = wordObj.Key[j]
            }
            break
          }
        } while (!isValidPlacement)
      })
    },
    [boardSize, getRandomInt]
  )

  // Fills every empty cell with a random A–Z letter, so target words
  // blend into the noise.
  const fillEmptySpaces = useCallback(
    (grid: Grid) => {
      for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
          if (grid[i][j].letter === '') {
            grid[i][j].letter = generateRandomLetter()
          }
        }
      }
    },
    [generateRandomLetter]
  )

  // Generates a brand-new round: empty grid → categorise dataset → pick
  // words → place them → fill noise → reset all per-round state.
  const newGame = useCallback(() => {
    const grid = createEmptyGrid(boardSize, boardSize)
    const [smallWords, mediumWords, largeWords] = categorizeWords()
    const selectedWords = selectRandomWords(smallWords, mediumWords, largeWords)

    placeWordsInGrid(grid, selectedWords)
    fillEmptySpaces(grid)

    setFoundWordName('')
    setFoundWordDefinition('')
    setFoundWordType('')
    setGameCompleted(false)
    setFirstGame(false)
    setFoundWords(selectedWords.map(word => ({ word: word.Key, found: 0 })))
    setGrid(grid)
  }, [
    boardSize,
    createEmptyGrid,
    categorizeWords,
    selectRandomWords,
    placeWordsInGrid,
    fillEmptySpaces,
  ])

  // Maps the dataset's Type code into a display label for the side panel.
  // Same code mapping used by Hangman: T = term, P/W = player, etc.
  function getWordType(type: string): string {
    switch (type) {
      case 'O':
        return 'Chess Opening'
      case 'P':
      case 'W':
        return 'Chess Player'
      case 'E':
        return 'Chess Engine'
      default:
        return 'Chess Term'
    }
  }

  // Cancels native drag behaviour on the table so the browser's text-
  // selection cursor doesn't fight the word-selection drag.
  function preventDefaultDrag(event: React.DragEvent<HTMLTableElement>) {
    event.preventDefault()
  }

  // Auto-start a game on mount.
  useEffect(() => {
    newGame()
  }, [newGame])

  return (
    <div className="page-container">
      <h1 className="heading-1">Wordsearch</h1>
      <div className="w-full mt-6">
        {/* Controls row: Play (new round) and Reset (re-attempt same round). */}
        <div id="controls" className="flex items-center gap-2 mb-4 w-fit">
          <Button onClick={newGame}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Play
          </Button>
          <Button variant="secondary" onClick={resetGame}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {!firstGame && (
            <div className="flex flex-col lg:flex-row gap-4 w-full md:col-span-2">
              <div
                ref={wordsearchRef}
                id="wordsearch"
                className="w-full max-w-[550px] lg:flex-1 min-w-0"
              >
                <div className="grid-table w-full">
                  <table
                    onDragStart={preventDefaultDrag}
                    draggable={false}
                    style={{ tableLayout: 'fixed', width: '100%' }}
                  >
                    <tbody>
                      {grid.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, colIndex) => (
                            <td
                              key={colIndex}
                              data-row={rowIndex}
                              data-col={colIndex}
                              onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                              onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                              onMouseUp={handleMouseUp}
                              onTouchStart={() => handleTouchStart(rowIndex, colIndex)}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={handleTouchEnd}
                              className={`cell ${
                                cell.selected
                                  ? 'selected'
                                  : cell.found
                                    ? `found-${cell.found % 10}`
                                    : ''
                              }`}
                              style={{
                                padding: 0,
                                width: `${cellSize}px`,
                                height: `${cellSize}px`,
                                lineHeight: `${cellSize}px`,
                                fontSize: `${Math.max(10, cellSize * 0.55)}px`,
                                textAlign: 'center',
                                touchAction: 'none',
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                WebkitTouchCallout: 'none',
                              }}
                            >
                              {cell.letter}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col lg:flex-1 lg:min-w-0">
                {gameCompleted && (
                  <div className="flex items-center pl-2 mb-2">
                    <CheckCircle className="text-green-600 mr-1 h-8 w-8" />
                    <p>Completed!</p>
                  </div>
                )}

                <div id="words" className="p-2 break-words overflow-y-auto flex flex-col">
                  <div>
                    {foundWords.map((item, index) => (
                      <span
                        key={index}
                        className={`${item.found !== 0 ? 'strikethrough' : ''} mr-2 inline-block break-words`}
                      >
                        {item.word}
                      </span>
                    ))}
                  </div>
                </div>

                <div id="description" className="pl-2 mt-2">
                  <p className="text-sm">{foundWordType}</p>
                  <h2 className="text-xl font-semibold">{foundWordName}</h2>
                  <p className="text-muted-foreground">{foundWordDefinition}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Wordsearch
