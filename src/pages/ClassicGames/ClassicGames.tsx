import { ChangeEvent, useEffect, useState } from 'react'
import { Shuffle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import GameViewer from '@/components/ui/game-viewer'

import { classicGames } from '@/data/classicGames'

// A single classic game from the local dataset. Derived from the
// dataset so the type stays accurate if the data shape changes.
type ClassicGame = (typeof classicGames)[number]

const DESCRIPTION_LIMIT = 200

/**
 * Classic Games
 * --------------
 * Browse and replay a curated set of famous historical chess games.
 *
 * A random game is selected when the page loads. The player can then
 * choose a specific game from the dropdown or shuffle to another random
 * one. The selected game is passed into the reusable GameViewer
 * component, which handles board display, move navigation, notation
 * clicks, keyboard navigation, orientation changes, and PGN copying.
 *
 * This open-source version keeps only the standalone app logic: no
 * Material UI, no app header/sidebar, no tour system, no translations,
 * no share context, no analytics, and no database writes.
 */
function ClassicGames() {
  // The currently-selected game index in the classicGames dataset.
  const [selectedEventIndex, setSelectedEventIndex] = useState<number>(0)

  // Controls whether the selected game's description is shown in full
  // or truncated to keep the page compact.
  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(false)

  const selectedGame: ClassicGame | undefined = classicGames[selectedEventIndex]

  const getRandomNumber = (n: number): number => Math.floor(Math.random() * n)

  // Pick a random game when the page first loads so the app does not
  // always open on the same historical game.
  useEffect(() => {
    if (classicGames.length === 0) return

    const randomIndex = getRandomNumber(classicGames.length)
    setSelectedEventIndex(randomIndex)
  }, [])

  // Collapse the description whenever the selected game changes.
  useEffect(() => {
    setDescriptionExpanded(false)
  }, [selectedEventIndex])

  useEffect(() => {
    document.title = 'Classic Games'
  }, [])

  // Select a specific historical game from the dropdown.
  const handleEventChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedEventIndex(Number(event.target.value))
  }

  // Jump to another random game from the dataset.
  const handleRandomGame = () => {
    if (classicGames.length === 0) return

    const randomIndex = getRandomNumber(classicGames.length)
    setSelectedEventIndex(randomIndex)
  }

  // Player image filenames are keyed from the surname in the original
  // data: "Fischer, Robert James" → "FISCHER".
  const getPlayerImageKey = (playerName?: string): string | undefined => {
    if (!playerName) return undefined

    return playerName.split(', ')[0].toUpperCase()
  }

  // Local replacement for the old ExpandableTypography platform
  // component. Keeps the description readable without pulling in
  // another shared dependency.
  const renderDescription = () => {
    if (!selectedGame?.Description) return null

    const description = selectedGame.Description
    const shouldTruncate = description.length > DESCRIPTION_LIMIT

    const visibleText =
      !descriptionExpanded && shouldTruncate
        ? `${description.slice(0, DESCRIPTION_LIMIT)}...`
        : description

    return (
      <p className="mb-4 text-sm leading-6 text-muted-foreground">
        {visibleText}{' '}
        {shouldTruncate && (
          <button
            type="button"
            onClick={() => setDescriptionExpanded(prev => !prev)}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {descriptionExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </p>
    )
  }

  return (
    <div className="page-container">
      <h1 className="heading-1">Classic Chess Games</h1>
      <div className="w-full mt-6">
        {/* Controls row: choose a specific game or shuffle to another
          random historical game. */}
        <div id="controls" className="mb-4 flex w-full max-w-[640px] flex-wrap items-center gap-2">
          <select
            value={selectedEventIndex}
            onChange={handleEventChange}
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            {classicGames.map((game, index) => (
              <option key={`${game.Name}-${index}`} value={index}>
                {game.Name}
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            onClick={handleRandomGame}
            className="h-9 w-9 p-0"
            aria-label="Choose random game"
            title="Choose random game"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
        </div>

        {/* Selected game panel: metadata, description, and board viewer. */}
        {selectedGame && (
          <div className="w-full">
            {renderDescription()}

            <div id="chessboard">
              <GameViewer
                BlackPlayer={selectedGame.Black}
                BlackElo={selectedGame.BlackElo}
                WhitePlayer={selectedGame.White}
                WhiteElo={selectedGame.WhiteElo}
                Date={selectedGame.Date}
                Result={selectedGame.Result}
                Event={selectedGame.Name}
                Site={selectedGame.Site}
                Moves={selectedGame.Moves}
                WhiteImage={getPlayerImageKey(selectedGame.White)}
                BlackImage={getPlayerImageKey(selectedGame.Black)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ClassicGames
