import { useState, useEffect, useCallback, useMemo } from 'react'
import { PlayCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { chessterms } from '@/data/chessterms'

// A single chessterm entry (Term, Type, Length, Description, ...). Derived
// from the dataset so the type stays accurate if columns change.
type Chessterm = (typeof chessterms)[number]

// One entry in our chess-notation cipher: a glyph used in place of a letter,
// plus a human-readable explanation shown in a tooltip.
interface ChessSymbolEntry {
  symbol: string
  definition: string
}

/**
 * Cryptograms
 * ---------------
 * Classic cryptogram puzzle with a chess twist. Seven chess terms are picked
 * at random and each letter A–Z is mapped to a chess notation symbol (!!, +,
 * #, ±, ↑, K, R, etc). The player sees the encoded symbols and types the
 * letter they think each symbol represents — solving one symbol fills in
 * every occurrence of it across all seven terms.
 *
 * The player gets 3 hints. Once hints are exhausted, a Quit button appears
 * which reveals the solution (after confirmation).
 */
const Cryptograms = () => {
  // The seven chess terms randomly chosen for this round.
  const [selectedTerms, setSelectedTerms] = useState<Chessterm[]>([])
  // True once a game is in progress (controls when boards/buttons render).
  const [gameStarted, setGameStarted] = useState<boolean>(false)
  // Cipher for the current round: letter -> symbol (e.g. { A: "!!", B: "↑", ... }).
  const [letterMapping, setLetterMapping] = useState<Record<string, string>>({})
  // The player's current guesses: symbol -> letter (e.g. { "!!": "A" }).
  // Keyed by symbol because each input box represents a symbol, not a letter.
  const [guessedLetters, setGuessedLetters] = useState<Record<string, string>>({})
  // Whether the Quit button has been pressed and we're awaiting Confirm/Cancel.
  const [quitConfirmed, setQuitConfirmed] = useState<boolean>(false)
  // Whether all seven terms are now solved (or revealed via quit).
  const [gameCompleted, setGameCompleted] = useState<boolean>(false)
  // Differentiates a real win from a quit-revealed solution (suppresses the
  // "Completed!" banner when the player gave up).
  const [quitGame, setQuitGame] = useState<boolean>(false)
  // The symbol currently focused in an input — used to highlight every other
  // box for the same symbol so players can see the matches at a glance.
  const [focusedLetter, setFocusedLetter] = useState<string>('')
  // Remaining hints in this round (starts at 3).
  const [hintsRemaining, setHintsRemaining] = useState<number>(3)
  // Symbols revealed by hints — locked so the player can't accidentally
  // overwrite a correct hint with a wrong guess.
  const [disabledLetters, setDisabledLetters] = useState<Record<string, boolean>>({})

  // Responsive sizing. inputSize is the px size of each letter box, and
  // termLimit caps how long a randomly-chosen term can be so it fits on
  // narrow screens without wrapping awkwardly.
  const [inputSize, setInputSize] = useState<string>('25px')
  const [termLimit, setTermLimit] = useState<number>(25)

  // Set the browser tab title once on mount.
  useEffect(() => {
    document.title = 'Chess Cryptograms'
  }, [])

  // Watch viewport width and pick a tile size + max term length to match.
  // Breakpoints roughly correspond to Tailwind's md (>=768) and a custom
  // small-tablet threshold (>=450). We listen for resize so rotating a
  // device or resizing a window keeps the layout sensible.
  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth >= 768) {
        setInputSize('40px')
        setTermLimit(25)
      } else if (window.innerWidth >= 450) {
        setInputSize('35px')
        setTermLimit(13)
      } else {
        setInputSize('25px')
        setTermLimit(13)
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    // Clean up to avoid leaking listeners across component unmounts.
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  /**
   * The full chess notation alphabet we can use as cipher symbols. Memoised
   * so the object identity is stable across renders, which keeps
   * `generateRandomMapping` (which depends on it) from being recreated
   * unnecessarily.
   *
   * Symbols come from standard PGN/NAG annotation (move quality, position
   * evaluation, planning glyphs) plus the piece letters (K, Q, R, B, N) and
   * 'X' for capture. There are intentionally fewer symbols than letters in
   * the alphabet — see `generateRandomMapping` for how that's handled.
   */
  const ChessSymbols = useMemo<Record<string, ChessSymbolEntry>>(
    () => ({
      BRILLIANT_MOVE: { symbol: '!!', definition: 'Brilliant move' },
      GOOD_MOVE: { symbol: '!', definition: 'Good move' },
      BAD_MOVE: { symbol: '?', definition: 'Bad move' },
      BLUNDER: { symbol: '??', definition: 'Blunder' },
      INTERESTING_MOVE: { symbol: '!?', definition: 'Interesting move' },
      DUBIOUS_MOVE: { symbol: '?!', definition: 'Dubious move' },
      CHECK: { symbol: '+', definition: 'Check' },
      CHECKMATE: { symbol: '#', definition: 'Checkmate' },
      UNCLEAR_POSITION: { symbol: '∞', definition: 'Unclear position' },
      ADVANTAGE_WHITE: { symbol: '±', definition: 'White has the advantage' },
      ADVANTAGE_BLACK: { symbol: '∓', definition: 'Black has the advantage' },
      BETTER_MOVE: { symbol: '⌓', definition: 'Better move' },
      ONLY_MOVE: { symbol: '□', definition: 'Only move' },
      PLANNED_MOVE: { symbol: 'Δ', definition: 'Planned move' },
      COUNTERS_PLAN: { symbol: '∇', definition: "Counters opponent's plan" },
      INITIATIVE: { symbol: '↑', definition: 'Initiative' },
      ATTACK: { symbol: '→', definition: 'Attack' },
      COUNTERPLAY: { symbol: '⇄', definition: 'Counterplay' },
      SPACE_ADVANTAGE: { symbol: '○', definition: 'Space advantage' },
      ZUGZWANG: { symbol: '⊙', definition: 'Zugzwang' },
      DEVELOPMENT_ADVANTAGE_1: { symbol: '↻', definition: 'Development advantage' },
      DEVELOPMENT_ADVANTAGE_2: { symbol: '↑↑', definition: 'Strong development advantage' },
      EQUAL_POSITION: { symbol: '=', definition: 'Equal position' },
      ROOK: { symbol: 'R', definition: 'Rook' },
      BISHOP: { symbol: 'B', definition: 'Bishop' },
      KING: { symbol: 'K', definition: 'King' },
      QUEEN: { symbol: 'Q', definition: 'Queen' },
      KNIGHT: { symbol: 'N', definition: 'Knight' },
      CAPTURE: { symbol: 'X', definition: 'Capture' },
    }),
    []
  )

  // Characters we render as-is and don't ask the player to decode.
  // Note: spaces are handled separately (as wider gaps between words).
  const isPunctuation = useCallback((char: string): boolean => {
    return /[.,:;!?()'-]/.test(char)
  }, [])

  /**
   * Returns true if every solvable character in `termObj.Term` has been
   * correctly guessed. Spaces and punctuation count as "already solved"
   * since the player never has to type them.
   */
  const isTermCompleted = useCallback(
    (termObj: Chessterm): boolean => {
      return termObj.Term.toUpperCase()
        .split('')
        .every(char => {
          if (char === ' ' || isPunctuation(char)) return true
          // For each real letter, look up the symbol it was encoded as, then
          // check whether the player's guess for that symbol matches the
          // original letter. `|| char` is a defensive fallback if a character
          // somehow has no mapping (shouldn't happen for A–Z).
          const symbol = letterMapping[char] || char
          return guessedLetters[symbol] === char
        })
    },
    [guessedLetters, letterMapping, isPunctuation]
  )

  // True only when *every* selected term is fully solved.
  const areAllTermsCompleted = useCallback((): boolean => {
    return selectedTerms.every(termObj => isTermCompleted(termObj))
  }, [selectedTerms, isTermCompleted])

  // Watch for the win condition after every guess. We also clear the focus
  // highlight so the completed board looks clean.
  useEffect(() => {
    if (gameStarted && selectedTerms.length > 0 && areAllTermsCompleted()) {
      setGameCompleted(true)
      setFocusedLetter('')
    }
  }, [guessedLetters, areAllTermsCompleted, gameStarted, selectedTerms])

  /**
   * Builds a fresh letter -> symbol cipher for a new round.
   *
   * There are 26 letters but only ~29 unique symbols (some letters may even
   * land on the same symbol because we cycle through with modulo). The
   * shuffle + modulo approach is intentionally a loose "cipher" — the puzzle
   * is solvable because we encode by letter and decode by symbol, so even if
   * two letters share a symbol the player only needs to guess that symbol
   * once. (Sharing is unlikely given the symbol count exceeds 26.)
   */
  const generateRandomMapping = useCallback(() => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    const symbols = Object.values(ChessSymbols).map(entry => entry.symbol)

    // Fisher–Yates would be more correct, but `sort(() => 0.5 - Math.random())`
    // is good enough for a casual shuffle here and reads more compactly.
    const shuffledSymbols = [...symbols].sort(() => 0.5 - Math.random())

    const mapping: Record<string, string> = {}
    alphabet.forEach((letter, index) => {
      mapping[letter] = shuffledSymbols[index % shuffledSymbols.length]
    })
    setLetterMapping(mapping)
  }, [ChessSymbols])

  /**
   * Starts a new round: regenerates the cipher, picks 7 random terms that
   * fit the current screen, and resets all round-specific state.
   *
   * "Chess960" is filtered out because it contains digits, which the puzzle
   * doesn't support (the input boxes are A–Z only).
   */
  const handleNewGame = useCallback((): void => {
    generateRandomMapping()
    const filteredTerms = chessterms.filter(
      term => term.Term.length <= termLimit && term.Term !== 'Chess960'
    )
    const shuffled = [...filteredTerms].sort(() => 0.5 - Math.random())
    setSelectedTerms(shuffled.slice(0, 7))
    setGameStarted(true)
    setHintsRemaining(3)
    setGuessedLetters({})
    setQuitConfirmed(false)
    setGameCompleted(false)
    setQuitGame(false)
    setDisabledLetters({})
  }, [termLimit, generateRandomMapping])

  // Auto-start a game on first mount (and any time handleNewGame's deps
  // change, which in practice only happens via responsive termLimit shifts).
  useEffect(() => {
    handleNewGame()
  }, [handleNewGame])

  /**
   * Records a single-character guess for a given symbol. Validation of
   * "is this an A–Z letter" happens at the input's onChange handler; by the
   * time we get here we just trust and store.
   */
  const handleInputChange = (symbol: string, value: string): void => {
    const uppercasedValue = value.toUpperCase()
    if (uppercasedValue.length === 1) {
      setGuessedLetters(prevGuesses => ({
        ...prevGuesses,
        [symbol]: uppercasedValue,
      }))
    }
  }

  // Track which symbol's input is currently focused so we can highlight all
  // sibling boxes that share the same symbol (a common cryptogram UX touch).
  const handleFocus = (symbol: string): void => {
    setFocusedLetter(symbol)
  }

  const handleBlur = (): void => {
    setFocusedLetter('')
  }

  // Reverse lookup: from a symbol back to its English description for the
  // tooltip. Linear scan, but the symbol table is small.
  const getSymbolDefinition = (symbol: string): string => {
    const entry = Object.values(ChessSymbols).find(e => e.symbol === symbol)
    return entry ? entry.definition : ''
  }

  /**
   * Picks a random un-guessed letter from anywhere in the puzzle and reveals
   * its symbol-to-letter mapping for free. The revealed symbol is also
   * locked (disabled) so the player can't overwrite it with a wrong guess.
   */
  const handleHint = (): void => {
    const availableLetters = selectedTerms
      .flatMap(termObj => termObj.Term.toUpperCase().split(''))
      .filter(char => !isPunctuation(char) && char !== ' ')
      // Drop anything already correctly filled in — no point hinting it.
      .filter(char => !guessedLetters[letterMapping[char]])

    if (availableLetters.length > 0 && hintsRemaining > 0) {
      const randomLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)]

      setGuessedLetters(prev => ({
        ...prev,
        [letterMapping[randomLetter]]: randomLetter,
      }))
      setDisabledLetters(prev => ({
        ...prev,
        [letterMapping[randomLetter]]: true,
      }))

      setHintsRemaining(hintsRemaining - 1)
    }
  }

  // Two-step quit: handleQuit shows the Confirm/Cancel pair, then
  // confirmQuit actually reveals everything. This guards against accidental
  // taps on the Quit button (which appears in the same place as other buttons).
  const handleQuit = (): void => {
    setQuitConfirmed(true)
  }

  /**
   * Reveals every correct letter at once by filling in `guessedLetters`
   * with the inverse of `letterMapping`. Marks the game as completed via
   * `quitGame` so we know to suppress the celebratory "Completed!" banner.
   */
  const confirmQuit = (): void => {
    const correctLetters: Record<string, string> = {}
    selectedTerms.forEach(termObj => {
      termObj.Term.toUpperCase()
        .split('')
        .forEach(char => {
          if (!isPunctuation(char) && char !== ' ') {
            correctLetters[letterMapping[char]] = char
          }
        })
    })
    setGuessedLetters(correctLetters)
    setQuitConfirmed(false)
    setGameCompleted(true)
    setQuitGame(true)
  }

  const cancelQuit = (): void => {
    setQuitConfirmed(false)
  }

  return (
    <div className="page-container">
      <h1 className="heading-1">Cryptogram</h1>

      <div className="mt-6 flex flex-col gap-4">
        {/* Controls row. The visible buttons shift through three states:
              1. Play + Hints (while hints remain)
              2. Play + Quit  (after hints run out)
              3. Confirm + Cancel (when Quit is pressed)
        */}
        <div className="flex items-center gap-2 flex-wrap w-fit">
          <Button onClick={handleNewGame}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Play
          </Button>

          {!quitConfirmed && hintsRemaining > 0 && (
            <Button onClick={handleHint} disabled={!gameStarted || gameCompleted}>
              Hints ({hintsRemaining})
            </Button>
          )}

          {!quitConfirmed && hintsRemaining === 0 && (
            <Button
              variant="destructive"
              onClick={handleQuit}
              disabled={!gameStarted || gameCompleted}
            >
              Quit
            </Button>
          )}

          {quitConfirmed && (
            <>
              <Button variant="secondary" onClick={confirmQuit}>
                Confirm
              </Button>
              <Button onClick={cancelQuit}>Cancel</Button>
            </>
          )}
        </div>

        {/* Win banner — only when the player genuinely solved everything,
            not when they quit to reveal the answers. */}
        {gameCompleted && gameStarted && !quitGame && (
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle2 className="text-green-600 h-5 w-5" />
            <p>Completed!</p>
          </div>
        )}

        {/* The puzzle board. TooltipProvider wraps the whole thing so any
            symbol can show its plain-English meaning on hover. */}
        {gameStarted && (
          <TooltipProvider>
            <div className="pt-2">
              {selectedTerms.map((termObj, index) => (
                <div key={index} className="mb-4">
                  <div className="flex items-center">
                    <div className="flex justify-start flex-wrap">
                      {termObj.Term.toUpperCase()
                        .split('')
                        .map((char, i) => {
                          // Per character: figure out which symbol it maps
                          // to (or just use the char itself for non-letters).
                          const symbol = letterMapping[char] || char

                          if (char === ' ') {
                            // Word break: a narrow vertical spacer to keep
                            // baseline alignment with the letter boxes.
                            return (
                              <div
                                key={i}
                                style={{ width: '10px', height: inputSize, marginBottom: '8px' }}
                              />
                            )
                          } else if (isPunctuation(char)) {
                            // Punctuation rendered as-is, no input box,
                            // sized to match the letter columns above.
                            return (
                              <div key={i} className="flex flex-col text-center justify-end">
                                <div
                                  className="flex justify-center items-center font-bold bg-transparent"
                                  style={{
                                    width: '10px',
                                    height: inputSize,
                                  }}
                                >
                                  {char}
                                </div>
                              </div>
                            )
                          } else {
                            // The interesting case: a real letter. We show
                            // the encoded symbol on top (with a tooltip
                            // explaining what it means in chess notation)
                            // and an input box below for the player's guess.
                            return (
                              <div key={i} className="text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="flex justify-center items-center bg-card shadow rounded"
                                      style={{
                                        width: inputSize,
                                        height: inputSize,
                                        marginBottom: '8px',
                                      }}
                                    >
                                      {symbol}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>{getSymbolDefinition(symbol)}</TooltipContent>
                                </Tooltip>
                                <input
                                  type="text"
                                  maxLength={1}
                                  className="text-center font-bold border border-border text-foreground"
                                  style={{
                                    width: inputSize,
                                    height: inputSize,
                                    // Highlight every input box bound to the
                                    // currently-focused symbol so the player
                                    // can see all sibling occurrences.
                                    backgroundColor:
                                      symbol === focusedLetter
                                        ? 'rgba(239, 68, 68, 0.1)'
                                        : 'transparent',
                                  }}
                                  value={guessedLetters[symbol] || ''}
                                  onFocus={() => handleFocus(symbol)}
                                  onBlur={handleBlur}
                                  onChange={e => {
                                    // Input validation lives here rather
                                    // than in handleInputChange so we can
                                    // distinguish "cleared the box" (allowed)
                                    // from "typed garbage" (ignored).
                                    const value = e.target.value.toUpperCase()
                                    if (value === '') {
                                      setGuessedLetters(prevGuesses => ({
                                        ...prevGuesses,
                                        [symbol]: '',
                                      }))
                                    } else if (value.length === 1 && /^[A-Z]$/.test(value)) {
                                      handleInputChange(symbol, value)
                                    }
                                  }}
                                  // Disable when the puzzle is over OR when
                                  // this symbol was revealed by a hint.
                                  disabled={gameCompleted || disabledLetters[symbol]}
                                />
                              </div>
                            )
                          }
                        })}
                    </div>

                    {/* Per-term tick that appears as soon as that single
                        term is fully decoded, even before the whole puzzle
                        is done — nice incremental feedback. */}
                    {!gameCompleted && isTermCompleted(termObj) && (
                      <CheckCircle2 className="text-green-600 h-5 w-5 ml-2" />
                    )}
                  </div>

                  {/* When the game ends, show the description for each
                      term so the player learns what they've just decoded. */}
                  {gameCompleted && (
                    <div className="max-w-2xl mt-2">
                      <p className="text-muted-foreground text-sm">{termObj.Description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}

export default Cryptograms
