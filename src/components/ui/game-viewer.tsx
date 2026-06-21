import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Arrow } from 'react-chessboard'
import { Chess } from 'chess.js'
import {
  ArrowUpDown,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  RotateCcw,
  SkipForward,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DEFAULT_CHESSBOARD_OPTIONS } from '@/config/chessboard'

type BoardOrientation = 'white' | 'black'
type NotationPosition = 'side' | 'bottom'

type HighlightMap = Record<number, string | undefined>
type CommentMap = Record<number, string | undefined>
type BoardSquareStyles = Record<string, CSSProperties>

type GameViewerProps = {
  BlackPlayer?: string
  BlackElo?: string | number
  WhitePlayer?: string
  WhiteElo?: string | number
  Date?: string
  Result?: string
  Moves: string
  WhiteImage?: string
  BlackImage?: string
  SquareHighlights?: HighlightMap
  ArrowsHighlights?: HighlightMap
  Comments?: CommentMap
  BoardOrientation?: BoardOrientation
  BoardOnly?: boolean
  NotationPosition?: NotationPosition
  StartingPosition?: number
  showCopyPGN?: boolean
  showWhite?: boolean
  showBlack?: boolean
  Event?: string
  Round?: string | number
  Site?: string
  PlyCount?: string | number
}

const RESULT_TOKENS = ['1-0', '0-1', '1/2-1/2', '*']

const ARROW_COLOUR_MAP: Record<string, string> = {
  B: 'blue',
  G: 'green',
  R: 'red',
}

const SQUARE_COLOUR_MAP: Record<string, string> = {
  B: 'blue',
  G: 'green',
  R: 'red',
}

/**
 * Game Viewer
 * -----------
 * Reusable chess game playback component.
 *
 * It receives a SAN move string, builds board positions with chess.js,
 * and lets the user move through the game with buttons, keyboard
 * arrows, or by clicking directly on the notation.
 *
 * This open-source version is intentionally self-contained: no user
 * profile, no custom theme system, no translations, no analytics, no
 * Material UI, and no database interaction.
 */
function GameViewer({
  BlackPlayer,
  BlackElo,
  WhitePlayer,
  WhiteElo,
  Date,
  Result,
  Moves,
  WhiteImage,
  BlackImage,
  SquareHighlights,
  ArrowsHighlights,
  Comments,
  BoardOrientation = 'white',
  BoardOnly = false,
  NotationPosition = 'side',
  StartingPosition = 0,
  showCopyPGN = true,
  showWhite = true,
  showBlack = true,
  Event,
  Round,
  Site,
  PlyCount,
}: GameViewerProps) {
  // The chess.js instance currently rendered on the board.
  const [game, setGame] = useState<Chess>(new Chess())

  // Current move index in the playable move list.
  // 0 = starting position, N = after N moves have been played.
  const [currentMove, setCurrentMove] = useState<number>(0)

  // Board orientation is local so the viewer can flip the board without
  // changing the parent component's data.
  const [orientation, setOrientation] = useState<BoardOrientation>(BoardOrientation)

  // Current board annotations, derived from the optional compact
  // highlight maps.
  const [boardArrows, setBoardArrows] = useState<Arrow[]>([])
  const [boardSquareStyles, setBoardSquareStyles] = useState<BoardSquareStyles>({})

  // Tracks player image load failures so missing images can fall back
  // to a letter, matching the old Avatar-style behaviour.
  const [failedPlayerImages, setFailedPlayerImages] = useState<Record<string, boolean>>({})

  // Small local copy feedback. This replaces the old snackbar.
  const [pgnCopied, setPgnCopied] = useState<boolean>(false)

  /**
   * Normalise the move text into playable SAN tokens.
   *
   * The source data may be plain SAN, or it may contain move numbers
   * such as "1. e4 e5". Move numbers are removed. A trailing result
   * token is kept separately so it is never passed into chess.js.
   */
  const { playableMoves, gameResult } = useMemo(() => {
    const rawTokens = Moves.split(/\s+/)
      .map(token => token.trim())
      .filter(Boolean)
      .filter(token => !token.includes('.'))

    const lastToken = rawTokens[rawTokens.length - 1]
    const trailingResult = RESULT_TOKENS.includes(lastToken) ? lastToken : undefined

    return {
      playableMoves: trailingResult ? rawTokens.slice(0, -1) : rawTokens,
      gameResult: Result || trailingResult || '*',
    }
  }, [Moves, Result])

  const hasMoves = playableMoves.length > 0

  /**
   * Rebuild the board from the starting position to a specific move.
   *
   * This is slightly more work than undo/redo, but it keeps direct
   * notation clicks, reset, last-move navigation, and starting-position
   * loading simple and reliable.
   */
  const goToMove = useCallback(
    (moveIndex: number) => {
      const safeMoveIndex = Math.max(0, Math.min(moveIndex, playableMoves.length))
      const newGame = new Chess()

      for (let i = 0; i < safeMoveIndex; i++) {
        newGame.move(playableMoves[i])
      }

      setGame(newGame)
      setCurrentMove(safeMoveIndex)
    },
    [playableMoves]
  )

  // Reset the board whenever the move source or requested starting
  // position changes.
  useEffect(() => {
    goToMove(StartingPosition)
  }, [goToMove, StartingPosition])

  // Keep local orientation in sync if the parent changes the default.
  useEffect(() => {
    setOrientation(BoardOrientation)
  }, [BoardOrientation])

  // Convert compact arrow annotations into react-chessboard v5 arrows.
  // Example: "Ge2e4" means green arrow from e2 to e4.
  const processArrows = useCallback((arrows: HighlightMap | undefined, moveIndex: number) => {
    if (!arrows || !arrows[moveIndex]) {
      setBoardArrows([])
      return
    }

    const processedArrows: Arrow[] = arrows[moveIndex]
      .split(',')
      .map(rawArrow => {
        const color = ARROW_COLOUR_MAP[rawArrow[0]]
        const startSquare = rawArrow.slice(1, 3)
        const endSquare = rawArrow.slice(3, 5)

        return {
          startSquare,
          endSquare,
          color,
        }
      })
      .filter((arrow): arrow is Arrow => Boolean(arrow.color))

    setBoardArrows(processedArrows)
  }, [])

  // Convert compact square annotations into react-chessboard square
  // styles. Example: "Re4" means red highlight on e4.
  const processSquares = useCallback((squares: HighlightMap | undefined, moveIndex: number) => {
    if (!squares || !squares[moveIndex]) {
      setBoardSquareStyles({})
      return
    }

    const processedSquares = squares[moveIndex]
      .split(',')
      .reduce<BoardSquareStyles>((acc, rawSquare) => {
        const color = SQUARE_COLOUR_MAP[rawSquare[0]]
        const square = rawSquare.slice(1)

        if (color) {
          acc[square] = {
            boxShadow: `inset 0 0 0 3px ${color}`,
            borderRadius: '10%',
            boxSizing: 'border-box',
          }
        }

        return acc
      }, {})

    setBoardSquareStyles(processedSquares)
  }, [])

  // Move-based highlights are attached to the move just played, so the
  // highlighted index is currentMove - 1.
  useEffect(() => {
    processArrows(ArrowsHighlights, currentMove - 1)
    processSquares(SquareHighlights, currentMove - 1)
  }, [ArrowsHighlights, SquareHighlights, currentMove, processArrows, processSquares])

  const handleNextMove = useCallback(() => {
    if (currentMove < playableMoves.length) {
      goToMove(currentMove + 1)
    }
  }, [currentMove, playableMoves.length, goToMove])

  const handlePreviousMove = useCallback(() => {
    if (currentMove > 0) {
      goToMove(currentMove - 1)
    }
  }, [currentMove, goToMove])

  const handleResetGame = useCallback(() => {
    goToMove(0)
  }, [goToMove])

  const handleLastMove = useCallback(() => {
    goToMove(playableMoves.length)
  }, [goToMove, playableMoves.length])

  const toggleOrientation = () => {
    setOrientation(prev => (prev === 'white' ? 'black' : 'white'))
  }

  // Keyboard navigation through the game.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        handleNextMove()
      }

      if (event.key === 'ArrowLeft') {
        handlePreviousMove()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleNextMove, handlePreviousMove])

  /**
   * Rebuild a complete PGN from the supplied metadata and move text.
   * This keeps the component useful without needing any app-level
   * export service.
   */
  const generatePGN = () => {
    const formattedMoves = playableMoves
      .map((move, index) => (index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ${move}` : move))
      .join(' ')

    const headers = [
      `[Event "${Event || '?'}"]`,
      `[Site "${Site || '?'}"]`,
      `[Date "${Date || '????.??.??'}"]`,
      `[Round "${Round || '?'}"]`,
      `[White "${WhitePlayer || '?'}"]`,
      `[Black "${BlackPlayer || '?'}"]`,
      `[Result "${gameResult}"]`,
      `[WhiteElo "${WhiteElo || '?'}"]`,
      `[BlackElo "${BlackElo || '?'}"]`,
    ]

    return `${headers.join('\n')}\n\n${formattedMoves} ${gameResult}`
  }

  const handleCopyPGN = async () => {
    await navigator.clipboard.writeText(generatePGN())

    setPgnCopied(true)

    window.setTimeout(() => {
      setPgnCopied(false)
    }, 2000)
  }

  const getPlayerImageKey = (
    playerName?: string,
    explicitImageKey?: string
  ): string | undefined => {
    if (explicitImageKey) return explicitImageKey
    if (!playerName) return undefined

    return playerName.split(', ')[0].toUpperCase()
  }

  const getPlayerInitial = (playerName?: string): string => {
    if (!playerName) return '?'

    const surname = playerName.split(', ')[0]
    return surname.charAt(0).toUpperCase()
  }

  const renderPlayerCard = (
    colour: 'white' | 'black',
    playerName?: string,
    elo?: string | number,
    imageKey?: string
  ) => {
    if (!playerName) return null

    const isWhite = colour === 'white'
    const resolvedImageKey = getPlayerImageKey(playerName, imageKey)
    const imageSrc = resolvedImageKey ? `/img/players/${resolvedImageKey}.png` : undefined
    const imageFailed = resolvedImageKey ? failedPlayerImages[resolvedImageKey] : true

    return (
      <div
        className={
          isWhite
            ? 'flex items-center border border-border bg-white px-3 py-2 text-black'
            : 'flex items-center bg-black px-3 py-2 text-white'
        }
      >
        <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center bg-muted text-sm font-semibold text-foreground">
          {imageSrc && !imageFailed ? (
            <img
              src={imageSrc}
              alt={playerName}
              className="h-10 w-10 object-cover"
              onError={() => {
                if (!resolvedImageKey) return

                setFailedPlayerImages(prev => ({
                  ...prev,
                  [resolvedImageKey]: true,
                }))
              }}
            />
          ) : (
            <span>{getPlayerInitial(playerName)}</span>
          )}
        </div>

        <div className="flex flex-col text-sm">
          <span>{playerName}</span>
          {elo !== undefined && elo !== null && <span>{elo}</span>}
        </div>
      </div>
    )
  }

  const hasDisplayValue = (value?: string | number): boolean => {
    return value !== undefined && value !== null && String(value).trim() !== ''
  }

  const renderMetadataItem = (label: string, value?: string | number) => {
    if (!hasDisplayValue(value)) return null

    return (
      <span>
        {label}: <span className="font-semibold">{value}</span>
      </span>
    )
  }

  const renderMetadataValue = (value?: string | number) => {
    if (!hasDisplayValue(value)) return null

    return <span className="font-semibold">{value}</span>
  }

  const renderGameMetadata = () => {
    const displayResult = gameResult !== '*' ? gameResult : undefined

    const items = [
      renderMetadataValue(Event),
      renderMetadataItem('Site', Site),
      renderMetadataItem('Date', Date),
      renderMetadataItem('Round', Round),
      renderMetadataItem('Result', displayResult),
      renderMetadataItem('Ply Count', PlyCount),
    ].filter(Boolean)

    if (items.length === 0) return null

    return (
      <p className="mb-3 flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <span key={index}>
            {item}
            {index < items.length - 1 && <span>,</span>}
          </span>
        ))}
      </p>
    )
  }

  const boardColumn = (
    <div id="chessboard" className="w-full max-w-[500px] min-w-0">
      {/* Player cards are placed above or below the board according to
          the current orientation. */}
      {showWhite &&
        !BoardOnly &&
        orientation === 'black' &&
        renderPlayerCard('white', WhitePlayer, WhiteElo, WhiteImage)}

      {showBlack &&
        !BoardOnly &&
        orientation === 'white' &&
        renderPlayerCard('black', BlackPlayer, BlackElo, BlackImage)}

      <div className="aspect-square w-full overflow-hidden">
        <Chessboard
          options={{
            ...DEFAULT_CHESSBOARD_OPTIONS,
            position: game.fen(),
            boardOrientation: orientation,
            allowDragging: false,
            allowDrawingArrows: false,
            squareStyles: boardSquareStyles,
            arrows: boardArrows,
            boardStyle: {
              ...DEFAULT_CHESSBOARD_OPTIONS.boardStyle,
              width: '100%',
              height: '100%',
            },
          }}
        />
      </div>

      {showWhite &&
        !BoardOnly &&
        orientation === 'white' &&
        renderPlayerCard('white', WhitePlayer, WhiteElo, WhiteImage)}

      {showBlack &&
        !BoardOnly &&
        orientation === 'black' &&
        renderPlayerCard('black', BlackPlayer, BlackElo, BlackImage)}

      {/* Playback controls. */}
      {hasMoves && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            variant="secondary"
            onClick={handleResetGame}
            disabled={currentMove === 0}
            className="h-10 w-10 p-0"
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            onClick={handlePreviousMove}
            disabled={currentMove === 0}
            className="h-10 w-10 p-0"
            title="Go to previous move"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            onClick={handleNextMove}
            disabled={currentMove >= playableMoves.length}
            className="h-10 w-10 p-0"
            title="Go to next move"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            onClick={handleLastMove}
            disabled={currentMove >= playableMoves.length}
            className="h-10 w-10 p-0"
            title="Go to last move"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            onClick={toggleOrientation}
            className="h-10 w-10 p-0"
            title="Toggle orientation"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>

          {showCopyPGN && (
            <Button
              variant="secondary"
              onClick={handleCopyPGN}
              className="h-10 w-10 p-0"
              title="Copy PGN"
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {pgnCopied && <p className="mt-2 text-center text-sm text-muted-foreground">PGN copied</p>}
    </div>
  )

  const notationColumn = (
    <div className="w-full text-sm leading-7">
      {renderGameMetadata()}

      <div className="flex flex-wrap">
        {playableMoves.map((move, index) => {
          const isCurrent = index + 1 === currentMove
          const moveText = index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ${move}` : move

          return (
            <span key={`move-comment-${index}`} className="mr-2 inline">
              <button
                type="button"
                onClick={() => goToMove(index + 1)}
                className={isCurrent ? 'font-bold underline underline-offset-4' : 'cursor-pointer'}
              >
                {moveText}
              </button>

              {Comments?.[index] && (
                <span className="ml-1 text-muted-foreground">{Comments[index]}</span>
              )}
            </span>
          )
        })}

        {gameResult && gameResult !== '*' && (
          <span className="mr-2 inline font-semibold">{gameResult}</span>
        )}
      </div>
    </div>
  )

  return (
    <div className="w-full pt-1">
      <div
        className={
          NotationPosition === 'bottom' ? 'flex flex-col gap-4' : 'flex flex-col gap-4 md:flex-row'
        }
      >
        {boardColumn}

        {!BoardOnly && hasMoves && notationColumn}
      </div>
    </div>
  )
}

export default GameViewer
