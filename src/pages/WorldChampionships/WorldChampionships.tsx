import { ChangeEvent, useEffect, useMemo, useState } from 'react'

import GameViewer from '@/components/ui/game-viewer'

import { worldChampionshipGames } from '@/data/worldChampionship'

// A single World Championship event from the local dataset.
// Derived from the dataset so the type stays accurate if the data
// shape changes.
type WorldChampionshipEvent = (typeof worldChampionshipGames)[number]

const DEFAULT_TYPE = '2006-2024 | Reunified Championship'
const DEFAULT_EVENT = '2024 | D. Liren vs G. Dommaraju'
const DESCRIPTION_LIMIT = 200

const championshipTypes = Array.from(new Set(worldChampionshipGames.map(game => game.Type)))

const initialType = championshipTypes.includes(DEFAULT_TYPE)
  ? DEFAULT_TYPE
  : (championshipTypes[0] ?? '')

const initialEventIndex = worldChampionshipGames
  .filter(game => game.Type === initialType)
  .findIndex(game => game.Event === DEFAULT_EVENT)

/**
 * World Championships
 * -------------------
 * Browse and replay games from World Chess Championship matches.
 *
 * The data is grouped by championship era/type, then by match/event,
 * then by individual game. The page manages those selections and
 * passes the selected game into the shared GameViewer component.
 *
 * This open-source version keeps only the standalone app logic: no
 * Material UI, no app header/sidebar, no tour system, no translations,
 * no share context, no analytics, and no database writes.
 */
function WorldChampionships() {
  // The selected championship era/type, such as the reunified
  // championship period.
  const [selectedType, setSelectedType] = useState<string>(initialType)

  // The selected match/event inside the chosen championship type.
  const [selectedEventIndex, setSelectedEventIndex] = useState<number>(
    initialEventIndex >= 0 ? initialEventIndex : 0
  )

  // The selected game inside the chosen match/event.
  const [selectedGameIndex, setSelectedGameIndex] = useState<number>(0)

  // Controls whether the event description is shown in full or
  // truncated to keep the page compact.
  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(false)

  // Only show events belonging to the currently-selected championship
  // type.
  const filteredEvents = useMemo(() => {
    return worldChampionshipGames.filter(game => game.Type === selectedType)
  }, [selectedType])

  const selectedEvent: WorldChampionshipEvent | undefined = filteredEvents[selectedEventIndex]
  const selectedGame = selectedEvent?.Games[selectedGameIndex]

  // Collapse the description whenever the selected event changes.
  useEffect(() => {
    setDescriptionExpanded(false)
  }, [selectedType, selectedEventIndex])

  useEffect(() => {
    document.title = 'World Championships'
  }, [])

  // Change championship type and reset the dependent selections.
  const handleTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(event.target.value)
    setSelectedEventIndex(0)
    setSelectedGameIndex(0)
  }

  // Change match/event and reset to the first game in that match.
  const handleEventChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedEventIndex(Number(event.target.value))
    setSelectedGameIndex(0)
  }

  // Change the selected game inside the current match.
  const handleGameChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedGameIndex(Number(event.target.value))
  }

  // Local replacement for the old ExpandableTypography platform
  // component.
  const renderDescription = () => {
    if (!selectedEvent?.EventDescription) return null

    const description = selectedEvent.EventDescription
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
      <h1 className="heading-1">World Championships</h1>
      <div className="w-full mt-6">
        {/* Controls row: championship type, match/event, and game number. */}
        <div id="controls" className="mb-4 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
          <select
            value={selectedType}
            onChange={handleTypeChange}
            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm sm:max-w-[400px]"
          >
            {championshipTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {selectedType && (
            <select
              value={selectedEventIndex}
              onChange={handleEventChange}
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm sm:max-w-[400px]"
            >
              {filteredEvents.map((event, index) => (
                <option key={`${event.Event}-${index}`} value={index}>
                  {event.Event}
                </option>
              ))}
            </select>
          )}

          {selectedEvent && (
            <select
              id="selectGame"
              value={selectedGameIndex}
              onChange={handleGameChange}
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm sm:max-w-[160px]"
            >
              {selectedEvent.Games.map((_, gameIndex) => (
                <option key={gameIndex} value={gameIndex}>
                  Game {gameIndex + 1}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedEvent && (
          <div className="w-full">
            {renderDescription()}

            {selectedGame && (
              <div id="chessboard">
                <GameViewer
                  BlackPlayer={selectedGame.Black}
                  BlackElo={selectedGame.BlackElo}
                  WhitePlayer={selectedGame.White}
                  WhiteElo={selectedGame.WhiteElo}
                  Event={selectedEvent.Event}
                  Site={selectedEvent.Site}
                  Date={selectedGame.Date || selectedEvent.EventDate}
                  Result={selectedGame.Result}
                  Round={selectedGame.Round}
                  PlyCount={selectedGame.PlyCount}
                  Moves={selectedGame.Moves}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default WorldChampionships
