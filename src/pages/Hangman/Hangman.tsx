import { useState, useRef, useEffect, useCallback, KeyboardEvent, ChangeEvent } from 'react'
import { PlayCircle, Eye, XCircle, CheckCircle, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { chessterms } from '@/data/chessterms'

// A single chessterm entry (Term, Type, Length, Description, ...). Derived
// from the dataset so the type stays accurate if columns change.
type Chessterm = (typeof chessterms)[number]

// Type codes used in the dataset to categorise terms. Drives the hint label.
type TermType = Chessterm['Type']

/**
 * Hangman
 * ---------------
 * Chess-themed hangman. A random chess term, player name, engine, or opening
 * (anything 8+ characters long) is picked from the dataset and the player
 * guesses one letter at a time. Five wrong guesses ends the game; a Hint
 * button reveals the category and unlocks a Quit option for graceful
 * surrender. The dataset's Description is shown after the game ends so the
 * player learns what the term meant.
 */
function Hangman() {
  // The full dataset entry currently being guessed (used for the post-game
  // term + description reveal).
  const [selectedPhrase, setSelectedPhrase] = useState<Chessterm | undefined>(undefined)
  // The selected term split into an array of characters. Spaces and
  // punctuation are kept in-place so the board layout matches the term.
  const [selectedPhraseArray, setSelectedPhraseArray] = useState<string[]>([])
  // Uppercase letters the player has guessed so far (right or wrong).
  const [userLetters, setUserLetters] = useState<string[]>([])
  // The letter currently typed into the guess input (before clicking Guess).
  const [letter, setLetter] = useState<string>('')
  // True once the round has ended — either solved or five strikes/quit.
  const [isCompleted, setIsCompleted] = useState<boolean>(false)
  // Distinguishes win from loss for the post-game banner. Null until decided.
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  // Keeps focus in the guess input after each submission for fast typing.
  const letterGuessRef = useRef<HTMLInputElement>(null)
  // True once at least one game has been started — gates the whole play UI.
  const [firstGame, setFirstGame] = useState<boolean>(false)
  // Whether the hint line ("Chess Player" etc.) is visible.
  const [showHint, setShowHint] = useState<boolean>(false)
  // The hint text, derived from the term's Type field when a round starts.
  const [hint, setHint] = useState<string>('')
  // Number of wrong guesses in this round. Reaches 5 → game over.
  const [errorCount, setErrorCount] = useState<number>(0)
  // Hint → Quit toggle. Once the player uses a hint, the Hint button is
  // replaced with a Quit button (a small penalty for asking for help).
  const [showGiveUp, setShowGiveUp] = useState<boolean>(false)
  // True while a round is in progress — controls whether action buttons
  // are enabled.
  const [gameStarted, setGameStarted] = useState<boolean>(false)

  const getRandomNumber = (n: number): number => Math.floor(Math.random() * n)

  /**
   * Starts a new round: picks a random term that's at least 8 characters
   * long (anything shorter is too easy), sets up the hint label based on
   * the term's type code, and clears all per-round state.
   *
   * Type codes from the dataset:
   *   T → Chess Term
   *   P / W → Chess Player (W presumably "World Champion" or similar)
   *   E → Chess Engine
   *   O → Chess Opening
   */
  const handleNewGame = useCallback(async () => {
    const filteredChessterms = (chessterms as Chessterm[]).filter(term => term.Length >= 8)
    const randomNumber = getRandomNumber(filteredChessterms.length)
    const newSelectedPhrase = filteredChessterms[randomNumber]
    setSelectedPhrase(newSelectedPhrase)

    const type = newSelectedPhrase.Type as TermType
    if (type === 'T') {
      setHint('Chess Term')
    } else if (type === 'P' || type === 'W') {
      setHint('Chess Player')
    } else if (type === 'E') {
      setHint('Chess Engine')
    } else if (type === 'O') {
      setHint('Chess Opening')
    }

    setSelectedPhraseArray(newSelectedPhrase.Term.toUpperCase().split(''))
    setIsCompleted(false)
    setShowHint(false)
    setFirstGame(true)
    setShowGiveUp(false)
    setGameStarted(true)
    setUserLetters([])
    setErrorCount(0)
    setIsCorrect(false)
  }, [])

  /**
   * Submits the current letter as a guess. Increments the error counter if
   * the letter isn't in the term (and ends the game at 5 strikes), adds it
   * to the guessed-letters list, and checks whether the player has won.
   *
   * We deliberately use the functional setState form for errorCount + the
   * post-update completion check, because the win condition depends on the
   * *new* letters array — calling checkIfCompleted with the stale state
   * would lag by one guess.
   */
  const handleAddLetter = () => {
    if (letter && !userLetters.includes(letter)) {
      if (!selectedPhraseArray.includes(letter.toUpperCase())) {
        setErrorCount(prevCount => {
          const newCount = prevCount + 1
          if (newCount === 5) {
            setIsCompleted(true)
            setIsCorrect(false)
          }
          return newCount
        })
      }

      setUserLetters(prevUserLetters => {
        const newUserLetters = [...prevUserLetters, letter.toUpperCase()]

        if (checkIfCompleted(newUserLetters)) {
          setIsCompleted(true)
          setIsCorrect(true)
        }

        return newUserLetters
      })

      setLetter('')
      if (letterGuessRef.current) {
        letterGuessRef.current.focus()
      }
    }
  }

  /**
   * Returns true if every alphanumeric character of the term has been
   * guessed. Strips out spaces, punctuation, and anything else before
   * comparing — the player only ever has to guess A–Z, 0–9.
   */
  const checkIfCompleted = (userLetters: string[]): boolean => {
    const cleanedSelectedPhraseArray = selectedPhraseArray
      .map(char => char.toUpperCase().replace(/[^A-Z0-9]/g, ''))
      .join('')
      .split('')

    return cleanedSelectedPhraseArray.every(char => userLetters.includes(char))
  }

  // Reveals the hint label and swaps the Hint button for Quit.
  const handleShowHint = () => {
    setShowHint(true)
    setShowGiveUp(true)
  }

  // Concedes the round. Same end-state as five strikes but reached
  // intentionally rather than by exhausting guesses.
  const handleGiveUp = () => {
    setIsCompleted(true)
    setIsCorrect(false)
  }

  // Auto-start a game on mount.
  useEffect(() => {
    handleNewGame()
  }, [handleNewGame])

  useEffect(() => {
    document.title = 'Hangman'
  }, [])

  // Submit on Enter so the player can guess letter-after-letter from the
  // keyboard without reaching for the mouse.
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddLetter()
    }
  }

  // Only accept a single uppercase A–Z character. We uppercase on the way
  // in so the comparison logic elsewhere doesn't have to worry about case.
  const onLetterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase()
    if (value.length <= 1 && /^[A-Z]*$/.test(value)) {
      setLetter(value)
    }
  }

  return (
    <div className="page-container">
      <h1 className="heading-1">Hangman</h1>
      <div className="w-full mt-6">
        {/* Controls row: Play is always present; the second slot toggles
          between Hint (before hint is used) and Quit (after). */}
        <div id="controls" className="flex items-center gap-2 mb-2 w-fit">
          <Button onClick={handleNewGame}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Play
          </Button>

          {!showGiveUp && (
            <Button onClick={handleShowHint} disabled={!gameStarted}>
              <Eye className="mr-2 h-4 w-4" />
              Hint
            </Button>
          )}
          {showGiveUp && (
            <Button onClick={handleGiveUp} disabled={!gameStarted}>
              <XCircle className="mr-2 h-4 w-4" />
              Quit
            </Button>
          )}
        </div>

        {/* Hint label, shown only after the player explicitly asked. */}
        {showHint && (
          <p className="m-0">
            <i>Hint: {hint}</i>
          </p>
        )}

        {/* Full game body only renders once a round has been started. */}
        {firstGame && (
          <div className="mt-2 w-full">
            {/* Hangman image + miss counter. Image swaps based on errorCount
              (hangman0.png through hangman5.png). */}
            <div id="image" className="flex items-center my-6">
              <img
                src={`/img/hangman/hangman${errorCount}.png`}
                alt={`Hangman stage ${errorCount}`}
                className="w-[120px] mr-2"
              />
              <p>
                <b>{errorCount}</b> failed guesses
                <br /> out of 5
              </p>
            </div>

            {/* The term's letter slots. Each character is either a space
              (rendered as a wider gap so word breaks read naturally) or a
              tile — empty until the player guesses that letter. Non-letter
              characters (digits, punctuation) are revealed for free. */}
            <div id="letters" className="flex flex-row flex-wrap gap-4 mt-2 w-full">
              {selectedPhraseArray.length > 0 &&
                selectedPhraseArray.map((word, wordIndex) => (
                  <div key={wordIndex} className="flex gap-1 min-h-[27px]">
                    {word.split('').map((char, charIndex) => (
                      <span key={charIndex}>
                        {char === ' ' ? (
                          <span className="inline-block w-[35px]">&nbsp;</span>
                        ) : (
                          <div className="text-center min-w-[35px] min-h-[35px] h-[35px] leading-[35px] bg-card text-card-foreground shadow rounded">
                            {/[A-Za-z]/.test(char)
                              ? userLetters.includes(char.toUpperCase())
                                ? char.toUpperCase()
                                : ''
                              : char}
                          </div>
                        )}
                      </span>
                    ))}
                  </div>
                ))}
            </div>

            {/* Guess row: previously-typed letters as plain text, then the
              single-character input + Guess button. The input is hidden
              once the round is over. */}
            <div id="guesses" className="flex flex-wrap items-center gap-2 mt-8 w-full">
              {userLetters.map((l, index) => (
                <span key={index} className="w-5 text-center">
                  {l}
                </span>
              ))}
              {!isCompleted && (
                <Input
                  ref={letterGuessRef}
                  value={letter}
                  onChange={onLetterChange}
                  onKeyDown={onKeyDown}
                  maxLength={1}
                  autoComplete="off"
                  className="w-[35px] text-center px-1"
                />
              )}
              <Button onClick={handleAddLetter} disabled={isCompleted}>
                Guess
              </Button>
            </div>

            {/* Post-game banner: win/loss icon + label, the full term, and
              the dataset's description so the player learns what they
              were (or weren't) guessing. */}
            {isCompleted && (
              <>
                <div className="flex items-center mt-4">
                  {isCorrect ? (
                    <CheckCircle className="text-green-600 mr-2 h-8 w-8" />
                  ) : (
                    <AlertCircle className="text-red-600 mr-2 h-8 w-8" />
                  )}
                  <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                </div>
                <h2 className="text-xl font-semibold mt-2">{selectedPhrase?.Term}</h2>
                <p className="max-w-[600px] text-muted-foreground">{selectedPhrase?.Description}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Hangman
