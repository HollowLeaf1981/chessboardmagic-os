import { useState, useEffect, useCallback } from 'react'
import { PlayCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { JigsawPuzzle } from 'react-jigsaw-puzzle/lib'
import 'react-jigsaw-puzzle/lib/jigsaw-puzzle.css'

import { chessterms } from '@/data/chessterms'

import './ImagePuzzle.css'

// A single chessterm entry. Derived from the dataset so the type stays
// accurate if columns change.
type Chessterm = (typeof chessterms)[number]

/**
 * Image Puzzle
 * ---------------
 * Jigsaw puzzle featuring portraits of famous chess players. A random
 * player is drawn from the chess terms dataset (filtered to player-type
 * entries) and their portrait is scrambled into a 5x5 grid that the player
 * reassembles by dragging pieces into place. Once solved, the player's
 * name and biographical description are revealed alongside, along with an
 * image attribution line for the original photo.
 */
function ImagePuzzle() {
  // True once the player has finished assembling the puzzle. Drives the
  // name/description reveal panel and is reset on every new game.
  const [completed, setCompleted] = useState<boolean>(false)
  // The full dataset entry for the player whose portrait is being puzzled.
  // Used for the post-game reveal (Term + Description) and the attribution
  // line (ImageAuthor + License).
  const [selectedPlayer, setSelectedPlayer] = useState<Chessterm | null>(null)
  // The src for the portrait image, derived from the player's Key. Kept as
  // separate state because react-jigsaw-puzzle takes it as a prop and we
  // want a clean re-init when it changes.
  const [imageName, setImageName] = useState<string>('')

  /**
   * Starts a new round: picks a random player-type entry from the dataset
   * (Type "P" or "W" — both treated as players), builds the image path
   * from the entry's Key, and resets the completed flag.
   */
  const handleNewGame = useCallback(() => {
    const chessPlayers = (chessterms as Chessterm[]).filter(
      term => term.Type === 'P' || term.Type === 'W'
    )
    const randomNumber = Math.floor(Math.random() * chessPlayers.length)
    const newSelectedChessPlayer = chessPlayers[randomNumber]

    setImageName(`${import.meta.env.BASE_URL}img/players/${newSelectedChessPlayer.Key}.png`)
    setSelectedPlayer(newSelectedChessPlayer)
    setCompleted(false)
  }, [])

  // Called by JigsawPuzzle when every piece is in its correct slot.
  const handleSolved = () => {
    setCompleted(true)
  }

  // Auto-start a game on mount.
  useEffect(() => {
    handleNewGame()
  }, [handleNewGame])

  return (
    <div className="page-container">
      <h1 className="heading-1">Image Puzzle</h1>
      <div className="w-full mt-6">
        <div className="mb-4">
          <Button onClick={handleNewGame}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Play
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="w-full">
            <div className="puzzle-container">
              {imageName && (
                <JigsawPuzzle imageSrc={imageName} rows={5} columns={5} onSolved={handleSolved} />
              )}
            </div>

            {selectedPlayer?.ImageAuthor && (
              <small className="block mt-2 text-muted-foreground">
                Author: {selectedPlayer.ImageAuthor},{' '}
                <a
                  href={selectedPlayer.License}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-muted-foreground"
                >
                  License
                </a>
              </small>
            )}
          </div>

          <div className="w-full">
            {completed && selectedPlayer && (
              <div>
                <h2 className="text-xl font-semibold mb-2">{selectedPlayer.Term}</h2>
                <p className="text-muted-foreground">{selectedPlayer.Description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImagePuzzle
