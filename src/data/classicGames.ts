export type ClassicGame = {
  Name: string
  Description?: string
  Site?: string
  Date?: string
  White: string
  Black: string
  Result?: string
  WhiteElo?: string
  BlackElo?: string
  Round?: string
  ECO?: string
  PlyCount?: string
  Moves: string
}

export const classicGames: ClassicGame[] = [
  {
    Name: 'The Opera Game (P. Morphy vs Duke Karl and Count Isouard)',
    Description:
      "The Opera Game is a well-known chess match that took place in 1858 at the Italian Opera House in Paris. American chess master Paul Morphy played against Duke Karl of Brunswick and Count Isouard, who consulted each other on their moves. Morphy's performance in this game is celebrated for its brilliance and decisiveness, marked by a series of aggressive and precise moves. The game is famous for showcasing Morphy's skills in rapid development, coordinated attacks, and tactical exploitation. The final sequence, where Morphy sacrifices his queen to achieve checkmate, is especially admired and frequently studied for its instructional value.",
    Site: 'Paris, France',
    Date: '1858',
    White: 'Morphy, Paul',
    Black: 'Duke Karl of Brunswick and Count Isouard',
    Result: '1-0',
    WhiteElo: '',
    BlackElo: '',
    PlyCount: '33',
    Moves:
      '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0',
  },
  {
    Name: 'The Evergreen Game (A. Anderssen vs J. Dufresne)',
    Description:
      "The Evergreen Game is a renowned chess match from 1852 between German chess masters Adolf Anderssen and Jean Dufresne. Known for its remarkable tactics and creative play, Anderssen's win is celebrated for its ingenuity and flair. The game stands out for a brilliant mid-game sequence, featuring a striking queen sacrifice that leads to a decisive checkmate. This match is frequently studied for its excellent demonstration of tactical themes and aggressive strategy, making it one of the most revered and instructive games in chess history.",
    Site: 'Berlin, Germany',
    Date: '1852',
    White: 'Anderssen, Adolf',
    Black: 'Dufresne, Jean',
    Result: '1-0',
    WhiteElo: '',
    BlackElo: '',
    PlyCount: '47',
    Moves:
      '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d3 8. Qb3 Qf6 9. e5 Qg6 10. Re1 Nge7 11. Ba3 b5 12. Qxb5 Rb8 13. Qa4 Bb6 14. Nbd2 Bb7 15. Ne4 Qf5 16. Bxd3 Qh5 17. Nf6+ gxf6 18. exf6 Rg8 19. Rad1 Qxf3 20. Rxe7+ Nxe7 21. Qxd7+ Kxd7 22. Bf5+ Ke8 23. Bd7+ Kf8 24. Bxe7# 1-0',
  },
  {
    Name: 'The Immortal Game (A. Anderssen vs L. Kieseritzky)',
    Description:
      "The Immortal Game is a famous chess match played in 1851 between Adolf Anderssen and Lionel Kieseritzky at Simpson's-in-the-Strand Divan in London. Celebrated for its incredible tactical brilliance and daring sacrifices, Anderssen gave up several major pieces, including both rooks, a bishop, and eventually his queen, to achieve a stunning checkmate with his remaining minor pieces. This game highlights Anderssen's bold and creative attacking style and is widely studied for its exemplary demonstration of rapid development, piece activity, and coordinated attacks. The Immortal Game is regarded as one of the most beautiful and influential chess games in history.",
    Site: 'London, England',
    Date: '1851',
    White: 'Anderssen, Adolf',
    Black: 'Kieseritzky, Lionel',
    Result: '1-0',
    WhiteElo: '',
    BlackElo: '',
    PlyCount: '45',
    Moves:
      '1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0',
  },
  {
    Name: 'The Game of the Century (D. Bryne vs R. Fischer)',
    Description:
      "The Game of the Century refers to an iconic chess match played on October 17, 1956, between Donald Byrne and 13-year-old Bobby Fischer at the Rosenwald Memorial Tournament in New York City. Fischer, who would later become a world champion, showcased exceptional skill and strategic genius far beyond his years. In an astonishing move, Fischer sacrificed his queen to achieve a winning positional advantage, ultimately securing a remarkable victory over Byrne. This game is renowned for its creativity and complexity, signaling Fischer's rise as a prodigious chess talent.",
    Site: 'New York, USA',
    Date: '1956.10.17',
    White: 'Byrne, Donald',
    Black: 'Fischer, Robert James',
    Result: '0-1',
    WhiteElo: '',
    BlackElo: '',
    PlyCount: '82',
    Moves:
      '1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2# 0-1',
  },
  {
    Name: "Garry Kasparov's Immortal Game",
    Description:
      "Garry Kasparov's Immortal Game against Veselin Topalov, played on January 20, 1999, during the Wijk aan Zee tournament in the Netherlands, is one of the most celebrated games in chess history. Kasparov, the reigning world champion, demonstrated extraordinary tactical brilliance and deep positional understanding. In this game, he sacrificed several pieces, including a rook and a queen, to launch a devastating attack on Topalov's king. The game is renowned for its stunning combinations and bold sacrifices, culminating in a victory that highlighted Kasparov's exceptional talent and creativity, securing his legacy as one of the greatest chess players of all time.",
    Site: 'Wijk aan Zee, Netherlands',
    Date: '1999.01.20',
    White: 'Kasparov, Garry',
    Black: 'Topalov, Veselin',
    Result: '1-0',
    WhiteElo: '2812',
    BlackElo: '2700',
    PlyCount: '87',
    Moves:
      '1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0',
  },
  {
    Name: 'The Pearl of Zandvoort (M. Euwe vs A. Alekhine)',
    Description:
      "The Pearl of Zandvoort is a famous chess game played between Max Euwe and Alexander Alekhine on October 15, 1935, during the World Chess Championship match in Zandvoort, Netherlands. In this game, Euwe, who would later become the world champion, faced the reigning champion Alekhine. The game is renowned for its intricate and beautiful combinations, showcasing Euwe's deep strategic understanding and tactical sharpness. Euwe's precise play and ability to exploit weaknesses in Alekhine's position led to a brilliant victory. This game is celebrated as one of the finest examples of chess artistry and is often cited as a masterpiece in the annals of chess history.",
    Site: 'Netherlands',
    Date: '1935.12.03',
    White: 'Euwe, Max',
    Black: 'Alekhine, Alexander',
    Result: '1-0',
    WhiteElo: '',
    BlackElo: '',
    PlyCount: '93',
    Moves:
      '1. d4 e6 2. c4 f5 3. g3 Bb4+ 4. Bd2 Be7 5. Bg2 Nf6 6. Nc3 O-O 7. Nf3 Ne4 8. O-O b6 9. Qc2 Bb7 10. Ne5 Nxc3 11. Bxc3 Bxg2 12. Kxg2 Qc8 13. d5 d6 14. Nd3 e5 15. Kh1 c6 16. Qb3 Kh8 17. f4 e4 18. Nb4 c5 19. Nc2 Nd7 20. Ne3 Bf6 21. Nxf5 Bxc3 22. Nxd6 Qb8 23. Nxe4 Bf6 24. Nd2 g5 25. e4 gxf4 26. gxf4 Bd4 27. e5 Qe8 28. e6 Rg8 29. Nf3 Qg6 30. Rg1 Bxg1 31. Rxg1 Qf6 32. Ng5 Rg7 33. exd7 Rxd7 34. Qe3 Re7 35. Ne6 Rf8 36. Qe5 Qxe5 37. fxe5 Rf5 38. Re1 h6 39. Nd8 Rf2 40. e6 Rd2 41. Nc6 Re8 42. e7 b5 43. Nd8 Kg7 44. Nb7 Kf6 45. Re6+ Kg5 46. Nd6 Rxe7 47. Ne4+ 1-0',
  },
  {
    Name: "Edward Lasker's King Walk",
    Description:
      "The legendary chess game between Edward Lasker and Sir George Thomas, played in London in 1912, is renowned for its spectacular King walk. In this dramatic encounter, Lasker, an accomplished chess master, executed a remarkable sequence of moves that forced Thomas's king to march across the board from its initial position to the other side, ultimately leading to a checkmate. This extraordinary game is celebrated for Lasker's creative and aggressive play, as well as the rare and memorable sight of a king being driven across the board. The game remains a classic example of strategic ingenuity and tactical brilliance in chess history.",
    Site: 'London, England',
    Date: '1912',
    White: 'Lasker, Edward',
    Black: 'Thomas, George Alan',
    Result: '1-0',
    WhiteElo: '',
    BlackElo: '',
    PlyCount: '35',
    Moves:
      '1. d4 e6 2. Nf3 f5 3. Nc3 Nf6 4. Bg5 Be7 5. Bxf6 Bxf6 6. e4 fxe4 7. Nxe4 b6 8. Ne5 O-O 9. Bd3 Bb7 10. Qh5 Qe7 11. Qxh7+ Kxh7 12. Nxf6+ Kh6 13. Neg4+ Kg5 14. h4+ Kf4 15. g3+ Kf3 16. Be2+ Kg2 17. Rh2+ Kg1 18. Kd2# 1-0',
  },
  {
    Name: 'The Rubinstein Immortal',
    Description:
      "The Rubinstein Immortal refers to an iconic chess game played by Akiba Rubinstein against George Rotlewi on December 26, 1907, in Lodz, Poland. This game is renowned for Rubinstein's remarkable tactical skill and strategic depth. Demonstrating exceptional chess mastery, Rubinstein executed a series of brilliant sacrifices and combinations, leading to a stunning final move that forced Rotlewi to resign. Celebrated for its aesthetic beauty and precision, this game highlights Rubinstein's extraordinary talent and creativity. It is one of the most famous and revered games in chess history, frequently studied and admired by chess enthusiasts and professionals.",
    Site: 'Lodz, Poland',
    Date: '1907.12.26',
    White: 'Rotlevi, George',
    Black: 'Rubinstein, Akiba',
    Result: '0-1',
    WhiteElo: '',
    BlackElo: '',
    PlyCount: '56',
    Moves:
      '1. d4 d5 2. Nf3 e6 3. e3 c5 4. c4 Nc6 5. Nc3 Nf6 6. dxc5 Bxc5 7. a3 a6 8. b4 Bd6 9. Bb2 O-O 10. Qd2 Qe7 11. Bd3 dxc4 12. Bxc4 b5 13. Bd3 Rd8 14. Qe2 Bb7 15. O-O Ne5 16. Nxe5 Bxe5 17. f4 Bc7 18. e4 Rac8 19. e5 Bb6+ 20. Kh1 Ng4 21. Be4 Qh4 22. g3 Rxc3 23. gxh4 Rd2 24. Qxd2 Bxe4+ 25. Qg2 Rh3 26. Bd4 Bxd4 27. Rf3 Bxf3 28. a4 Rxh2# 0-1',
  },
  {
    Name: 'The Gold Coins Game (S. Levitsky vs F. Marshall)',
    Description:
      "The Gold Coins Game is a famous chess match played between Stepan Levitsky and Frank Marshall on 20 July 1912, during a tournament in Breslau, Germany (now Wrocław, Poland). This game is celebrated for Marshall's extraordinary final move, which was so impressive that spectators allegedly threw gold coins onto the board in admiration. Marshall, known for his aggressive and imaginative style, executed a brilliant queen sacrifice that left Levitsky with no viable defense. The stunning combination and dramatic conclusion of this game have cemented it as one of the most memorable and exciting moments in chess history, showcasing Marshall's tactical genius and flair.",
    Site: 'Lodz, Poland',
    Date: '1912.07.20',
    White: 'Levitsky, Stepan',
    Black: 'Marshall, Frank',
    Result: '0-1',
    WhiteElo: '',
    BlackElo: '',
    PlyCount: '50',
    Moves:
      '1. d4 e6 2. e4 d5 3. Nc3 c5 4. Nf3 Nc6 5. exd5 exd5 6. Be2 Nf6 7. O-O Be7 8. Bg5 O-O 9. dxc5 Be6 10. Nd4 Bxc5 11. Nxe6 fxe6 12. Bg4 Qd6 13. Bh3 Rae8 14. Qd2 Bb4 15. Bxf6 Rxf6 16. Rad1 Qc5 17. Qe2 Bxc3 18. bxc3 Qxc3 19. Rxd5 Nd4 20. Qh5 Ref8 21. Re5 Rh6 22. Qg5 Rxh3 23. Rc5 Qg3 24. fxg3 Ne2+ 25. Kh1 Rxf1# 0-1',
  },
  {
    Name: 'The Polish Immortal (Glucksberg vs M. Najdorf)',
    Description:
      "The chess game between Miguel Najdorf and Glucksberg, played in 1929 in Warsaw, is celebrated as one of the most brilliant attacking games in chess history. Known as the Polish Immortal, this game showcases Najdorf's extraordinary tactical vision and aggressive play. Najdorf, one of the leading players of his time, unleashed a series of stunning sacrifices and combinations, culminating in a beautiful and decisive checkmate. This game is often studied for its creativity and precision, illustrating Najdorf's exceptional skill and his ability to find remarkable resources in complex positions. It remains a classic example of attacking chess at its finest.",
    Site: 'Lodz, Poland',
    Date: '1912.07.20',
    White: 'Glucksberg',
    Black: 'Najdorf, Miguel',
    Result: '0-1',
    WhiteElo: '',
    BlackElo: '',
    PlyCount: '44',
    Moves:
      '1. d4 f5 2. c4 Nf6 3. Nc3 e6 4. Nf3 d5 5. e3 c6 6. Bd3 Bd6 7. O-O O-O 8. Ne2 Nbd7 9. Ng5 Bxh2+ 10. Kh1 Ng4 11. f4 Qe8 12. g3 Qh5 13. Kg2 Bg1 14. Nxg1 Qh2+ 15. Kf3 e5 16. dxe5 Ndxe5+ 17. fxe5 Nxe5+ 18. Kf4 Ng6+ 19. Kf3 f4 20. exf4 Bg4+ 21. Kxg4 Ne5+ 22. fxe5 h5# 0-1',
  },
  {
    Name: 'Napoleon Bonaparte and Madame de Rémusat',
    Description:
      "The chess game between Napoleon Bonaparte and Madame de Rémusat is an intriguing historical anecdote rather than a documented chess match. Madame de Rémusat, a lady-in-waiting and confidante to Empress Josephine, is said to have played a casual game of chess with Napoleon. The game is often cited to illustrate Napoleon's strategic thinking and competitive nature. According to the story, Napoleon, despite being a novice, employed bold and aggressive tactics, eventually winning the game. This encounter highlights not only Napoleon's interest in chess but also his broader strategic mindset, which he famously applied on the battlefield. While the specific moves of the game are not recorded, the story remains a charming glimpse into the personal life of one of history's most famous figures.",
    Site: 'Rueil-Malmaison, France',
    Date: '1804.03.20',
    White: 'Bonaparte, Napoleon',
    Black: 'Madame De Remusat',
    Result: '1-0',
    WhiteElo: '',
    BlackElo: '',
    PlyCount: '28',
    Moves:
      '1. Nc3 e5 2. Nf3 d6 3. e4 f5 4. h3 fxe4 5. Nxe4 Nc6 6. Nfg5 d5 7. Qh5+ g6 8. Qf3 Nh6 9. Nf6+ Ke7 10. Nxd5+ Kd6 11. Ne4+ Kxd5 12. Bc4+ Kxc4 13. Qb3+ Kd4 14. Qd3# 1-0',
  },
  {
    Name: "Petrov's Immortal",
    Description:
      "The renowned chess game between Alexander Hoffmann and Alexander Petrov, often called Petrov's Immortal, was played in 1844. This game is acclaimed for Petrov's exceptional and inventive play, demonstrating his profound grasp of chess tactics and strategy. As one of the top players of his era and a chess theory pioneer, Petrov executed a series of brilliant combinations and sacrifices, leading to a remarkable victory. The game is especially famous for a queen sacrifice that resulted in a decisive and elegant checkmate. Petrov's Immortal is considered a chess masterpiece, often studied by enthusiasts for its creativity and instructional value.",
    Site: 'Saint Petersburg, Russia',
    Date: '1844',
    White: 'Hoffmann, Alexander',
    Black: 'Petrov, Alexander',
    Result: '0-1',
    WhiteElo: '',
    BlackElo: '',
    PlyCount: '40',
    Moves:
      '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. e5 Ne4 7. Bd5 Nxf2 8. Kxf2 dxc3+ 9. Kg3 cxb2 10. Bxb2 Ne7 11. Ng5 Nxd5 12. Nxf7 O-O 13. Nxd8 Bf2+ 14. Kh3 d6+ 15. e6 Nf4+ 16. Kg4 Nxe6 17. Nxe6 Bxe6+ 18. Kg5 Rf5+ 19. Kg4 h5+ 20. Kh3 Rf3# 0-1',
  },
  {
    Name: "Morphy's Metamorphosis",
    Description:
      "The game between Henry Edward Bird and Paul Morphy, often referred to as Morphy's Metamorphosis, was played in 1858. This iconic match is celebrated for Morphy's exceptional tactical prowess and strategic ingenuity. In this game, Morphy skillfully navigated through a seemingly balanced position, executing a series of brilliant moves that transformed the game into a decisive victory. His ability to create extraordinary combinations and carry them out with precision is beautifully illustrated, culminating in a spectacular checkmate. The game is renowned for its instructional value and is frequently studied by chess enthusiasts, showcasing Morphy's extraordinary talent and the artistic elegance of chess.",
    Site: 'London, England',
    Date: '1844',
    White: 'Bird, Henry Edward',
    Black: 'Morphy, Paul',
    Result: '0-1',
    WhiteElo: '',
    BlackElo: '',
    PlyCount: '64',
    Moves:
      '1. e4 e5 2. Nf3 d6 3. d4 f5 4. Nc3 fxe4 5. Nxe4 d5 6. Ng3 e4 7. Ne5 Nf6 8. Bg5 Bd6 9. Nh5 O-O 10. Qd2 Qe8 11. g4 Nxg4 12. Nxg4 Qxh5 13. Ne5 Nc6 14. Be2 Qh3 15. Nxc6 bxc6 16. Be3 Rb8 17. O-O-O Rxf2 18. Bxf2 Qa3 19. c3 Qxa2 20. b4 Qa1+ 21. Kc2 Qa4+ 22. Kb2 Bxb4 23. cxb4 Rxb4+ 24. Qxb4 Qxb4+ 25. Kc2 e3 26. Bxe3 Bf5+ 27. Rd3 Qc4+ 28. Kd2 Qa2+ 29. Kd1 Qb1+ 30. Kd2 Qxh1 31. Rc3 Qxh2 32. Ke1 Bd7 0-1',
  },
  {
    Name: 'Romantic Crush (W. Steinitz vs M. Chigorin)',
    Description:
      "The game between Wilhelm Steinitz and Mikhail Chigorin, often referred to as Romantic Crush, took place during their 1892 World Championship match in Havana, Cuba. This game is celebrated for Steinitz's brilliant attacking play and deep positional understanding, which epitomized the romantic era of chess. Steinitz, known as the father of modern chess strategy, combined tactical brilliance with strategic depth, executing a series of powerful moves that overwhelmed Chigorin. The game is particularly noted for a dazzling combination that led to a crushing victory. Romantic Crush remains a classic example of aggressive and imaginative chess, often studied for its artistic and instructional value.",
    Site: 'Havana, Cuba',
    Date: '1892.01.07',
    White: 'Steinitz, Wilhelm',
    Black: 'Chigorin, Mikhail',
    Result: '1-0',
    WhiteElo: '',
    BlackElo: '',
    PlyCount: '58',
    Moves:
      '1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. d3 d6 5. c3 g6 6. Nbd2 Bg7 7. Nf1 O-O 8. Ba4 Nd7 9. Ne3 Nc5 10. Bc2 Ne6 11. h4 Ne7 12. h5 d5 13. hxg6 fxg6 14. exd5 Nxd5 15. Nxd5 Qxd5 16. Bb3 Qc6 17. Qe2 Bd7 18. Be3 Kh8 19. O-O-O Rae8 20. Qf1 a5 21. d4 exd4 22. Nxd4 Bxd4 23. Rxd4 Nxd4 24. Rxh7+ Kxh7 25. Qh1+ Kg7 26. Bh6+ Kf6 27. Qh4+ Ke5 28. Qxd4+ Kf5 29. g4# 1-0',
  },
  {
    Name: "Pillsbury's Immortal",
    Description:
      "The Pillsbury Immortal is a famous game played between Harry Nelson Pillsbury and Siegbert Tarrasch. This notable game was played in 1895 at the Hastings International Chess Congress. It is celebrated for Pillsbury's remarkable tactical ingenuity and deep understanding of positional play. In this game, Pillsbury executed a series of brilliant moves and sacrifices, culminating in a stunning victory against Tarrasch, who was one of the leading players of the time. The Pillsbury Immortal is frequently studied by chess enthusiasts for its creativity and instructive value, showcasing Pillsbury's exceptional talent and strategic insight.",
    Site: 'Hastings, England',
    Date: '1895.08.06',
    White: 'Pillsbury, Harry Nelson',
    Black: 'Tarrasch, Siegbert',
    Result: '1-0',
    WhiteElo: '',
    BlackElo: '',
    PlyCount: '103',
    Moves:
      '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. Nf3 Nbd7 6. Rc1 O-O 7. e3 b6 8. cxd5 exd5 9. Bd3 Bb7 10. O-O c5 11. Re1 c4 12. Bb1 a6 13. Ne5 b5 14. f4 Re8 15. Qf3 Nf8 16. Ne2 Ne4 17. Bxe7 Rxe7 18. Bxe4 dxe4 19. Qg3 f6 20. Ng4 Kh8 21. f5 Qd7 22. Rf1 Rd8 23. Rf4 Qd6 24. Qh4 Rde8 25. Nc3 Bd5 26. Nf2 Qc6 27. Rf1 b4 28. Ne2 Qa4 29. Ng4 Nd7 30. R4f2 Kg8 31. Nc1 c3 32. b3 Qc6 33. h3 a5 34. Nh2 a4 35. g4 axb3 36. axb3 Ra8 37. g5 Ra3 38. Ng4 Bxb3 39. Rg2 Kh8 40. gxf6 gxf6 41. Nxb3 Rxb3 42. Nh6 Rg7 43. Rxg7 Kxg7 44. Qg3+ Kxh6 45. Kh1 Qd5 46. Rg1 Qxf5 47. Qh4+ Qh5 48. Qf4+ Qg5 49. Rxg5 fxg5 50. Qd6+ Kh5 51. Qxd7 c2 52. Qxh7# 1-0',
  },
  {
    Name: "Alekhine's Immortal",
    Description:
      "The game between Richard Réti and Alexander Alekhine, often referred to as Alekhine's Immortal, was played on May 15, 1925, during the Baden-Baden tournament in Germany. This game is celebrated for Alekhine's extraordinary tactical brilliance and deep combinational play. Alekhine, who was known for his aggressive and imaginative style, executed a series of stunning sacrifices and complex maneuvers, culminating in a spectacular victory. The game is often studied for its creativity and instructional value, highlighting Alekhine's exceptional talent and strategic insight. Alekhine's Immortal remains a classic example of attacking chess at its finest.",
    Site: 'Baden-Baden, Germany',
    Date: '1925.04.25',
    White: 'Reti, Richard',
    Black: 'Alekhine, Alexander',
    Result: '0-1',
    WhiteElo: '',
    BlackElo: '',
    PlyCount: '84',
    Moves:
      '1. g3 e5 2. Nf3 e4 3. Nd4 d5 4. d3 exd3 5. Qxd3 Nf6 6. Bg2 Bb4+ 7. Bd2 Bxd2+ 8. Nxd2 O-O 9. c4 Na6 10. cxd5 Nb4 11. Qc4 Nbxd5 12. N2b3 c6 13. O-O Re8 14. Rfd1 Bg4 15. Rd2 Qc8 16. Nc5 Bh3 17. Bf3 Bg4 18. Bg2 Bh3 19. Bf3 Bg4 20. Bh1 h5 21. b4 a6 22. Rc1 h4 23. a4 hxg3 24. hxg3 Qc7 25. b5 axb5 26. axb5 Re3 27. Nf3 cxb5 28. Qxb5 Nc3 29. Qxb7 Qxb7 30. Nxb7 Nxe2+ 31. Kh2 Ne4 32. Rc4 Nxf2 33. Bg2 Be6 34. Rcc2 Ng4+ 35. Kh3 Ne5+ 36. Kh2 Rxf3 37. Rxe2 Ng4+ 38. Kh3 Ne3+ 39. Kh2 Nxc2 40. Bxf3 Nd4 41. Rf2 Nxf3+ 42. Rxf3 Bd5 0-1',
  },
  {
    Name: 'End of Humanity (Deep Blue vs G. Kasparov)',
    Description:
      "The first game between Garry Kasparov and IBM's Deep Blue took place on February 10, 1996, in Philadelphia, Pennsylvania. This historic match marked the first time a reigning world chess champion faced off against a computer under standard chess tournament time controls. Deep Blue, a highly advanced computer developed by IBM, stunned the chess world by defeating Kasparov in this initial game. Kasparov played the Sicilian Defense, but Deep Blue's superior computational power and deep analysis allowed it to exploit weaknesses in Kasparov's position, leading to a significant victory for the machine. This game was a pivotal moment in the history of artificial intelligence and chess, showcasing the evolving capabilities of computer technology in strategic and complex tasks​",
    Site: 'Philadelphia, USA',
    Date: '1996.02.10',
    White: 'Comp Deep Blue',
    Black: 'Kasparov, Garry',
    Result: '1-0',
    WhiteElo: '',
    BlackElo: '2795',
    PlyCount: '73',
    Moves:
      '1. e4 c5 2. c3 d5 3. exd5 Qxd5 4. d4 Nf6 5. Nf3 Bg4 6. Be2 e6 7. h3 Bh5 8. O-O Nc6 9. Be3 cxd4 10. cxd4 Bb4 11. a3 Ba5 12. Nc3 Qd6 13. Nb5 Qe7 14. Ne5 Bxe2 15. Qxe2 O-O 16. Rac1 Rac8 17. Bg5 Bb6 18. Bxf6 gxf6 19. Nc4 Rfd8 20. Nxb6 axb6 21. Rfd1 f5 22. Qe3 Qf6 23. d5 Rxd5 24. Rxd5 exd5 25. b3 Kh8 26. Qxb6 Rg8 27. Qc5 d4 28. Nd6 f4 29. Nxb7 Ne5 30. Qd5 f3 31. g3 Nd3 32. Rc7 Re8 33. Nd6 Re1+ 34. Kh2 Nxf2 35. Nxf7+ Kg7 36. Ng5+ Kh6 37. Rxh7+ 1-0',
  },
  {
    Name: "Hikaru's Immortal Queen",
    Description:
      "Hikaru Nakamura's game against Boris Gelfand is a remarkable example of his daring and imaginative play. In this game, Hikaru sacrificed his queen six times, each move more audacious than the last. These sacrifices were not just flashy tactics but deeply calculated moves that demonstrated Hikaru's understanding of the position and his willingness to take immense risks to gain the upper hand. The queen sacrifices were instrumental in dismantling Gelfand's defenses, leading to a spectacular and memorable victory. This game is celebrated as one of Hikaru's most creative and aggressive displays of chess mastery.​",
    Site: 'Bursa, Turkey',
    Date: '2010.01.09',
    White: 'Boris Gelfand',
    Black: 'Hikaru Nakamura',
    Result: '0-1',
    WhiteElo: '2761',
    BlackElo: '2708',
    PlyCount: '66',
    Moves:
      '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. O-O Nc6 8. d5 Ne7 9. Nd2 Ne8 10. b4 f5 11. c5 Nf6 12. f3 f4 13. Nc4 g5 14. a4 Ng6 15. Ba3 Rf7 16. b5 dxc5 17. Bxc5 h5 18. a5 g4 19. b6 g3 20. Kh1 Bf8 21. d6 axb6 22. Bg1 Nh4 23. Re1 Nxg2 24. dxc7 Nxe1 25. Qxe1 g2+ 26. Kxg2 Rg7+ 27. Kh1 Bh3 28. Bf1 Qd3 29. Nxe5 Bxf1 30. Qxf1 Qxc3 31. Rc1 Qxe5 32. c8=Q Rxc8 33. Rxc8 Qe6 0-1',
  },

  {
    Name: "Ivanchuk's Immortal Game",
    Description:
      "On February 23, 1991, during the prestigious Linares tournament, Vassily Ivanchuk, playing as White, crafted a masterpiece against Garry Kasparov in what has come to be known as Ivanchuk's Immortal. The game, played in the Sicilian Defense, showcased Ivanchuk's deep understanding of complex positions and fearless attacking play. Opting for the Rossolimo Variation, Ivanchuk quickly created imbalances and dynamic chances, disorienting Kasparov's defense with a stunning knight maneuver and precise sacrifices. As the game progressed, Ivanchuk's pieces flowed effortlessly into attacking positions, leading to a dramatic and beautiful victory. His final moves were executed with surgical precision, forcing Kasparov to resign in the face of inevitable checkmate. This game is celebrated as one of the finest examples of attacking play in modern chess, a testament to Ivanchuk's extraordinary talent, and remains a timeless masterpiece in chess history.​",
    Site: 'Linares, Spain',
    Date: '1991.02.23',
    White: 'Vassily Ivanchuk',
    Black: 'Garry Kasparov',
    Result: '1-0',
    WhiteElo: '',
    BlackElo: '',
    PlyCount: '',
    Moves:
      '1. e4 c5 2. Nf3 d6 3. Bb5+ Nd7 4. d4 Nf6 5. O-O cxd4 6. Qxd4 a6 7. Bxd7+ Bxd7 8. Bg5 h6 9. Bxf6 gxf6 10. c4 e6 11. Nc3 Rc8 12. Kh1 h5 13. a4 h4 14. h3 Be7 15. b4 a5 16. b5 Qc7 17. Nd2 Qc5 18. Qd3 Rg8 19. Rae1 Qg5 20. Rg1 Qf4 21. Ref1 b6 22. Ne2 Qh6 23. c5 Rxc5 24. Nc4 Kf8 25. Nxb6 Be8 26. f4 f5 27. exf5 Rxf5 28. Rc1 Kg7 29. g4 Rc5 30. Rxc5 dxc5 31. Nc8 Bf8 32. Qd8 Qg6 33. f5 Qh6 34. g5 Qh5 35. Rg4 exf5 36. Nf4 Qh8 37. Qf6+ Kh7 38. Rxh4+ 1-0',
  },
]
