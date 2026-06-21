// config/chessboard.tsx
import type { CSSProperties } from 'react'
import type { ChessboardOptions } from 'react-chessboard'

/**
 * Shared board themes.
 * These values can be reused by both react-chessboard and custom board-style components.
 */
export const themeColors = {
  'White Stripe Theme': {
    lightSquare: '#FFFFFF',
    lightSquarePattern:
      'repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.1) 0, rgba(0, 0, 0, 0.1) 2px, transparent 2px, transparent 4px)',
    darkSquare: '#CCCCCC',
    darkSquarePattern:
      'repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.1) 0, rgba(0, 0, 0, 0.1) 2px, transparent 2px, transparent 4px)',
  },
} as const

/**
 * Active board theme used across the app.
 */
export const BOARD_THEME = themeColors['White Stripe Theme']

/**
 * Active piece set.
 * Files are loaded from /public/img/chesspieces/{PIECE_SET}/{piece}.png
 */
export const PIECE_SET = 'wikipedia'

/**
 * Returns the square style for light or dark board squares.
 */
export function getSquareStyle(isDark: boolean): CSSProperties {
  return {
    backgroundColor: isDark ? BOARD_THEME.darkSquare : BOARD_THEME.lightSquare,
    backgroundImage: isDark ? BOARD_THEME.darkSquarePattern : BOARD_THEME.lightSquarePattern,
  }
}

/**
 * Returns the image path for a piece code such as wP, bN, or bq.
 */
export function getPieceImageSrc(pieceCode: string): string {
  if (!pieceCode) return ''

  const color = pieceCode[0].toLowerCase()
  const piece = pieceCode[1].toUpperCase()

  return `${import.meta.env.BASE_URL}/img/chesspieces/${PIECE_SET}/${color}${piece}.png`
}

/**
 * Builds the custom piece renderer map for react-chessboard.
 */
function buildPieces() {
  const codes = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'] as const

  return Object.fromEntries(
    codes.map(code => [
      code,
      () => (
        <img src={getPieceImageSrc(code)} alt={code} style={{ width: '100%', height: '100%' }} />
      ),
    ])
  )
}

/**
 * Default options shared by every <Chessboard /> instance.
 */
export const DEFAULT_CHESSBOARD_OPTIONS: Partial<ChessboardOptions> = {
  lightSquareStyle: getSquareStyle(false),
  darkSquareStyle: getSquareStyle(true),
  pieces: buildPieces(),
  animationDurationInMs: 200,
  showNotation: false,
}
