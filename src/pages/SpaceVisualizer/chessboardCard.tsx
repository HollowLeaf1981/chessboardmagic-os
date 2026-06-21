import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'

import {
  RotateCcw,
  ChevronsLeft,
  ChevronsRight,
  ArrowDownUp,
  Sparkles,
  Palette,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { DEFAULT_CHESSBOARD_OPTIONS } from '@/config/chessboard'

import {
  addMoveToTree,
  getMoveSequence,
  getNextMoveId,
  getPreviousMoveId,
  type MoveTree,
} from './helper'

interface SpaceVisualizerChessboardCardProps {
  moves: MoveTree
  setMoves: React.Dispatch<React.SetStateAction<MoveTree>>
  selectedMoveId: string
  setSelectedMoveId: (id: string) => void
}

// Maps each square to a Tailwind-compatible style object describing who
// controls it (more attackers of one color than the other).
type ControlOverlay = Record<string, { backgroundColor: string }>

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const

/**
 * Compute the "who controls each square" overlay by counting attackers of
 * each color on every square. The bigger the differential, the more saturated
 * the tint (green for White, red for Black).
 */
const getControlOverlay = (chessInstance: Chess): ControlOverlay => {
  const overlay: ControlOverlay = {}

  for (const rank of RANKS) {
    for (const file of FILES) {
      const square = (file + rank) as Parameters<Chess['attackers']>[0]
      const whiteAttackers = chessInstance.attackers(square, 'w').length
      const blackAttackers = chessInstance.attackers(square, 'b').length

      if (whiteAttackers !== blackAttackers) {
        // Cap the differential at 5 so a wildly contested square doesn't
        // saturate to fully opaque.
        const diff = Math.min(Math.abs(whiteAttackers - blackAttackers), 5)
        const alpha = 0.15 + diff * 0.15

        overlay[square] = {
          backgroundColor:
            whiteAttackers > blackAttackers
              ? `rgba(0, 255, 0, ${alpha})`
              : `rgba(255, 0, 0, ${alpha})`,
        }
      }
    }
  }

  return overlay
}

function SpaceVisualizerChessboardCard({
  moves,
  setMoves,
  selectedMoveId,
  setSelectedMoveId,
}: SpaceVisualizerChessboardCardProps) {
  const chessboardRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [boardSize, setBoardSize] = useState(400)
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white')
  const [showSquareOverlay, setShowSquareOverlay] = useState(true)
  const [showCanvasOverlay, setShowCanvasOverlay] = useState(true)

  // The chess.js game instance is held in state, exactly like the original.
  // It is kept in sync with selectedMoveId via the useEffect below, and is
  // updated directly by handleMove/handleNext/handleBack for snappy feedback.
  const [game, setGame] = useState<Chess>(new Chess())

  // Control overlay (who attacks what) is recomputed whenever the game changes.
  const [controlOverlay, setControlOverlay] = useState<ControlOverlay>({})

  /**
   * Drag-and-drop handler. Validates the move against the current game,
   * applies it to a fresh chess.js instance, then delegates tree mutation
   * to `addMoveToTree` in the helper.
   */
  const handleMove = ({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string
    targetSquare: string | null
  }) => {
    if (!targetSquare) return false
    try {
      // Apply the move to a fresh game so the chessboard updates immediately.
      const newGame = new Chess()
      newGame.loadPgn(game.pgn())
      const move = newGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })
      if (!move) return false
      setGame(newGame)

      // Delegate tree mutation to the helper.
      const result = addMoveToTree(moves, selectedMoveId, move.san)
      setMoves(result.moves)
      setSelectedMoveId(result.selectedMoveId)
      return true
    } catch {
      return false
    }
  }

  const handleNext = useCallback(() => {
    const nextId = getNextMoveId(moves, selectedMoveId)
    if (!nextId) return
    const nextMove = moves[nextId]
    if (!nextMove) return

    setGame(prevGame => {
      const newGame = new Chess()
      newGame.loadPgn(prevGame.pgn())
      newGame.move(nextMove.san)
      return newGame
    })
    setSelectedMoveId(nextId)
  }, [selectedMoveId, moves, setSelectedMoveId])

  const handleBack = useCallback(() => {
    const prevId = getPreviousMoveId(moves, selectedMoveId)
    if (!prevId) return

    setGame(prevGame => {
      const newGame = new Chess()
      newGame.loadPgn(prevGame.pgn())
      newGame.undo()
      return newGame
    })
    setSelectedMoveId(prevId)
  }, [selectedMoveId, moves, setSelectedMoveId])

  // Whenever selectedMoveId or the move tree changes (e.g. user clicks a
  // move in the list, deletes a move, or imports a PGN), rebuild the game
  // from the canonical move sequence so the board mirrors the tree.
  useEffect(() => {
    if (!selectedMoveId || !moves[selectedMoveId]) return
    setGame(() => {
      const newGame = new Chess()
      const moveSequence = getMoveSequence(moves, selectedMoveId)
      moveSequence.forEach(san => {
        try {
          newGame.move(san)
        } catch {
          // Ignore invalid moves; they shouldn't be in the tree but bail safely
        }
      })
      return newGame
    })
  }, [selectedMoveId, moves])

  // Recompute the control overlay (square attackers) whenever the game changes
  useEffect(() => {
    setControlOverlay(getControlOverlay(game))
  }, [game])

  // Arrow-key navigation along the currently-selected line
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') handleBack()
      else if (event.key === 'ArrowRight') handleNext()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleBack, handleNext])

  /**
   * Draw the "pressure map" overlay: a radial gradient on each square showing
   * the magnitude of one side's control. Green = White-dominant, red =
   * Black-dominant. Skips even battles.
   */
  const drawPressureMap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !chessboardRef.current) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const squareSize = canvas.width / 8

    for (const rank of RANKS) {
      for (const file of FILES) {
        const square = (file + rank) as Parameters<Chess['attackers']>[0]
        const fileIdx = file.charCodeAt(0) - 97
        const rankIdx = 8 - parseInt(rank, 10)

        // Flip coordinates when the board is rotated
        const x =
          boardOrientation === 'white'
            ? fileIdx * squareSize + squareSize / 2
            : (7 - fileIdx) * squareSize + squareSize / 2
        const y =
          boardOrientation === 'white'
            ? rankIdx * squareSize + squareSize / 2
            : (7 - rankIdx) * squareSize + squareSize / 2

        const white = game.attackers(square, 'w').length
        const black = game.attackers(square, 'b').length
        const diff = white - black

        if (diff === 0) continue

        const alpha = Math.min(Math.abs(diff) * 0.1, 0.6)
        const radius = squareSize * (0.7 + Math.abs(diff) * 0.3)
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)

        if (diff > 0) {
          gradient.addColorStop(0.0, `rgba(0,255,0,${alpha})`)
          gradient.addColorStop(0.6, `rgba(0,255,0,${alpha * 0.4})`)
          gradient.addColorStop(1.0, `rgba(0,255,0,0)`)
        } else {
          gradient.addColorStop(0.0, `rgba(255,0,0,${alpha})`)
          gradient.addColorStop(0.6, `rgba(255,0,0,${alpha * 0.4})`)
          gradient.addColorStop(1.0, `rgba(255,0,0,0)`)
        }

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, 2 * Math.PI)
        ctx.fill()
      }
    }
  }, [game, boardOrientation])

  useEffect(() => {
    drawPressureMap()
  }, [drawPressureMap, showCanvasOverlay])

  // Keep the canvas overlay matched to the chessboard's rendered width
  useEffect(() => {
    const updateBoardSize = () => {
      if (chessboardRef.current) {
        const { width } = chessboardRef.current.getBoundingClientRect()
        setBoardSize(width)
      }
    }
    updateBoardSize()
    window.addEventListener('resize', updateBoardSize)
    return () => window.removeEventListener('resize', updateBoardSize)
  }, [])

  const isAtRoot = selectedMoveId === 'root'
  const hasNext = !!moves[selectedMoveId]?.next

  return (
    <div id="chessboard" className="relative w-full bg-card text-card-foreground">
      <div className="flex flex-row items-start w-full min-h-[100px]">
        <div className="w-full p-0">
          {showCanvasOverlay && (
            <canvas
              ref={canvasRef}
              width={boardSize}
              height={boardSize}
              className="absolute pointer-events-none z-[5]"
            />
          )}
          <div ref={chessboardRef} className="p-0">
            <Chessboard
              options={{
                ...DEFAULT_CHESSBOARD_OPTIONS,
                position: game.fen(),
                onPieceDrop: handleMove,
                boardOrientation,
                squareStyles: showSquareOverlay ? controlOverlay : {},
                allowDrawingArrows: false,
              }}
            />
          </div>
        </div>
      </div>

      {/* Control buttons row */}
      <TooltipProvider>
        <div className="flex flex-wrap items-center gap-2 pt-4 w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setSelectedMoveId('root')}
                disabled={isAtRoot}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset the game</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="icon" onClick={handleBack} disabled={isAtRoot}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous move</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="icon" onClick={handleNext} disabled={!hasNext}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next move</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setBoardOrientation(prev => (prev === 'white' ? 'black' : 'white'))}
              >
                <ArrowDownUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Flip board</TooltipContent>
          </Tooltip>

          <div className="flex-grow" />

          {/* Toggle buttons — "default" variant when on, "secondary" when off */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showCanvasOverlay ? 'default' : 'secondary'}
                size="icon"
                onClick={() => setShowCanvasOverlay(prev => !prev)}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showCanvasOverlay ? 'Hide pressure map' : 'Show pressure map'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showSquareOverlay ? 'default' : 'secondary'}
                size="icon"
                onClick={() => setShowSquareOverlay(prev => !prev)}
              >
                <Palette className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showSquareOverlay ? 'Hide square coloring' : 'Show square coloring'}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  )
}

export default SpaceVisualizerChessboardCard
