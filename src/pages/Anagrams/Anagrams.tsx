import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PlayCircle, Eye, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { chessterms } from '@/data/chessterms'

// A single entry from the chessterms dataset (e.g. { Term, Type, Length, Description }).
// We derive the type directly from the data so it stays in sync if the dataset changes.
type Chessterm = (typeof chessterms)[number]

interface SortableItemProps {
  id: string // Unique id for dnd-kit (letter + original index, e.g. "K0")
  letter: string // The character to display in the tile
}

/**
 * SortableItem
 * ------------
 * A single draggable letter tile. Uses dnd-kit's `useSortable` hook to wire up
 * drag handlers, transform styles, and transition animations automatically.
 */
const SortableItem = ({ id, letter }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  // dnd-kit gives us a transform object; CSS.Transform.toString() converts it
  // into a valid CSS transform string for smooth dragging.
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`w-10 p-2.5 text-center uppercase cursor-pointer rounded shadow text-foreground select-none ${
        isDragging ? 'bg-muted' : 'bg-background'
      }`}
    >
      {letter.toUpperCase()}
    </div>
  )
}

/**
 * randomizeString
 * ---------------
 * Shuffles an array of characters using the Fisher–Yates algorithm, then
 * appends each character's new position as a suffix so every tile has a
 * unique, stable id (e.g. ["K0", "N1", "I2", ...]).
 *
 * The suffix matters: dnd-kit requires unique ids, and a word like "BISHOP"
 * would otherwise have no way to distinguish duplicate letters.
 */
const randomizeString = (array: string[]): string[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array.map((char, index) => char.toUpperCase() + index)
}

/**
 * Anagrams
 * ------------
 * A chess-themed anagram game. The player is shown a scrambled chess term
 * (or player/engine/opening name) and drags the letters into the correct
 * order. Hints reveal the category; "Quit" reveals the solution.
 */
const Anagrams = () => {
  // The current puzzle's source entry from the chessterms dataset.
  const [selectedPhrase, setSelectedPhrase] = useState<Chessterm | null>(null)
  // The shuffled tile ids currently rendered on screen, in their display order.
  const [randomizedPhrase, setRandomizedPhrase] = useState<string[]>([])
  // True when the player has correctly arranged the letters (or gave up).
  const [completed, setCompleted] = useState<boolean>(false)
  // Whether the category hint is currently visible.
  const [showHint, setShowHint] = useState<boolean>(false)
  // The category hint text itself (e.g. "Chess Term", "Chess Player").
  const [hint, setHint] = useState<string>('')
  // Once a hint has been used, the "Hint" button is swapped for "Quit".
  const [showGiveUp, setShowGiveUp] = useState<boolean>(false)
  // Tracks whether a game is in progress (used to disable the Hint button before play).
  const [gameStarted, setGameStarted] = useState<boolean>(false)

  // Configure pointer and touch sensors. The 10px activation distance prevents
  // accidental drags when the user just wants to tap, and lets touch devices
  // scroll the page normally until a deliberate drag begins.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 10 } })
  )

  /**
   * Fired when the user finishes dragging a tile. We compute the new tile
   * order, update state, and then check whether the resulting word matches
   * the target phrase (case-insensitive).
   */
  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (!over || !selectedPhrase) return
    if (active.id !== over.id) {
      // Find the dragged tile and the tile it was dropped onto, then use
      // dnd-kit's arrayMove helper to produce the reordered array.
      const oldIndex = randomizedPhrase.indexOf(active.id as string)
      const newIndex = randomizedPhrase.indexOf(over.id as string)
      const newArray = arrayMove(randomizedPhrase, oldIndex, newIndex)
      setRandomizedPhrase(newArray)

      // Reconstruct the current word from the tile ids: take the first char
      // of each id (the letter), drop the numeric index suffix, and collapse
      // any whitespace. Then compare against the target term.
      const joinedPhrase = newArray
        .map(id => id[0])
        .join('')
        .replace(/\d+/g, '')
        .replace(/\s+/g, ' ')
      setCompleted(joinedPhrase === selectedPhrase.Term.toUpperCase())
    }
  }

  /**
   * Starts a new round: picks a random term (longer than 4 chars for a
   * reasonable challenge), sets the appropriate category hint, resets all
   * round-specific UI state, and shuffles the letters.
   */
  const handleNewGame = useCallback((): void => {
    // Skip very short words — they tend to be trivial to unscramble.
    const filteredChessterms = chessterms.filter(term => term.Length > 4)
    const randomNumber = Math.floor(Math.random() * filteredChessterms.length)
    const newSelectedPhrase = filteredChessterms[randomNumber]
    setSelectedPhrase(newSelectedPhrase)

    // Map the dataset's single-letter Type code to a human-readable hint.
    // T = Term, P/W = Player (W covers world champions), E = Engine, O = Opening.
    if (newSelectedPhrase.Type === 'T') {
      setHint('Chess Term')
    } else if (newSelectedPhrase.Type === 'P' || newSelectedPhrase.Type === 'W') {
      setHint('Chess Player')
    } else if (newSelectedPhrase.Type === 'E') {
      setHint('Chess Engine')
    } else if (newSelectedPhrase.Type === 'O') {
      setHint('Chess Opening')
    }

    // Reset round-specific UI state.
    setShowHint(false)
    setShowGiveUp(false)
    setCompleted(false)
    setGameStarted(true)

    // Split the term into characters and shuffle them into tile ids.
    const phraseArray = newSelectedPhrase.Term.split('')
    setRandomizedPhrase(randomizeString(phraseArray))
  }, [])

  /**
   * Reveals the category hint. Once used, the Hint button is replaced by
   * a Quit button — using a hint "commits" the player to either solving or
   * giving up on this round.
   */
  const handleShowHint = (): void => {
    setShowHint(true)
    setShowGiveUp(true)
  }

  /**
   * Gives up on the current round and reveals the solution by reordering
   * the tiles into the correct sequence. Marking `completed` true shows
   * the description and stops further interaction with this puzzle.
   */
  const handleGiveUp = (): void => {
    if (!selectedPhrase) return
    const phraseArray = selectedPhrase.Term.split('')
    setRandomizedPhrase(phraseArray.map((char, index) => char.toUpperCase() + index))
    setCompleted(true)
  }

  // Kick off the first game on mount. `handleNewGame` is stable (memoised
  // with no deps) so this only runs once.
  useEffect(() => {
    handleNewGame()
  }, [handleNewGame])

  useEffect(() => {
    document.title = 'Chess Anagrams'
  }, [])

  return (
    <div className="page-container">
      <h1 className="heading-1">Anagrams</h1>

      <div className="mt-6 flex flex-col gap-4">
        {/* Controls row: Play, Hint/Quit toggle, and the hint text when shown. */}
        <div className="inline-flex flex-wrap gap-2 items-center">
          <Button onClick={handleNewGame}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Play
          </Button>

          {/* The Hint button is shown until the player uses it, then it's
              swapped out for Quit. This keeps the control area compact. */}
          {!showGiveUp && (
            <Button onClick={handleShowHint} disabled={!gameStarted}>
              <Eye className="mr-2 h-4 w-4" />
              Hint
            </Button>
          )}
          {showGiveUp && (
            <Button onClick={handleGiveUp} disabled={completed}>
              <XCircle className="mr-2 h-4 w-4" />
              Quit
            </Button>
          )}

          {showHint && <p className="italic text-muted-foreground pl-1">Hint: {hint}</p>}
        </div>

        {/* Drag-and-drop board. Each tile is a SortableItem; horizontal
            sorting strategy means tiles reflow left-to-right as they're
            rearranged. */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={randomizedPhrase} strategy={horizontalListSortingStrategy}>
            <div className="flex flex-wrap gap-2 py-2.5">
              {randomizedPhrase.map(id => (
                <SortableItem key={id} id={id} letter={id[0]} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Once solved (or revealed), show the term's description so the
            player learns something about the word they just unscrambled. */}
        {completed && selectedPhrase && (
          <div className="flex flex-col gap-2 max-w-2xl pb-5">
            <p className="text-muted-foreground">{selectedPhrase.Description}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Anagrams
