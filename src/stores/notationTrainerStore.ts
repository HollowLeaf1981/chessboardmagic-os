// stores/notationTrainerStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type PlayedGameInfo = {
  played: true
  lastPlayed: string
}

type PlayedGames = Record<string, Record<string, PlayedGameInfo>>

interface NotationTrainerState {
  playedGames: PlayedGames
  strictMode: boolean
  setStrictMode: (strictMode: boolean) => void
  markGamePlayed: (gameId: string) => void
  getGamePlayedInfo: (gameId: string) => PlayedGameInfo | null
  clearPlayedGames: () => void
}

function getCollectionKey(gameId: string) {
  return gameId.split('-')[0]
}

export const useNotationTrainerStore = create<NotationTrainerState>()(
  persist(
    (set, get) => ({
      playedGames: {},
      strictMode: true,

      setStrictMode: strictMode => {
        set({ strictMode })
      },

      markGamePlayed: gameId => {
        const key = getCollectionKey(gameId)

        set(state => ({
          playedGames: {
            ...state.playedGames,
            [key]: {
              ...(state.playedGames[key] ?? {}),
              [gameId]: {
                played: true,
                lastPlayed: new Date().toISOString(),
              },
            },
          },
        }))
      },

      getGamePlayedInfo: gameId => {
        const key = getCollectionKey(gameId)
        return get().playedGames[key]?.[gameId] ?? null
      },

      clearPlayedGames: () => {
        set({ playedGames: {} })
      },
    }),
    {
      name: 'notation-trainer-progress',
    }
  )
)
