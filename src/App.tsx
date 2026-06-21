import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import Layout from '@/components/Layout'
import HomePage from '@/pages/HomePage/HomePage'
import Glossary from '@/pages/Glossary/Glossary'
import ChessQuotes from './pages/ChessQuotes/ChessQuotes'
import FischerRandomGenerator from './pages/FischerRandomGenerator/FischerRandomGenerator'
import Anagrams from './pages/Anagrams/Anagrams'
import Cryptograms from './pages/Cryptograms/Cryptograms'
import DecryptChess from './pages/DecryptChess/DecryptChess'
import GuessTheEval from './pages/GuessTheEval/GuessTheEval'
import Hangman from './pages/Hangman/Hangman'
import ImagePuzzle from './pages/ImagePuzzle/ImagePuzzle'
import RotatingImagePuzzle from './pages/RotatingImagePuzzle/RotatingImagePuzzle'
import ChessSlide from './pages/ChessSlide/ChessSlide'
import GuessTheOpening from './pages/GuessTheOpening/GuessTheOpening'
import Wordsearch from './pages/Wordsearch/Wordsearch'
import GuessWho from './pages/GuessWho/GuessWho'
import PlayTheOpening from './pages/PlayTheOpening/PlayTheOpening'
import Crossword from './pages/Crossword/Crossword'
import GuessTheElo from './pages/GuessTheElo/GuessTheElo'
import ChessClock from './pages/ChessClock/ChessClock'
import ClassicGames from './pages/ClassicGames/ClassicGames'
import MiniatureGames from './pages/MiniatureGames/MiniatureGames'
import WorldChampionships from './pages/WorldChampionships/WorldChampionships'
import CoordinateTrainer from './pages/CoordinateTrainer/CoordinateTrainer'
import PieceTrainer from './pages/PieceTrainer/PieceTrainer'
import MemoryTrainer from './pages/MemoryTrainer/MemoryTrainer'
import WhereAreMyPieces from './pages/WhereAreMyPieces/WhereAreMyPieces'
import NotationTrainer from './pages/NotationTrainer/NotationTrainer'
import SpaceVisualizer from './pages/SpaceVisualizer/SpaceVisualizer'
import FischerRandomTrainer from './pages/FischerRandomTrainer/FischerRandomTrainer'
import CheckmateTrainer from './pages/CheckmateTrainer/CheckmateTrainer'
import HiddenChess from './pages/HiddenChess/HiddenChess'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="glossary" element={<Glossary />} />
          <Route path="chessquotes" element={<ChessQuotes />} />
          <Route path="fischerrandomgenerator" element={<FischerRandomGenerator />} />
          <Route path="anagrams" element={<Anagrams />} />
          <Route path="cryptograms" element={<Cryptograms />} />
          <Route path="decryptchess" element={<DecryptChess />} />
          <Route path="guesstheeval" element={<GuessTheEval />} />
          <Route path="hangman" element={<Hangman />} />
          <Route path="imagepuzzle" element={<ImagePuzzle />} />
          <Route path="rotatingimagepuzzle" element={<RotatingImagePuzzle />} />
          <Route path="chessslide" element={<ChessSlide />} />
          <Route path="guesstheopening" element={<GuessTheOpening />} />
          <Route path="wordsearch" element={<Wordsearch />} />
          <Route path="guesswho" element={<GuessWho />} />
          <Route path="playtheopening" element={<PlayTheOpening />} />
          <Route path="crossword" element={<Crossword />} />
          <Route path="guesstheelo" element={<GuessTheElo />} />
          <Route path="chessclock" element={<ChessClock />} />
          <Route path="classicgames" element={<ClassicGames />} />
          <Route path="miniaturegames" element={<MiniatureGames />} />
          <Route path="worldchampionships" element={<WorldChampionships />} />
          <Route path="coordinatetrainer" element={<CoordinateTrainer />} />
          <Route path="piecetrainer" element={<PieceTrainer />} />
          <Route path="memorytrainer" element={<MemoryTrainer />} />
          <Route path="wherearemypieces" element={<WhereAreMyPieces />} />
          <Route path="notationtrainer" element={<NotationTrainer />} />
          <Route path="spacevisualizer" element={<SpaceVisualizer />} />
          <Route path="fischerrandomtrainer" element={<FischerRandomTrainer />} />
          <Route path="checkmatetrainer" element={<CheckmateTrainer />} />
          <Route path="hiddenchess" element={<HiddenChess />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
