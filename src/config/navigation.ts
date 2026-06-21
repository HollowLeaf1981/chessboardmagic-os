export interface NavItem {
  label: string
  to: string
  description?: string
}

export interface NavGroup {
  label: string
  to?: string
  description?: string
  items?: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Games',
    description:
      'A growing collection of chess-themed games and puzzles — guess openings, decode ciphers, race against the clock, and test your knowledge in fun new ways.',
    items: [
      { label: 'Anagrams', to: '/anagrams', description: 'Unscramble chess-related words.' },
      {
        label: 'Chess Slide',
        to: '/chessslide',
        description: 'Slider puzzle revealing a hidden chess opening.',
      },
      {
        label: 'Crossword',
        to: '/crossword',
        description: 'Solve chess-themed crossword puzzles.',
      },
      {
        label: 'Cryptograms',
        to: '/cryptograms',
        description: 'Crack ciphers to reveal chess terms.',
      },
      {
        label: 'Decrypt Chess',
        to: '/decryptchess',
        description: 'Substitution cipher puzzle game.',
      },
      {
        label: 'Guess the Elo',
        to: '/guesstheelo',
        description: 'Estimate player ratings from their moves.',
      },
      {
        label: 'Guess the Eval',
        to: '/guesstheeval',
        description: 'Predict the engine evaluation of positions.',
      },
      {
        label: 'Guess the Opening',
        to: '/guesstheopening',
        description: 'Wordle-style opening guessing game.',
      },
      {
        label: 'Guess Who',
        to: '/guesswho',
        description: 'Identify famous players from their photos.',
      },
      { label: 'Hangman', to: '/hangman', description: 'Classic hangman with chess vocabulary.' },
      {
        label: 'Image Puzzle',
        to: '/imagepuzzle',
        description: 'Jigsaw puzzles of famous chess players.',
      },
      {
        label: 'Play the Opening',
        to: '/playtheopening',
        description: 'Play out famous openings move by move.',
      },
      {
        label: 'Rotating Image Puzzle',
        to: '/rotatingimagepuzzle',
        description: 'Spin and click to reveal hidden chess images.',
      },
      { label: 'Wordsearch', to: '/wordsearch', description: 'Find hidden chess terms in a grid.' },
    ],
  },
  {
    label: 'Learn',
    description:
      'Interactive trainers and tools to sharpen your chess fundamentals — from coordinates and piece movement to memory, visualization, and endgame patterns.',
    items: [
      {
        label: 'Checkmate Trainer',
        to: '/checkmatetrainer',
        description: 'Practice essential checkmating patterns.',
      },
      {
        label: 'Coordinate Trainer',
        to: '/coordinatetrainer',
        description: 'Master board coordinates with interactive challenges.',
      },
      {
        label: 'Fischer Random Trainer',
        to: '/fischerrandomtrainer',
        description: 'Hand & Brain training for Chess960 positions.',
      },
      {
        label: 'Hidden Chess',
        to: '/hiddenchess',
        description: 'Play with hidden pieces to train visualization.',
      },
      {
        label: 'Memory Trainer',
        to: '/memorytrainer',
        description: 'Memorize a position, then recreate it from memory.',
      },
      {
        label: 'Notation Trainer',
        to: '/notationtrainer',
        description: 'Master chess notation by typing moves from real games.',
      },
      {
        label: 'Piece Trainer',
        to: '/piecetrainer',
        description: 'Sharpen piece movement with Timer and Fewest Moves modes.',
      },
      {
        label: 'Space Visualizer',
        to: '/spacevisualizer',
        description: 'See who controls the board, move by move.',
      },
      {
        label: 'Where Are My Pieces',
        to: '/wherearemypieces',
        description: 'Identify hidden pieces from famous games.',
      },
    ],
  },
  {
    label: 'Library',
    description:
      'Explore the heritage and language of chess — championship history, classic games, miniature gems, quotes, and rules of play.',
    items: [
      {
        label: 'Classic Games',
        to: '/classicgames',
        description: 'The greatest games in chess history.',
      },
      { label: 'Glossary', to: '/glossary', description: 'Demystify chess terminology.' },
      {
        label: 'Miniature Games',
        to: '/miniaturegames',
        description: 'Decisive victories in just a few moves.',
      },
      {
        label: 'Chess Quotes',
        to: '/chessquotes',
        description: 'Inspiring words from chess legends.',
      },
      {
        label: 'World Championships',
        to: '/worldchampionships',
        description: 'Play through historic championship matches.',
      },
    ],
  },
  {
    label: 'Tools',
    description:
      'Practical utilities for everyday chess — generate random starting positions and time your games with a customizable clock.',
    items: [
      {
        label: 'Chess Clock',
        to: '/chessclock',
        description: 'Customizable chess clock for over-the-board games.',
      },
      {
        label: 'Fischer Random',
        to: '/fischerrandomgenerator',
        description: 'Generate Chess960 starting positions.',
      },
    ],
  },
]
