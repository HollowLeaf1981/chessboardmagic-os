import { useEffect, useState, useCallback } from 'react'
import { PlayCircle, CheckCircle, AlertCircle } from 'lucide-react'

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

type Difficulty = 'easy' | 'medium' | 'hard'

/**
 * Guess Who
 * ---------------
 * Multiple-choice identification puzzle. A random chess player is drawn
 * from the dataset (filtered to player-type entries) and their portrait
 * is shown alongside six name options — the correct one plus five
 * decoys, with decoys filtered to match the target's gender so the
 * puzzle stays a question of who-is-this rather than process-of-elimination.
 *
 * Difficulty affects the portrait, not the options: easy shows the clear
 * image, medium blurs it, hard blurs and desaturates. Wrong guesses
 * disable that button rather than ending the round, so the player can
 * keep trying. The dataset's Description is revealed once they get it
 * right, alongside a green tick.
 */
function GuessWho() {
  // True once the player has correctly identified the portrait. Drives
  // the reveal panel and hides the remaining option buttons.
  const [completed, setCompleted] = useState<boolean>(false)
  // The full dataset entry for the player whose portrait is being
  // shown. Used for the post-game description reveal and for the
  // correctness comparison.
  const [selectedPlayer, setSelectedPlayer] = useState<Chessterm | null>(null)
  // The src for the portrait image, built from the player's Key.
  const [imageName, setImageName] = useState<string>('')
  // The six name options for this round: target + five gender-matched
  // decoys, shuffled.
  const [playerOptions, setPlayerOptions] = useState<Chessterm[]>([])
  // Feedback message after a guess: "Correct" / "Incorrect" / "".
  const [feedback, setFeedback] = useState<string>('')
  // Keys of buttons the player has guessed wrong this round, so we can
  // grey them out without removing them (they stay as a record of what's
  // been tried).
  const [disabledButtons, setDisabledButtons] = useState<string[]>([])
  // Difficulty level. Drives the CSS filter on the portrait — easy =
  // clear, medium = blurred, hard = blurred + grayscale.
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')

  /**
   * Starts a new round: picks a random player-type entry from the
   * dataset, builds five gender-matched decoys, shuffles the six options,
   * and resets all per-round state.
   *
   * Gender matching keeps the puzzle honest — if you mix male and female
   * players in the options, the gender of the portrait gives away the
   * answer for half the dataset.
   */
  const handleNewGame = useCallback(() => {
    setDisabledButtons([])

    const chessPlayers = (chessterms as Chessterm[]).filter(
      term => term.Type === 'P' || term.Type === 'W'
    )

    const randomNumber = Math.floor(Math.random() * chessPlayers.length)
    const newSelectedChessPlayer = chessPlayers[randomNumber]

    setImageName(`/img/players/${newSelectedChessPlayer.Key}.png`)
    setSelectedPlayer(newSelectedChessPlayer)
    setCompleted(false)
    setFeedback('')

    const otherPlayers = chessPlayers.filter(
      player =>
        player.Key !== newSelectedChessPlayer.Key && player.Gender === newSelectedChessPlayer.Gender
    )

    const shuffleArray = (array: Chessterm[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
      }
    }

    // Pull five decoys at random, without repeats. Splice keeps the
    // pool shrinking so we can't draw the same decoy twice.
    const additionalPlayers: Chessterm[] = []
    while (additionalPlayers.length < 5 && otherPlayers.length > 0) {
      const randomIndex = Math.floor(Math.random() * otherPlayers.length)
      additionalPlayers.push(otherPlayers[randomIndex])
      otherPlayers.splice(randomIndex, 1)
    }

    const combinedPlayers = [newSelectedChessPlayer, ...additionalPlayers]
    shuffleArray(combinedPlayers)
    setPlayerOptions(combinedPlayers)
  }, [])

  /**
   * Click handler for a name option. Correct → end the round, show the
   * description. Wrong → disable the button, set the feedback message,
   * and let the player try another.
   */
  const handlePlayerSelection = (player: Chessterm) => {
    if (!selectedPlayer) return
    if (player.Key === selectedPlayer.Key) {
      setFeedback('Correct')
      setCompleted(true)
    } else {
      setFeedback('Incorrect')
      setDisabledButtons(prev => [...prev, player.Key])
    }
  }

  // Auto-start a game on mount.
  useEffect(() => {
    handleNewGame()
  }, [handleNewGame])

  useEffect(() => {
    document.title = 'Guess Who'
  }, [])

  // CSS filter for the portrait based on the difficulty toggle. Cleared
  // once the player guesses correctly so they can see who they got.
  const portraitFilter = completed
    ? 'none'
    : difficulty === 'medium'
      ? 'blur(5px)'
      : difficulty === 'hard'
        ? 'blur(10px) grayscale(100%)'
        : 'none'

  return (
    <div className="page-container">
      <h1 className="heading-1">Guess Who</h1>
      <div className="w-full mt-6">
        {/* Controls row: Play + difficulty select. */}
        <div id="controls" className="flex items-end flex-wrap gap-2 mb-4">
          <Button onClick={handleNewGame}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Play
          </Button>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">Difficulty</Label>
            <Select
              value={difficulty}
              onValueChange={(value: string) => setDifficulty(value as Difficulty)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Two equal columns at md+, stacked on mobile. Portrait on the
          left, options + feedback on the right. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="w-full">
            {imageName && (
              <img
                src={imageName}
                alt=""
                className="w-full h-auto"
                style={{ filter: portraitFilter }}
              />
            )}
          </div>

          <div className="w-full">
            {/* Reveal panel — only renders once the round is won. Shows
              a green tick, the description, and a separator. */}
            {completed && selectedPlayer && (
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <CheckCircle className="text-green-600 mr-2 h-8 w-8" />
                  <span>Correct</span>
                </div>
                <p className="mt-2 text-muted-foreground">{selectedPlayer.Description}</p>
              </div>
            )}

            {/* Incorrect-guess feedback. Shown until the next click. */}
            {feedback === 'Incorrect' && !completed && (
              <div className="flex items-center mb-2">
                <AlertCircle className="text-red-600 mr-2 h-8 w-8" />
                <span>Incorrect</span>
              </div>
            )}

            {/* The six name options. Wrong guesses get disabled so the
              player can see at a glance what they've already tried.
              Buttons disappear once the round is won. */}
            {!completed && playerOptions.length > 0 && (
              <div id="guesses" className="flex flex-wrap">
                {playerOptions.map((player, index) => (
                  <Button
                    key={`${player.Key}-${index}`}
                    variant="secondary"
                    onClick={() => handlePlayerSelection(player)}
                    disabled={disabledButtons.includes(player.Key)}
                    className="mr-2 mb-2"
                  >
                    {player.Term}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GuessWho
