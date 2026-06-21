import { useState, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import { Shuffle, Copy, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// Pre-generated array of all 960 starting positions as FEN strings,
// indexed 0–959 to match the standard Chess960/SP numbering scheme.
import { fischerrandom } from '@/data/fischerrandom'
import { DEFAULT_CHESSBOARD_OPTIONS } from '@/config/chessboard'

/**
 * FischerRandomGenerator
 * --------------------------
 * Browser / lookup tool for Chess960 (Fischer Random) starting positions.
 *
 * The user can either roll a random position with the Generate button or
 * jump directly to a specific position number (0–959). The chosen position
 * is rendered on a non-interactive board, and the corresponding FEN string
 * is shown alongside with a copy-to-clipboard button.
 */
const FischerRandomGenerator = () => {
  // The FEN currently displayed on the board. Defaults to position 0,
  // which is the standard chess starting position.
  const [fen, setFen] = useState(fischerrandom[0])
  // The text in the position-number input. Kept as a string so the user
  // can type freely (including a temporarily empty box) without React
  // fighting them on every keystroke.
  const [positionInput, setPositionInput] = useState('0')
  // Tracks whether the "Copied!" confirmation should be visible.
  const [copied, setCopied] = useState(false)

  /**
   * Picks a uniformly random position (0–959), displays it on the board,
   * and syncs the input box so the user can see which number was chosen.
   */
  const handleGenerate = () => {
    const randomNumber = Math.floor(Math.random() * fischerrandom.length)
    setFen(fischerrandom[randomNumber])
    setPositionInput(randomNumber.toString())
  }

  /**
   * Normalises the input when the field loses focus: anything non-numeric
   * or out of range collapses to 0. This is purely a clean-up — it doesn't
   * change the displayed board, just tidies the text that's now visible.
   */
  const handleInputBlur = () => {
    let num = parseInt(positionInput, 10)
    if (isNaN(num) || num < 0 || num > 959) num = 0
    setPositionInput(num.toString())
  }

  /**
   * Applies the typed position number to the board. We silently ignore
   * invalid input here rather than coerce; the blur handler will tidy
   * the text separately if needed.
   */
  const handleSelectPosition = () => {
    const num = parseInt(positionInput, 10)
    if (isNaN(num) || num < 0 || num > 959) return
    setFen(fischerrandom[num])
  }

  /**
   * Copies the current FEN to the clipboard and shows a brief "Copied!"
   * confirmation that auto-dismisses after 1.5 seconds.
   */
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(fen)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  useEffect(() => {
    document.title = 'Fischer Random Generator'
  }, [])

  return (
    <div className="page-container">
      <h1 className="heading-1">Fischer Random Generator</h1>

      <div className="mt-6 flex flex-col gap-6">
        {/* Controls row: random Generate button, plus a number-input +
            Select button group styled as a single segmented control via
            matching rounded-l-none / rounded-r-none classes. */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleGenerate}>
            <Shuffle className="mr-2 h-4 w-4" />
            Generate
          </Button>

          <div className="flex">
            <Input
              value={positionInput}
              onChange={e => setPositionInput(e.target.value)}
              onBlur={handleInputBlur}
              placeholder="0–959"
              className="w-16 rounded-r-none text-center"
              autoComplete="off"
            />
            <Button onClick={handleSelectPosition} className="rounded-l-none">
              <Hash className="mr-2 h-4 w-4" />
              Select
            </Button>
          </div>
        </div>

        {/* Two-column layout on md+ screens: board + FEN on the left,
            explanatory copy about Chess960 on the right. Collapses to a
            single column on narrow screens. */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="w-full">
              {/* allowDragging is off because this page is a viewer, not a
                  playable board — the user shouldn't be able to scramble
                  the position they just generated. */}
              <Chessboard
                options={{
                  ...DEFAULT_CHESSBOARD_OPTIONS,
                  position: fen,
                  allowDragging: false,
                  id: 'fischer-random-board',
                }}
              />
            </div>

            {/* FEN display + copy button, again styled as a single
                segmented control. readOnly prevents edits but still lets
                users select-and-copy manually if they prefer. */}
            <div className="flex">
              <Input value={fen} readOnly className="rounded-r-none font-mono text-xs" />
              <Button
                onClick={copyToClipboard}
                variant="secondary"
                className="rounded-l-none"
                title={copied ? 'Copied!' : 'Copy FEN'}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {copied && <p className="text-sm text-muted-foreground">FEN copied to clipboard.</p>}
          </div>

          {/* Static explainer panel — context for users who land here
              without knowing what Chess960 is. */}
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">About Fischer Random</h2>
            <p className="text-muted-foreground">
              Fischer Random Chess (also known as Chess960) shuffles the starting position of the
              back rank to one of 960 possible arrangements.
            </p>
            <p className="text-muted-foreground">
              The game removes memorised opening theory and rewards pure understanding from move
              one.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FischerRandomGenerator
