import React, { useEffect, useRef, useState } from 'react'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

import { deleteMoveFromTree, type MoveNode, type MoveTree } from './helper'

interface SpaceVisualizerMovesCardProps {
  moves: MoveTree
  setMoves: React.Dispatch<React.SetStateAction<MoveTree>>
  selectedMoveId: string
  setSelectedMoveId: (id: string) => void
}

// Static color palette indexed by variation depth. Mainline is the default
// foreground; each variation level cycles through a distinct accent so the
// tree stays scannable even with deeply nested lines.
const LEVEL_COLORS = [
  'text-foreground',
  'text-blue-500',
  'text-purple-500',
  'text-amber-500',
  'text-emerald-500',
]

// A flattened move with its tree depth and assigned move number, ready to render
type DisplayMove = MoveNode & {
  id: string
  level: number
  moveNumber: number
}

const SpaceVisualizerMovesCard = ({
  moves,
  setMoves,
  selectedMoveId,
  setSelectedMoveId,
}: SpaceVisualizerMovesCardProps) => {
  // Tracks which variation lines are collapsed by the user. We invert the
  // semantic of the original code (which tracked "expanded") so we don't have
  // to seed the set on first render.
  const [collapsedLines, setCollapsedLines] = useState<Set<string>>(new Set())

  const selectedMoveRef = useRef<HTMLSpanElement | null>(null)

  const toggleLineExpansion = (moveId: string) => {
    setCollapsedLines(prev => {
      const next = new Set(prev)
      if (next.has(moveId)) {
        next.delete(moveId)
      } else {
        next.add(moveId)
      }
      return next
    })
  }

  const handleMoveClick = (node: { id?: string } | null) => {
    if (!node || !node.id) return
    setSelectedMoveId(node.id)
  }

  /**
   * Delete the currently selected move and everything downstream of it.
   * All the tree-mutation work happens in `deleteMoveFromTree`; this just
   * orchestrates the React state updates.
   */
  const handleDeleteMove = () => {
    if (!selectedMoveId) return
    const result = deleteMoveFromTree(moves, selectedMoveId)
    setMoves(result.moves)
    setSelectedMoveId(result.selectedMoveId)
  }

  /**
   * Flatten the move tree into an array of "lines" (each line is an array of
   * moves at a given indentation level). Variations start a new line at
   * level+1; we walk depth-first so the rendered order matches PGN reading
   * order.
   */
  const buildMoveLines = (
    moveId: string = 'root',
    level = 0,
    lines: DisplayMove[][] = [],
    currentLine: DisplayMove[] | null = null,
    moveNumber = 1,
    inheritedMoveNumber: number | null = null
  ): DisplayMove[][] => {
    if (!moveId || !moves[moveId]) return lines

    // Skip the sentinel root and dive into its first real move
    if (moveId === 'root' && moves[moveId].next) {
      return buildMoveLines(moves[moveId].next!, level, lines, [], 1)
    }

    const node = moves[moveId]
    if (!currentLine) currentLine = []

    // A new variation inherits its parent's move number rather than starting
    // back at 1 — that's why fully numbered Black-to-move variations look right.
    const assignedMoveNumber = inheritedMoveNumber ?? moveNumber

    const moveData: DisplayMove = {
      ...node,
      id: moveId,
      level,
      moveNumber: assignedMoveNumber,
    }

    currentLine.push(moveData)

    // When variations exist, flush the current line and recurse into each
    // variation as a new indented line.
    if (node.variations && node.variations.length > 0) {
      lines.push([...currentLine])

      node.variations.forEach(variationId => {
        buildMoveLines(variationId, level + 1, lines, [], moveNumber, assignedMoveNumber)
      })

      currentLine = []
    }

    // Continue along the mainline if there's a next move
    if (node.next) {
      return buildMoveLines(
        node.next,
        level,
        lines,
        currentLine,
        moveNumber + 1,
        null // reset inherited number once we're back on the mainline
      )
    }

    if (currentLine.length > 0) {
      lines.push(currentLine)
    }

    return lines
  }

  const displayMoveLines = () => {
    const lines = buildMoveLines()
    let visible = true
    let lastLevel = 0

    return (
      <div className="h-[340px] overflow-y-auto">
        {lines.map((line, lineIndex) => {
          const firstMove = line[0]
          const nextLine = lines[lineIndex + 1]
          const hasVariations = nextLine && nextLine[0].level > firstMove.level
          const isCollapsed = !collapsedLines.has(firstMove.id)

          // Visibility logic: when a parent line is collapsed, hide deeper
          // lines until we're back at or above its level.
          if (firstMove.level === 0) visible = true
          if (firstMove.level <= lastLevel) visible = true
          if (!visible) return null
          if (hasVariations && !isCollapsed) visible = false
          lastLevel = firstMove.level

          const colorClass = LEVEL_COLORS[firstMove.level % LEVEL_COLORS.length]

          return (
            <div
              key={lineIndex}
              className={`flex items-start ${colorClass}`}
              style={{ marginLeft: `${firstMove.level * 20}px` }}
            >
              {/* Toggle widget — collapses/expands the lines underneath */}
              <span
                className={`inline-block text-center font-mono mr-1.5 select-none ${
                  hasVariations ? 'cursor-pointer' : 'cursor-default'
                }`}
                style={{ width: '30px' }}
                onClick={hasVariations ? () => toggleLineExpansion(firstMove.id) : undefined}
              >
                {hasVariations ? (!isCollapsed ? '[+]' : '[-]') : '\u00A0\u00A0\u00A0'}
              </span>

              {/* Move list for this line */}
              <div className="flex flex-wrap items-center">
                {line.map((move, index) => {
                  const fullMoveNumber = Math.ceil(move.moveNumber / 2)
                  const isWhiteMove = move.moveNumber % 2 !== 0
                  const isStartOfLine = index === 0

                  let movePrefix = ''
                  if (isWhiteMove) {
                    movePrefix = `${fullMoveNumber}. `
                  } else if (isStartOfLine) {
                    movePrefix = `${fullMoveNumber}.. `
                  }

                  const isSelected = selectedMoveId === move.id

                  return (
                    <React.Fragment key={move.id}>
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <span
                            ref={isSelected ? selectedMoveRef : null}
                            className={`pr-1.5 cursor-pointer inline ${
                              isSelected ? 'font-bold underline' : ''
                            }`}
                            onClick={() => handleMoveClick(move)}
                          >
                            {movePrefix}
                            {move.san}
                          </span>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem
                            onSelect={() => {
                              setSelectedMoveId(move.id)
                              // Delay deletion until after the selection state
                              // updates so handleDeleteMove sees the right id
                              setTimeout(handleDeleteMove, 0)
                            }}
                          >
                            Delete Move
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>

                      {/* Transposition indicator — clicking jumps to the
                          canonical position this move transposes into */}
                      {move.transpositionParent &&
                        moves[move.transpositionParent] &&
                        moves[moves[move.transpositionParent].next!] && (
                          <span
                            className="pr-1.5 cursor-pointer inline text-muted-foreground"
                            onClick={() => {
                              const transpositionMove = {
                                ...moves[move.transpositionParent!],
                                id: move.transpositionParent!,
                              }
                              handleMoveClick(transpositionMove)
                            }}
                          >
                            ↪T
                          </span>
                        )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Keep the selected move in view as the user navigates the tree
  useEffect(() => {
    if (selectedMoveRef.current) {
      selectedMoveRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [selectedMoveId])

  // Subtract 1 for the root sentinel — only real moves are counted
  const moveCount = Object.keys(moves).length - 1

  return (
    <div id="moves" className="w-full bg-card text-card-foreground">
      <div className="flex items-center gap-2 pb-2">
        <span className="font-bold">
          {moveCount} {moveCount === 1 ? 'move' : 'moves'}
        </span>
      </div>
      <div className="h-px bg-border mb-2" />
      <div className="pl-1 pt-1">{displayMoveLines()}</div>
    </div>
  )
}

export default SpaceVisualizerMovesCard
