// crosswordGenerator.ts
//
// Generates an interlocking crossword layout from a list of words. The
// algorithm is greedy with backtracking: it places the longest word
// horizontally at the origin, then for each remaining word it tries
// every position where a shared letter lets it cross an already-placed
// word, recursing on the first valid placement and backtracking if no
// downstream placement works. The original implementation is preserved
// verbatim — only types and the export shape have changed.

export interface PositionObj {
  wordStr: string
  xNum: number
  yNum: number
  isHorizon: boolean
  customNumber?: number
}

export interface CrosswordResult {
  height: number
  width: number
  positionObjArr: PositionObj[]
  ownerMap: unknown[][]
}

interface LetterMapEntry {
  x: number
  y: number
}

type LetterMap = Record<string, LetterMapEntry[]>

type Matrix = Record<number, Record<number, string>>

export const processCrossword = (arr: string[]): CrosswordResult | false => {
  // Sort ascending by length so we can `pop` the longest first.
  const sortedArr = sortArr(arr)
  return draw(
    [{ wordStr: sortedArr.pop() as string, xNum: 0, yNum: 0, isHorizon: true }],
    sortedArr.pop()
  )

  function sortArr(arr: string[]): string[] {
    return [...arr].sort((pre, nex) => pre.length - nex.length)
  }

  function shuffleArr<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = arr[i]
      arr[i] = arr[j]
      arr[j] = tmp
    }
    return arr
  }

  // Builds a letter → coordinate index from every placed word. Used to
  // find candidate crossing points for the next word in O(letters)
  // rather than scanning the whole grid.
  function letterMapOfPositionObjArr(positionObjArr: PositionObj[]): LetterMap {
    const rtn: LetterMap = {}
    positionObjArr.forEach(positionObj => {
      for (let i = 0, len = positionObj.wordStr.length; i < len; i += 1) {
        const letter = positionObj.wordStr[i]
        if (!rtn[letter]) rtn[letter] = []
        rtn[letter].push({
          x: positionObj.xNum + (positionObj.isHorizon ? i : 0),
          y: positionObj.yNum + (positionObj.isHorizon ? 0 : i),
        })
      }
    })
    return rtn
  }

  // For each letter of `wordStr`, find every existing occurrence of
  // that letter on the grid and check whether the word could cross
  // there without conflicting with any other placed letter or sitting
  // adjacent to one (which would create unintended word collisions).
  function findPosition({
    letterMap,
    wordStr,
  }: {
    letterMap: LetterMap
    wordStr: string | undefined
  }): PositionObj[] {
    const matrixObj = letterMapToMatrix(letterMap)
    if (!wordStr) return []
    const available: PositionObj[] = []
    const len = wordStr.length
    for (let i = 0; i < len; i += 1) {
      const letter = wordStr[i]
      if (!letterMap[letter]) continue
      letterMap[letter].forEach(xyObj => {
        const xNum = xyObj.x
        const yNum = xyObj.y
        // A crossing letter that has no neighbour to its right belongs
        // to a vertical word, so this candidate has to be horizontal
        // (and vice versa).
        const isHorizon = matrixObj[yNum][xNum + 1] === undefined

        if (isHorizon) {
          if (matrixObj[yNum][xNum - i - 1] !== undefined) return
          if (matrixObj[yNum][xNum - i + len] !== undefined) return
          for (let j = 0; j < len; j += 1) {
            if (i === j) continue
            if (matrixObj[yNum - 1] && matrixObj[yNum - 1][xNum - i + j] !== undefined) return
            if (matrixObj[yNum][xNum - i + j] !== undefined) return
            if (matrixObj[yNum + 1] && matrixObj[yNum + 1][xNum - i + j] !== undefined) return
          }
        } else {
          if (matrixObj[yNum - i - 1] && matrixObj[yNum - i - 1][xNum] !== undefined) return
          if (matrixObj[yNum - i + len] && matrixObj[yNum - i + len][xNum] !== undefined) return
          for (let j = 0; j < len; j += 1) {
            if (i === j || matrixObj[yNum - i + j] === undefined) continue
            if (matrixObj[yNum - i + j][xNum - 1] !== undefined) return
            if (matrixObj[yNum - i + j][xNum] !== undefined) return
            if (matrixObj[yNum - i + j][xNum + 1] !== undefined) return
          }
        }

        available.push({
          wordStr,
          xNum: xyObj.x - (isHorizon ? i : 0),
          yNum: xyObj.y - (isHorizon ? 0 : i),
          isHorizon,
        })
      })
    }
    return available
  }

  function letterMapToMatrix(letterMap: LetterMap): Matrix {
    const matrix: Matrix = {}
    Object.keys(letterMap).forEach(letter => {
      letterMap[letter].forEach(letterObj => {
        const y = letterObj.y
        const x = letterObj.x
        if (!matrix[y]) matrix[y] = {}
        matrix[y][x] = letter
      })
    })
    return matrix
  }

  // Recursive placement with backtracking. For each candidate position
  // returned by findPosition, try recursing with the next word from
  // the sorted pool; if all recursions fail, restore the word to the
  // pool and return false so the caller backtracks too.
  function draw(
    positionObjArr: PositionObj[],
    wordStr: string | undefined
  ): CrosswordResult | false {
    const letterMap = letterMapOfPositionObjArr(positionObjArr)
    if (!wordStr) return output(positionObjArr)
    const nextObjArr = findPosition({
      wordStr,
      letterMap: letterMap,
    })
    if (nextObjArr.length) {
      const arr = shuffleArr(nextObjArr)
      const theWordStr = sortedArr.pop()
      for (let i = 0; i < nextObjArr.length; i += 1) {
        const nextObj = arr[i]
        const ans = draw(positionObjArr.concat(nextObj), theWordStr)
        if (ans) {
          positionObjArr.push(nextObj)
          if (theWordStr !== undefined) sortedArr.push(theWordStr)
          return ans
        }
      }
      if (theWordStr !== undefined) sortedArr.push(theWordStr)
      return false
    }
    return false
  }

  // Normalises the placed-word coords back into a (0, 0)-origin grid
  // and builds the dimensions + ownerMap. Words are reordered to match
  // the original input order so the caller's numbering is stable.
  function output(positionObjArr: PositionObj[]): CrosswordResult {
    let translateX = 0
    let translateY = 0
    let maxX = 0
    let maxY = 0

    positionObjArr.forEach(positionObj => {
      const wordLen = positionObj.wordStr.length
      const isHorizon = positionObj.isHorizon
      const currentX = positionObj.xNum
      const currentY = positionObj.yNum
      const tailX = currentX + wordLen * (isHorizon ? 1 : 0)
      const tailY = currentY + wordLen * (isHorizon ? 0 : 1)
      if (tailX > maxX) maxX = tailX
      if (tailY > maxY) maxY = tailY
      if (currentX < translateX) translateX = currentX
      if (currentY < translateY) translateY = currentY
    })

    const order = arr.reduce<Record<string, number>>((iter, val, idx) => {
      iter[val] = idx
      return iter
    }, {})

    const newPositionObjArr = positionObjArr
      .map(positionObj => {
        const rtn = positionObj
        rtn.xNum -= translateX
        rtn.yNum -= translateY
        return rtn
      })
      .sort((a, b) => order[a.wordStr] - order[b.wordStr])

    const height = maxY - translateY
    const width = maxX - translateX

    const ownerMap: unknown[][] = new Array(height).fill(0).map(() => new Array(width))

    newPositionObjArr.forEach((positionObj, orderIdx) => {
      const letterArr = positionObj.wordStr.split('')
      const isHorizon = positionObj.isHorizon
      const startY = positionObj.yNum
      const startX = positionObj.xNum
      letterArr.forEach((letter, letterIdx) => {
        const x = startX + (isHorizon ? letterIdx : 0)
        const y = startY + (isHorizon ? 0 : letterIdx)
        const obj = { letter } as Record<string, unknown>
        const key = isHorizon ? 'h' : 'v'
        const target = (ownerMap[y][x] as Record<string, unknown>) || obj
        target[key] = orderIdx
        target[key + 'Idx'] = letterIdx
        if (!ownerMap[y][x]) ownerMap[y][x] = obj
      })
    })

    return {
      height,
      width,
      positionObjArr: newPositionObjArr,
      ownerMap,
    }
  }
}

export default processCrossword
