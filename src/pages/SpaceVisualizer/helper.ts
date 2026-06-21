import { Chess } from 'chess.js'
import { v4 as uuidv4 } from 'uuid'

/**
 * A single node in the move tree. The "root" node has san: "" and parent: null.
 * Every other move points back to its parent and forward via `next` (mainline)
 * and `variations` (alternative continuations from this position).
 */
export interface MoveNode {
  id?: string
  san: string
  next: string | null
  variations: string[]
  parent: string | null
  comment?: string
  fen?: string
  transpositionParent?: string | null
  transpositionChildren?: string[]
}

/**
 * The move tree is a flat dictionary keyed by move id, with a reserved "root"
 * entry that anchors the tree. Storing it flat (rather than as a nested
 * structure) makes lookups, mutations, and parent/variation links cheap.
 */
export type MoveTree = {
  root: MoveNode
  [moveId: string]: MoveNode
}

/**
 * Walk the move tree and produce a PGN string.
 *
 * Numbering rules:
 *  - White moves are emitted as `1. e4`
 *  - Black moves at the start of a variation are emitted as `1... c5`
 *  - Inline comments are wrapped in `{ ... }`
 *  - Variations are emitted in parentheses after the move they branch from
 */
export const convertMoveTreeToPGN = (moves: MoveTree): string => {
  const root = moves.root.next
  if (!root) return '' // Empty move tree

  let moveNumber = 1

  const processMove = (
    moveId: string,
    variation = false,
    variationMoveNumber: number | null = null
  ): string => {
    const move = moves[moveId]
    if (!move) return ''

    let moveText = ''

    const currentMoveNumber = variationMoveNumber !== null ? variationMoveNumber : moveNumber
    const pgnMoveNumber = Math.ceil(currentMoveNumber / 2)
    const isWhiteMove = currentMoveNumber % 2 !== 0 // Odd = White, Even = Black

    // Only print the move number for White moves, or for the first ply of a variation
    if (isWhiteMove || variation) {
      moveText += pgnMoveNumber + (isWhiteMove ? '. ' : '... ')
    }

    moveText += move.san

    const annotations: string[] = []
    if (move.comment) {
      annotations.push(`{ ${move.comment.trim()} }`)
    }
    if (annotations.length > 0) {
      moveText += ' ' + annotations.join(' ')
    }

    if (move.variations && move.variations.length > 0) {
      for (const variationId of move.variations) {
        moveText += ' (' + processMove(variationId, true, currentMoveNumber) + ')'
      }
    }

    if (move.next) {
      moveText += ' ' + processMove(move.next, false, currentMoveNumber + 1)
    }

    return moveText
  }

  return processMove(root).trim()
}

/**
 * Parse a PGN string into a flat move tree.
 *
 * The tokenizer is intentionally permissive: it strips comments, NAGs,
 * tag metadata, move numbers, and the result token, then walks the
 * remaining SAN tokens (with explicit "(" and ")" markers preserved as
 * variation boundaries) to build the tree.
 *
 * Each move gets a fresh uuid, so the resulting tree can be merged or
 * mutated freely without id collisions.
 */
export const processPGN = (pgn: string): MoveTree => {
  pgn = pgn.replace(/\{[^}]*\}/g, '') // Remove comments in {...}
  pgn = pgn.replace(/\[[^\]]*\]\s*/g, '') // Remove all PGN metadata, including [%cal] and [%csl]
  pgn = pgn.replace(/\$\d+/g, '') // Remove NAGs
  pgn = pgn.replace(/\d+\.\s*/g, '') // Remove move numbers
  pgn = pgn.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '') // Remove the result
  pgn = pgn.replace(/[^a-zA-Z0-9+#\-()_ \s]/g, '') // Remove unwanted characters

  const tokens = pgn
    .replace(/([()])/g, ' $1 ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  const buildMoveTree = (
    moveTokens: string[],
    startIndex = 0,
    parent: string | null = null
  ): Record<string, MoveNode> => {
    let moveTree: Record<string, MoveNode> = {}
    let currentMoveId: string = parent ?? 'root'
    let lastMainlineMove: string | null = parent
    let variationParent: string | null = parent
    let index = startIndex

    while (index < moveTokens.length) {
      const move = moveTokens[index]

      if (move === '(') {
        // Collect the contents of this variation up to the matching ")"
        let depth = 1
        const variationMoves: string[] = []
        index++

        while (index < moveTokens.length && depth > 0) {
          if (moveTokens[index] === '(') depth++
          else if (moveTokens[index] === ')') depth--
          if (depth > 0) variationMoves.push(moveTokens[index])
          index++
        }

        if (variationMoves.length > 0) {
          const variationTree = buildMoveTree(variationMoves, 0, variationParent)
          const variationRootId = Object.keys(variationTree)[0]

          if (variationRootId && lastMainlineMove && moveTree[lastMainlineMove]) {
            moveTree[lastMainlineMove].variations.push(variationRootId)
          }

          moveTree = { ...moveTree, ...variationTree }
        }
        continue
      }

      if (!move.trim() || move === '..') {
        index++
        continue
      }

      const moveId = uuidv4()
      const moveData: MoveNode = {
        id: moveId,
        san: move,
        next: null,
        variations: [],
        parent: currentMoveId,
      }

      if (currentMoveId !== 'root' && moveTree[currentMoveId]) {
        moveTree[currentMoveId].next = moveId
      }

      moveTree[moveId] = moveData
      variationParent = lastMainlineMove
      currentMoveId = moveId
      lastMainlineMove = moveId

      index++
    }

    return moveTree
  }

  const moves = buildMoveTree(tokens)

  return {
    root: {
      san: '',
      next: Object.keys(moves)[0] ?? null,
      variations: [],
      parent: null,
    },
    ...moves,
  }
}

// ---------------------------------------------------------------------------
// Move tree manipulation
//
// These pure functions are the canonical way to mutate the move tree. They
// take the current tree (plus context) and return a new tree along with the
// id of the move that should become selected. Components own React state and
// orchestrate `setMoves` / `setSelectedMoveId`, but never mutate nodes.
// ---------------------------------------------------------------------------

/**
 * The result of a tree mutation: the new tree, and the id of the move that
 * should be the new selection. If nothing changed, both values are unchanged
 * from the input.
 */
export interface MoveTreeUpdate {
  moves: MoveTree
  selectedMoveId: string
}

/**
 * Walk back from a move to the root, collecting SANs in mainline order.
 * Used to rebuild a chess.js game position for an arbitrary node in the tree.
 */
export const getMoveSequence = (moves: MoveTree, fromMoveId: string): string[] => {
  let currentMoveId: string | null | undefined = fromMoveId
  const movePath: string[] = []

  while (currentMoveId && moves[currentMoveId]) {
    const san = moves[currentMoveId].san
    if (san && san.trim() !== '') movePath.unshift(san)
    currentMoveId = moves[currentMoveId].parent
  }

  return movePath
}

/**
 * Id of the next move in the line. If the current move is a transposition
 * alias, advance from the canonical position instead.
 */
export const getNextMoveId = (moves: MoveTree, currentMoveId: string): string | null => {
  if (!currentMoveId) return null
  let currentMove = moves[currentMoveId]
  if (!currentMove) return null
  if (currentMove.transpositionParent) {
    currentMove = moves[currentMove.transpositionParent] || currentMove
  }
  return currentMove.next ?? null
}

/**
 * Id of the parent move (the move that led to this one).
 */
export const getPreviousMoveId = (moves: MoveTree, currentMoveId: string): string | null => {
  if (!currentMoveId || currentMoveId === 'root') return null
  const currentMove = moves[currentMoveId]
  return currentMove?.parent ?? null
}

/**
 * Add a move to the tree, with transposition detection.
 *
 * Rules:
 *  1. If a child with the same SAN already exists at the parent, return its
 *     id (no duplicate is created).
 *  2. If the resulting FEN matches an existing position elsewhere in the
 *     tree, link the new move to that canonical position via
 *     `transpositionParent`.
 *  3. The new move becomes the mainline `next` if the parent has no `next`;
 *     otherwise it joins the existing next move's `variations`.
 *
 * All updates are immutable — no node from `prevMoves` is mutated.
 */
export const addMoveToTree = (
  prevMoves: MoveTree,
  fromSelectedMoveId: string,
  moveSan: string,
  transpositionsEnabled = true
): MoveTreeUpdate => {
  if (!fromSelectedMoveId) {
    return { moves: prevMoves, selectedMoveId: fromSelectedMoveId }
  }

  const selectedMoveObject = prevMoves[fromSelectedMoveId]
  if (!selectedMoveObject) {
    return { moves: prevMoves, selectedMoveId: fromSelectedMoveId }
  }

  // If the selected move is itself a transposition alias, attach to the
  // canonical position rather than the alias.
  const baseMoveId = transpositionsEnabled
    ? selectedMoveObject.transpositionParent || fromSelectedMoveId
    : fromSelectedMoveId

  const baseMoveObject = prevMoves[baseMoveId]
  if (!baseMoveObject) {
    return { moves: prevMoves, selectedMoveId: fromSelectedMoveId }
  }

  // Already a child? Select the existing one rather than duplicating.
  const existingMoveEntry = Object.entries(prevMoves).find(
    ([, m]) => m.san === moveSan && m.parent === baseMoveId
  )
  if (existingMoveEntry) {
    return { moves: prevMoves, selectedMoveId: existingMoveEntry[0] }
  }

  // Build the move sequence (parent line + new move) and ask chess.js for the FEN.
  const moveSequence = getMoveSequence(prevMoves, baseMoveId)
  moveSequence.push(moveSan)

  let fen: string
  try {
    const chess = new Chess()
    moveSequence.forEach(m => {
      const result = chess.move(m)
      if (!result) throw new Error(`Invalid move: ${m}`)
    })
    fen = chess.fen()
  } catch {
    return { moves: prevMoves, selectedMoveId: fromSelectedMoveId }
  }

  // Drop half-move/full-move counters so positions reached via different
  // move orders match for transposition detection.
  const normalizedFen = fen.split(' ').slice(0, 4).join(' ')

  const transposedMoveEntry = Object.entries(prevMoves).find(
    ([, m]) => m.fen?.split(' ').slice(0, 4).join(' ') === normalizedFen
  )

  const newMoveId = uuidv4()
  let transpositionParent: string | null = null
  let nextMove: string | null = null

  // Immutable build of the next state. Every node we modify gets cloned.
  const newMoves: MoveTree = { ...prevMoves }

  if (transposedMoveEntry && transpositionsEnabled) {
    const [transposedMoveId, transposedMove] = transposedMoveEntry
    transpositionParent = transposedMoveId
    nextMove = transposedMove.next

    const existingChildren = transposedMove.transpositionChildren ?? []
    newMoves[transposedMoveId] = {
      ...transposedMove,
      transpositionChildren: existingChildren.includes(newMoveId)
        ? existingChildren
        : [...existingChildren, newMoveId],
    }
  }

  newMoves[newMoveId] = {
    san: moveSan,
    fen,
    next: nextMove,
    variations: [],
    parent: baseMoveId,
    transpositionParent,
  }

  if (!baseMoveObject.next) {
    newMoves[baseMoveId] = {
      ...baseMoveObject,
      next: newMoveId,
    }
  } else {
    const nextNode = newMoves[baseMoveObject.next]
    if (nextNode) {
      newMoves[baseMoveObject.next] = {
        ...nextNode,
        variations: [...(nextNode.variations ?? []), newMoveId],
      }
    }
  }

  return { moves: newMoves, selectedMoveId: newMoveId }
}

/**
 * Delete a move and everything downstream of it (the subtree of `next` + its
 * variations, recursively). The deleted move's *own* variations are NOT
 * deleted — the first variation is promoted to take the deleted move's
 * place in the mainline.
 *
 * Transposition links are cleaned up: aliases referenced as
 * `transpositionParent` get their children list pruned, and downstream
 * `transpositionChildren` have their parent pointer cleared.
 *
 * All updates are immutable — no node from `prevMoves` is mutated.
 */
export const deleteMoveFromTree = (prevMoves: MoveTree, moveIdToDelete: string): MoveTreeUpdate => {
  if (!moveIdToDelete || !prevMoves[moveIdToDelete]) {
    return { moves: prevMoves, selectedMoveId: moveIdToDelete || 'root' }
  }

  const selectedMove = prevMoves[moveIdToDelete]

  // Refuse to delete the root sentinel.
  if (selectedMove.san === '') {
    return { moves: prevMoves, selectedMoveId: moveIdToDelete }
  }

  const parentMoveId = selectedMove.parent ?? null
  const hasVariations = selectedMove.variations && selectedMove.variations.length > 0
  const newMainMoveId = hasVariations ? selectedMove.variations[0] : null

  const updatedMoves: MoveTree = { ...prevMoves }

  // Clone-on-write helper: ensures we never mutate a node still owned by prevMoves.
  const cloneNode = (id: string): MoveNode | undefined => {
    if (!updatedMoves[id]) return undefined
    if (updatedMoves[id] === prevMoves[id]) {
      updatedMoves[id] = { ...updatedMoves[id] }
    }
    return updatedMoves[id]
  }

  // 1) Strip ourselves out of the sibling variations of parent.next.
  if (parentMoveId && updatedMoves[parentMoveId]?.next) {
    const parentNextId = updatedMoves[parentMoveId].next!
    const parentNext = cloneNode(parentNextId)
    if (parentNext?.variations) {
      parentNext.variations = parentNext.variations.filter(id => id !== moveIdToDelete)
    }
  }

  // 2) Detach from a transposition parent — drop ourselves from its children list.
  if (selectedMove.transpositionParent) {
    const tpParent = cloneNode(selectedMove.transpositionParent)
    if (tpParent?.transpositionChildren) {
      const updatedChildren = tpParent.transpositionChildren.filter(id => id !== moveIdToDelete)
      tpParent.transpositionChildren = updatedChildren.length > 0 ? updatedChildren : undefined
    }
  }

  // 3) Detach any transposition children — clear their parent pointer.
  if (selectedMove.transpositionChildren) {
    selectedMove.transpositionChildren.forEach(childId => {
      const child = cloneNode(childId)
      if (child) child.transpositionParent = null
    })
  }

  // 4) If we were the mainline next of our parent, promote the first
  //    variation or null the link out entirely.
  if (parentMoveId && updatedMoves[parentMoveId]?.next === moveIdToDelete) {
    const parent = cloneNode(parentMoveId)
    if (parent) parent.next = hasVariations ? newMainMoveId : null
  }

  // 5) The promoted variation keeps its own future variations (minus
  //    itself) and inherits the deleted move's parent.
  if (hasVariations && newMainMoveId) {
    const promoted = cloneNode(newMainMoveId)
    if (promoted) {
      promoted.variations = selectedMove.variations.filter(id => id !== newMainMoveId)
      promoted.parent = parentMoveId
    }
  }

  // 6) Recursively collect ids rooted at selectedMove.next so we can drop
  //    the entire downstream subtree. We do NOT walk selectedMove.variations
  //    — those are being promoted/preserved, not deleted.
  const moveIdsToDelete = new Set<string>()
  const collect = (id: string | null | undefined) => {
    if (!id || moveIdsToDelete.has(id) || !updatedMoves[id]) return
    moveIdsToDelete.add(id)
    const m = updatedMoves[id]
    if (m.next) collect(m.next)
    if (m.variations) m.variations.forEach(collect)
  }
  if (selectedMove.next) collect(selectedMove.next)
  moveIdsToDelete.add(moveIdToDelete)

  moveIdsToDelete.forEach(id => {
    delete updatedMoves[id]
  })

  // Pick the next move to focus: the promoted variation if there was one,
  // otherwise fall back to the parent, otherwise root.
  const newSelection = hasVariations ? newMainMoveId! : (parentMoveId ?? 'root')

  return { moves: updatedMoves, selectedMoveId: newSelection }
}
