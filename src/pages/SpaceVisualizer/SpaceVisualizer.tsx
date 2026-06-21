import { useEffect, useState } from 'react'
import { Chess } from 'chess.js'
import { PlayCircle, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

import SpaceVisualizerChessboardCard from './chessboardCard'
import SpaceVisualizerMovesCard from './movesCard'
import SpaceVisualizerExportCard from './exportCard'

import { processPGN, type MoveTree } from './helper'

/**
 * Space Visualizer page.
 *
 * Shows who controls the board, square by square, as a game is played. The
 * page state is intentionally minimal: a single move tree and a pointer to
 * the currently-selected move. Child components read both as props and call
 * back to mutate them.
 */
function SpaceVisualizer() {
  const [pgnDialogOpen, setPgnDialogOpen] = useState(false)
  const [pgnInput, setPgnInput] = useState('')
  const [pgnError, setPgnError] = useState('')

  const [moves, setMoves] = useState<MoveTree>({
    root: { san: '', next: null, variations: [], parent: null },
  })

  const [selectedMoveId, setSelectedMoveId] = useState<string>('root')

  // Set the document title once on mount — no need for react-helmet
  useEffect(() => {
    document.title = 'Space Visualizer'
  }, [])

  const handleNewGame = () => {
    setMoves({
      root: { san: '', next: null, variations: [], parent: null },
    })
    setSelectedMoveId('root')
  }

  /**
   * Validate the pasted PGN with chess.js before handing it off to the
   * processor. We only care that the moves are legal; tags and comments are
   * stripped during processing.
   */
  const handlePGNImport = () => {
    const chess = new Chess()
    try {
      chess.loadPgn(pgnInput)
      setPgnDialogOpen(false)
      setPgnInput('')
      setPgnError('')
      setSelectedMoveId('root')
      setMoves(processPGN(pgnInput))
      toast.success('PGN imported')
    } catch {
      setPgnError('Invalid PGN. Please check formatting and try again.')
    }
  }

  return (
    <div className="page-container">
      <h1 className="heading-1">Space Visualizer</h1>

      <div className="w-full mt-6">
        {/* Top controls — new game / load PGN */}
        <div id="controls" className="flex items-center gap-2 w-fit flex-wrap mb-3">
          <Button onClick={handleNewGame}>
            <PlayCircle className="mr-2 h-4 w-4" />
            New Game
          </Button>
          <Button onClick={() => setPgnDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Load Game
          </Button>
        </div>

        {/* Main two-column layout: chessboard on the left, moves + export on the right.
            Drops to a single column on small screens. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <SpaceVisualizerChessboardCard
              moves={moves}
              setMoves={setMoves}
              selectedMoveId={selectedMoveId}
              setSelectedMoveId={setSelectedMoveId}
            />
          </div>

          <div className="flex flex-col gap-4">
            <SpaceVisualizerMovesCard
              moves={moves}
              setMoves={setMoves}
              selectedMoveId={selectedMoveId}
              setSelectedMoveId={setSelectedMoveId}
            />
            <SpaceVisualizerExportCard moves={moves} />
          </div>
        </div>
      </div>

      {/* Import PGN dialog. The `!min-w-0` override is needed because shadcn's
          DialogContent ships with a baked-in min-width that fights `max-w-*`. */}
      <Dialog open={pgnDialogOpen} onOpenChange={setPgnDialogOpen}>
        <DialogContent className="!min-w-0 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import PGN
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Textarea
              placeholder="Paste PGN here"
              rows={8}
              value={pgnInput}
              onChange={e => setPgnInput(e.target.value)}
            />
            {pgnError && (
              <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2 rounded">
                {pgnError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handlePGNImport}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button variant="secondary" onClick={() => setPgnDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SpaceVisualizer
