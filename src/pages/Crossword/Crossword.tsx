import { ChangeEvent, useState, useEffect, useCallback } from 'react'
import { PlayCircle, RotateCcw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { chessterms } from '@/data/chessterms'

import { processCrossword, CrosswordResult } from './crosswordGenerator'

// A single chessterm entry. Derived from the dataset so the type stays
// accurate if columns change.
type Chessterm = (typeof chessterms)[number]

// Map of "row-col" → uppercased letter the player has typed. Sparse —
// only filled cells have entries.
type UserInput = Record<string, string>

/**
 * Crossword
 * ---------------
 * Chess-themed crossword. Words are picked from the chess terms dataset
 * across three size buckets (3 large, 5 medium, 12 small) and the
 * generator interlocks them into a single connected grid. Hints are the
 * dataset's `Description` field with the term itself blanked out by
 * underscores, so the player has to deduce the word from context.
 *
 * Once the player solves it (or quits), the full descriptions are
 * revealed, letting the puzzle double as a chess-vocabulary primer.
 */
function Crossword() {
  // Output of the crossword generator: grid dimensions + a list of
  // placed words (each with start coords + direction + custom number).
  // Null until the first round is generated.
  const [crosswordData, setCrosswordData] = useState<CrosswordResult | null>(null)
  // The Chessterm entries that ended up in the grid. Kept in parallel
  // with crosswordData so we can look up the dataset description from a
  // placed word's Key.
  const [selectedTerms, setSelectedTerms] = useState<Chessterm[]>([])
  // Mobile flag — crossword is keyboard/mouse-only, so we warn on phones.
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false)
  // Player's input, keyed by "row-col". Sparse map — empty cells have
  // no entry rather than an empty string.
  const [userInput, setUserInput] = useState<UserInput>({})
  // True once the player checks the grid and every cell matches the
  // expected letter. Drives the success banner and reveals full hints.
  const [completed, setCompleted] = useState<boolean>(false)
  // Briefly shown after a failed Check. Auto-clears after 3 seconds.
  const [showIncorrectAlert, setShowIncorrectAlert] = useState<boolean>(false)
  // Two-step quit confirmation. Shows Confirm/Cancel pair when true.
  const [quitPrompt, setQuitPrompt] = useState<boolean>(false)
  // True once the player has quit (which auto-fills the grid). Tracked
  // separately from `completed` so we can suppress the success banner.
  const [quitCompleted, setQuitCompleted] = useState<boolean>(false)
  // True after the first round is generated. Gates the Quit button.
  const [gameStarted, setGameStarted] = useState<boolean>(false)

  // Set the browser tab title once on mount.
  useEffect(() => {
    document.title = 'Crossword'
  }, [])

  // Fisher-Yates would be more correct, but for a casual shuffle this
  // is enough.
  const shuffleArray = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5)

  // Watch viewport width and flip the small-screen flag.
  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth <= 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Picks `count` random words from the dataset that fall within the
  // [minLen, maxLen] range. Used to build the three size buckets below.
  const selectWordsByLength = useCallback(
    (terms: Chessterm[], count: number, minLen: number, maxLen?: number): Chessterm[] => {
      const filteredTerms = terms.filter(
        term => term.Length >= minLen && (!maxLen || term.Length <= maxLen)
      )
      return shuffleArray(filteredTerms).slice(0, count)
    },
    []
  )

  // Pulls 3 large + 5 medium + 12 small words, in that order. The
  // generator places the longest words first (more anchors for the
  // shorter words to interlock with) so order matters here.
  const selectWords = useCallback(
    (terms: Chessterm[]): Chessterm[] => {
      const largeWords = selectWordsByLength(terms, 3, 10, 12)
      const mediumWords = selectWordsByLength(terms, 5, 6, 9)
      const smallWords = selectWordsByLength(terms, 12, 4, 6)
      return [...largeWords, ...mediumWords, ...smallWords]
    },
    [selectWordsByLength]
  )

  // Blanks out the term and key inside a description by replacing them
  // with underscores of the same length. Case-insensitive so it catches
  // both "Sicilian" and "sicilian" inside the description text.
  const replaceTermWithUnderscores = (description: string, term: string, key: string): string => {
    const termRegex = new RegExp(term, 'gi')
    const keyRegex = new RegExp(key, 'gi')
    return description
      .replace(termRegex, match => '_'.repeat(match.length))
      .replace(keyRegex, match => '_'.repeat(match.length))
  }

  // Returns just the first two sentences of a description, so hints
  // don't drone on. Falls back to the full description if the regex
  // can't find two sentence-enders.
  const getFirstSentences = (description: string): string => {
    const match = description.match(/(.*?[.?!])\s(.*?[.?!])\s/)
    return match ? `${match[1]} ${match[2]}` : description
  }

  // Re-numbers the generator's words so they read top-left to
  // bottom-right (across-then-down), matching standard crossword
  // numbering convention.
  const numberWords = (positionObjArr: CrosswordResult['positionObjArr']) => {
    return positionObjArr
      .map((wordObj, index) => ({ ...wordObj, index }))
      .sort((a, b) => {
        if (a.yNum === b.yNum) {
          return a.xNum - b.xNum
        }
        return a.yNum - b.yNum
      })
      .map((wordObj, sortedIndex) => ({
        ...wordObj,
        customNumber: sortedIndex + 1,
      }))
  }

  // Builds a new round: picks words, runs the generator, applies our
  // custom numbering, and clears per-round state.
  const generateCrossword = useCallback(() => {
    const selected = selectWords(chessterms as Chessterm[])
    setSelectedTerms(selected)
    const words = selected.map(term => term.Key)
    const result = processCrossword(words)

    if (result) {
      result.positionObjArr = numberWords(result.positionObjArr)
    }

    setCrosswordData(result || null)
    setUserInput({})
    setCompleted(false)
    setQuitCompleted(false)
    setGameStarted(true)
  }, [selectWords])

  // Resets the player's inputs without picking new words — same puzzle,
  // fresh attempt. Different from Play, which generates a new grid.
  const handleReset = () => {
    setUserInput({})
  }

  // Captures a single letter into the user-input map. Always uppercases
  // so the win-check comparison doesn't need to care about case.
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>, row: number, col: number) => {
    const { value } = event.target
    setUserInput(prevInput => ({
      ...prevInput,
      [`${row}-${col}`]: value.toUpperCase(),
    }))
  }

  // Verifies every cell of every placed word matches the player's
  // input. Flashes a 3-second incorrect alert on failure; sets the
  // completed flag on success.
  const checkCrossword = (): boolean => {
    if (!crosswordData) return false

    const isCorrect = crosswordData.positionObjArr.every(wordObj => {
      const { wordStr, xNum, yNum, isHorizon } = wordObj
      for (let i = 0; i < wordStr.length; i++) {
        const letter = wordStr[i]
        const key = isHorizon ? `${yNum}-${xNum + i}` : `${yNum + i}-${xNum}`
        if (userInput[key] !== letter.toUpperCase()) {
          return false
        }
      }
      return true
    })

    setCompleted(isCorrect)
    if (!isCorrect) {
      setShowIncorrectAlert(true)
      setTimeout(() => setShowIncorrectAlert(false), 3000)
    }
    return isCorrect
  }

  const handleQuit = () => {
    setQuitPrompt(true)
  }

  // Two-step quit confirmation: handleQuit shows the Confirm/Cancel
  // pair, then this fills in every cell with the correct letter so the
  // player can see the solution.
  const handleConfirmQuit = () => {
    if (crosswordData) {
      const filledInput: UserInput = {}
      crosswordData.positionObjArr.forEach(wordObj => {
        const { wordStr, xNum, yNum, isHorizon } = wordObj
        for (let i = 0; i < wordStr.length; i++) {
          const key = isHorizon ? `${yNum}-${xNum + i}` : `${yNum + i}-${xNum}`
          filledInput[key] = wordStr[i].toUpperCase()
        }
      })
      setUserInput(filledInput)
      setCompleted(false)
      setQuitCompleted(true)
      setQuitPrompt(false)
    }
  }

  const handleCancelQuit = () => {
    setQuitPrompt(false)
  }

  // Auto-start a game on mount.
  useEffect(() => {
    generateCrossword()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Builds the visible grid from the generator's positionObjArr. Each
  // placed word writes its letters into a cell, and the first letter of
  // each word also gets the custom number so the hints can reference it.
  const renderCrossword = () => {
    if (!crosswordData) return null

    type Cell = { letter: string; number?: number } | null

    const grid: Cell[][] = Array(crosswordData.height)
      .fill(null)
      .map(() => Array(crosswordData.width).fill(null))

    crosswordData.positionObjArr.forEach(wordObj => {
      const { wordStr, xNum, yNum, isHorizon, customNumber } = wordObj
      if (isHorizon) {
        grid[yNum][xNum] = { number: customNumber, letter: wordStr[0] }
        for (let i = 1; i < wordStr.length; i++) {
          grid[yNum][xNum + i] = { letter: wordStr[i] }
        }
      } else {
        grid[yNum][xNum] = { number: customNumber, letter: wordStr[0] }
        for (let i = 1; i < wordStr.length; i++) {
          grid[yNum + i][xNum] = { letter: wordStr[i] }
        }
      }
    })

    return (
      <div id="crossword" className="pt-2">
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {row.map((cell, cellIndex) => (
              <div
                key={cellIndex}
                className="relative m-px flex items-center justify-center"
                style={{
                  width: '40px',
                  height: '40px',
                  border: cell ? '0.25px solid rgba(0, 0, 0, 0.5)' : 'none',
                }}
              >
                {cell?.number !== undefined && (
                  <span className="absolute top-0 left-[3px] text-[10px]">{cell.number}</span>
                )}
                {cell && (
                  <Input
                    maxLength={1}
                    autoComplete="off"
                    value={userInput[`${rowIndex}-${cellIndex}`] || ''}
                    onChange={event => handleInputChange(event, rowIndex, cellIndex)}
                    className="w-full h-full text-center text-base font-bold border-0 p-0 focus-visible:ring-0"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  // Splits placed words into across vs down hint lists. Hints are
  // either full descriptions (post-game) or blanked-out previews
  // (mid-game) so the player has to deduce the word.
  const renderHints = () => {
    if (!crosswordData) return null

    const acrossHints: React.ReactNode[] = []
    const downHints: React.ReactNode[] = []

    crosswordData.positionObjArr.forEach(wordObj => {
      const { wordStr, isHorizon, customNumber } = wordObj
      const term = selectedTerms.find(t => t.Key === wordStr)
      if (!term) return

      const hint =
        completed || quitCompleted
          ? term.Description
          : replaceTermWithUnderscores(getFirstSentences(term.Description), term.Term, term.Key)

      const entry = (
        <p key={customNumber} className="pt-2">
          {customNumber}. ({term.Key.length}) {hint}
        </p>
      )

      if (isHorizon) {
        acrossHints.push(entry)
      } else {
        downHints.push(entry)
      }
    })

    return (
      <div className="flex flex-col md:flex-row flex-wrap mt-4">
        <div id="across" className="w-[90%] md:w-[45%] mb-4 md:mb-0 p-2">
          <h2 className="text-lg font-semibold">Across</h2>
          {acrossHints}
        </div>
        <div id="down" className="w-[90%] md:w-[45%] mb-4 md:mb-0 p-2">
          <h2 className="text-lg font-semibold">Down</h2>
          {downHints}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <h1 className="heading-1">Crossword</h1>
      <div className="w-full mt-6">
        {/* Mobile warning — the puzzle has 40px cells and requires typing
          into them, which doesn't work well on touch. */}
        {isSmallScreen && (
          <div className="flex items-start gap-2 mb-5 p-4 rounded bg-red-500 text-white">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Mobile not supported</p>
              <p className="text-sm">Crossword works best on a desktop with a keyboard.</p>
            </div>
          </div>
        )}

        {/* Controls row. Quit toggles between Quit and Confirm/Cancel
          buttons to guard against accidental clicks. */}
        <div id="controls" className="inline-flex flex-wrap items-center gap-2 mb-4">
          <Button onClick={generateCrossword}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Play
          </Button>
          <Button variant="secondary" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button variant="secondary" onClick={checkCrossword}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Check
          </Button>

          {quitPrompt ? (
            <>
              <Button variant="secondary" onClick={handleConfirmQuit}>
                Confirm
              </Button>
              <Button onClick={handleCancelQuit}>Cancel</Button>
            </>
          ) : (
            <Button
              variant="destructive"
              onClick={handleQuit}
              disabled={!gameStarted || completed || quitCompleted}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Quit
            </Button>
          )}
        </div>

        {/* Feedback banners. The incorrect one auto-clears after 3s; the
          success one stays as long as completed is true. */}
        {showIncorrectAlert && (
          <div className="flex items-center gap-2 mt-2 mb-2 p-3 rounded bg-red-100 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <span>The crossword is not yet complete.</span>
          </div>
        )}
        {completed && !quitCompleted && (
          <div className="flex items-center gap-2 mt-2 mb-2 p-3 rounded bg-green-100 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span>Completed!</span>
          </div>
        )}

        {crosswordData && renderCrossword()}
        {crosswordData && renderHints()}
      </div>
    </div>
  )
}

export default Crossword
