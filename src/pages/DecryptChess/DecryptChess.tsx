import { useState, useEffect, useCallback } from 'react'
import { PlayCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { chessterms } from '@/data/chessterms'

// One entry from the chessterms dataset (Term, Type, Description, ...).
// Inferred from the data so the type stays in sync if columns change.
type Chessterm = (typeof chessterms)[number]

// Fixed reference alphabet used for both encryption and the on-screen
// letter buttons. Hoisted to module scope so we don't recreate the array
// on every render.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/**
 * DecryptChess
 * ----------------
 * A substitution-cipher puzzle. The page picks a random chess term and its
 * description, then applies a random A–Z permutation to encrypt both. The
 * player solves it by clicking pairs of letters in the A–Z bar to swap
 * every occurrence of those two letters throughout the ciphertext.
 *
 * When the encrypted term + description exactly equal the original, the
 * puzzle is solved.
 */
const DecryptChess = () => {
  // The original (plaintext) term we're trying to recover.
  const [selectedTerm, setSelectedTerm] = useState<Chessterm | null>(null)
  // The current state of the ciphertext (mutates as the player swaps letters).
  const [encryptedTerm, setEncryptedTerm] = useState<Chessterm | null>(null)
  // True once a round is in progress.
  const [gameStarted, setGameStarted] = useState<boolean>(false)
  // Whether the player has confirmed quitting (reveals the solution).
  const [quitConfirmed, setQuitConfirmed] = useState<boolean>(false)
  // Whether the encrypted text now matches the plaintext (puzzle solved).
  const [gameCompleted, setGameCompleted] = useState<boolean>(false)
  // Distinguishes "solved by play" from "revealed by quit" so we can
  // suppress the celebratory banner in the latter case.
  const [quitGame, setQuitGame] = useState<boolean>(false)
  // The single-letter Type code from the dataset (T/P/O/E/W) once a hint
  // has been requested. Empty string when no hint is active.
  const [hint, setHint] = useState<string>('')

  // Visibility flags for the control buttons. These get toggled through a
  // small state machine: Hint -> Quit -> (Confirm + Cancel).
  const [showHintButton, setShowHintButton] = useState<boolean>(true)
  const [showQuitButton, setShowQuitButton] = useState<boolean>(false)
  const [showConfirmButtons, setShowConfirmButtons] = useState<boolean>(false)
  // The first letter the player has clicked in a swap pair, or null if
  // we're waiting for the first click of a new pair.
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)

  // Set the browser tab title once on mount.
  useEffect(() => {
    document.title = 'Decrypt Chess'
  }, [])

  /**
   * Starts a new round.
   *
   * Builds a random A–Z permutation, picks a random term, applies the
   * permutation to both the term and its description (preserving the
   * original casing of each character), and resets all round-level state.
   *
   * "Chess960" is filtered out because the digits in it would survive the
   * cipher unchanged and give the answer away.
   */
  const handleNewGame = useCallback((): void => {
    // Quick-and-dirty shuffle. Not cryptographically uniform but plenty
    // random enough for a casual puzzle.
    const shuffledAlphabet = [...ALPHABET].sort(() => 0.5 - Math.random())

    // Build the plaintext -> ciphertext mapping for this round.
    const letterMapping: Record<string, string> = {}
    ALPHABET.forEach((letter, index) => {
      letterMapping[letter] = shuffledAlphabet[index]
    })

    const filteredTerms = chessterms.filter(term => term.Term !== 'Chess960')
    const randomIndex = Math.floor(Math.random() * filteredTerms.length)
    const randomTerm = filteredTerms[randomIndex]

    setSelectedTerm(randomTerm)

    // Apply the mapping to a string while preserving original case so
    // capitalised words remain capitalised in the ciphertext (a useful
    // structural hint for the player).
    const applyMapping = (text: string): string => {
      return text
        .split('')
        .map(char => {
          const upperChar = char.toUpperCase()
          if (letterMapping[upperChar]) {
            const mappedChar = letterMapping[upperChar]
            return char === char.toUpperCase() ? mappedChar : mappedChar.toLowerCase()
          }
          // Non-letters (spaces, punctuation, digits) pass through untouched.
          return char
        })
        .join('')
    }

    const newEncryptedTerm = applyMapping(randomTerm.Term)
    const newEncryptedDescription = applyMapping(randomTerm.Description)

    // We keep the same shape as a Chessterm so the rest of the UI can use
    // it interchangeably with the plaintext version.
    setEncryptedTerm({
      ...randomTerm,
      Term: newEncryptedTerm,
      Description: newEncryptedDescription,
    })

    // Reset round-level state.
    setGameStarted(true)
    setQuitConfirmed(false)
    setGameCompleted(false)
    setQuitGame(false)
    setHint('')
    setShowHintButton(true)
    setShowQuitButton(false)
    setShowConfirmButtons(false)
    setSelectedLetter(null)
  }, [])

  // Auto-start the first round on mount.
  useEffect(() => {
    handleNewGame()
  }, [handleNewGame])

  /**
   * Reveals the category hint and switches the Hint button out for Quit —
   * once a player asks for help we assume they'd rather have an escape
   * hatch than another hint.
   */
  const handleHint = (): void => {
    if (!selectedTerm) return
    setHint(selectedTerm.Type)
    setShowHintButton(false)
    setShowQuitButton(true)
  }

  // Two-step quit flow: clicking Quit shows Confirm/Cancel instead of
  // immediately revealing the answer, to guard against accidental clicks.
  const handleQuit = (): void => {
    setShowQuitButton(false)
    setShowConfirmButtons(true)
  }

  /**
   * Confirms the quit: reveals the plaintext (by flipping the view in the
   * render below to show selectedTerm rather than encryptedTerm) and marks
   * the round as ended via quit so the win banner is suppressed.
   */
  const confirmQuit = (): void => {
    setQuitConfirmed(true)
    setShowConfirmButtons(false)
    setShowHintButton(true)
    setQuitGame(true)
  }

  const cancelQuit = (): void => {
    setShowConfirmButtons(false)
    setShowQuitButton(true)
  }

  /**
   * Pure helper that returns `text` with every occurrence of `letter1`
   * replaced by `letter2` and vice versa, preserving each character's
   * original case. We have to swap both directions in a single pass
   * (rather than two sequential replaces) or the second replace would
   * undo the first.
   */
  const swapLettersInString = (text: string, letter1: string, letter2: string): string => {
    return text
      .split('')
      .map(char => {
        if (char.toLowerCase() === letter1.toLowerCase()) {
          return char === char.toUpperCase() ? letter2.toUpperCase() : letter2.toLowerCase()
        }
        if (char.toLowerCase() === letter2.toLowerCase()) {
          return char === char.toUpperCase() ? letter1.toUpperCase() : letter1.toLowerCase()
        }
        return char
      })
      .join('')
  }

  /**
   * Applies a letter swap to the encrypted term + description, and checks
   * whether that swap solved the puzzle. The win check has to happen
   * inside the setEncryptedTerm updater so it sees the freshly-computed
   * values rather than the stale `encryptedTerm` from closure.
   */
  const swapLettersInEncryptedTerm = (letter1: string, letter2: string): void => {
    setEncryptedTerm(prevEncryptedTerm => {
      if (!prevEncryptedTerm || !selectedTerm) return prevEncryptedTerm

      const updatedTerm = swapLettersInString(prevEncryptedTerm.Term, letter1, letter2)
      const updatedDescription = swapLettersInString(
        prevEncryptedTerm.Description,
        letter1,
        letter2
      )

      // Strict equality of both fields against the original = solved.
      if (updatedTerm === selectedTerm.Term && updatedDescription === selectedTerm.Description) {
        setGameCompleted(true)
      }

      return {
        ...prevEncryptedTerm,
        Term: updatedTerm,
        Description: updatedDescription,
      }
    })
  }

  /**
   * Click handler for the A–Z buttons. Implements a two-tap pairing UI:
   *  - First click: arm that letter (highlight it).
   *  - Click the same letter again: cancel the pairing.
   *  - Click a different letter: perform the swap and reset.
   */
  const handleLetterClick = (letter: string): void => {
    if (selectedLetter === null) {
      setSelectedLetter(letter)
    } else if (selectedLetter === letter) {
      setSelectedLetter(null)
    } else {
      swapLettersInEncryptedTerm(selectedLetter, letter)
      setSelectedLetter(null)
    }
  }

  // Translate the dataset's single-letter Type code into a human-readable
  // category label shown alongside the puzzle as a hint.
  const getHintLabel = (hintCode: string): string => {
    switch (hintCode) {
      case 'T':
        return 'Term'
      case 'P':
        return 'Player'
      case 'O':
        return 'Opening'
      case 'E':
        return 'Engine'
      case 'W':
        return 'World Champion'
      default:
        return ''
    }
  }

  return (
    <div className="page-container">
      <h1 className="heading-1">Decrypt Chess</h1>

      <div className="mt-6 flex flex-col gap-4">
        {/* Controls. Three mutually-exclusive states:
              1. Play + Hint (default during play)
              2. Play + Quit (after a hint has been used)
              3. Play + Confirm + Cancel (after Quit was clicked)
        */}
        <div className="flex items-center gap-2 flex-wrap w-fit">
          <Button onClick={handleNewGame}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Play
          </Button>

          {showHintButton && (
            <Button onClick={handleHint} disabled={!gameStarted || gameCompleted || hint !== ''}>
              Hint
            </Button>
          )}

          {showQuitButton && (
            <Button variant="destructive" onClick={handleQuit}>
              Quit
            </Button>
          )}

          {showConfirmButtons && (
            <>
              <Button variant="secondary" onClick={confirmQuit}>
                Confirm
              </Button>
              <Button onClick={cancelQuit}>Cancel</Button>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {/* The letter palette and ciphertext are only interactive while
                the player is still playing. After a quit, we hide the
                palette and switch the text to the plaintext below. */}
            {!quitConfirmed && !gameCompleted && (
              <div>
                <p className="mt-1 text-muted-foreground">
                  Click two letters to swap them in the cipher.
                </p>
                <div className="flex flex-wrap mt-2">
                  {ALPHABET.map(letter => (
                    <div
                      key={letter}
                      onClick={() => handleLetterClick(letter)}
                      // The currently-armed letter gets the primary colour
                      // treatment so the player can see what's selected.
                      className={`w-10 h-10 m-1 flex items-center justify-center cursor-pointer rounded shadow text-base font-medium select-none ${
                        selectedLetter === letter
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-card text-foreground'
                      }`}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Win banner — only on a genuine solve, not a quit reveal. */}
            {gameCompleted && gameStarted && !quitGame && (
              <div className="mt-4 flex items-center gap-2">
                <CheckCircle2 className="text-green-600 h-5 w-5" />
                <p>Completed!</p>
              </div>
            )}

            {/* The text panel swaps between showing the (mutating)
                ciphertext during play and the original plaintext after
                the player gives up. Both branches show the category hint
                if one has been requested. */}
            {!quitConfirmed ? (
              <div className="pt-4 mb-4">
                {hint && <p className="italic text-muted-foreground">{getHintLabel(hint)}</p>}
                <h2 className="text-2xl font-semibold pb-2">
                  {encryptedTerm?.Term ? encryptedTerm.Term : 'Loading...'}
                </h2>
                <p>{encryptedTerm?.Description ? encryptedTerm.Description : 'Loading...'}</p>
              </div>
            ) : (
              <div className="pt-4">
                {hint && <p className="italic text-muted-foreground">{getHintLabel(hint)}</p>}
                <h2 className="text-2xl font-semibold pb-2">
                  {selectedTerm?.Term ? selectedTerm.Term : 'Loading...'}
                </h2>
                <p>{selectedTerm?.Description ? selectedTerm.Description : 'Loading...'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DecryptChess
