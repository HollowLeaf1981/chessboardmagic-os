import { useState, useEffect, useMemo, useRef } from 'react'
import { Maximize, Minimize, Settings, Play, Pause, RotateCcw, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

import './ChessClock.css'

// Active side: which player's clock is currently counting down.
type Player = 'white' | 'black'

// A preset time control. `time` is total clock time in milliseconds,
// `increment` is the per-move bonus in milliseconds. `type` is a stable
// key used for both the dropdown value and to look the preset back up.
interface Preset {
  type: string
  time: number
  increment: number
}

/**
 * Chess Clock
 * ---------------
 * A two-sided chess clock for over-the-board play, designed primarily
 * for mobile (rotate-and-share phone use case). The top panel is
 * White's clock, flipped 180° so it reads right-way-up to the player
 * sitting on that side; the bottom is Black's. Tapping the active
 * panel's clock ends that side's turn and starts the other's.
 *
 * Time and increment are configurable via a preset picker (lots of
 * standard time controls, from 1+0 bullet up to 120+30 classical), or
 * via a manual edit dialog for the current displayed times. Restart
 * confirmation is two-step to guard against fat-fingered taps in the
 * middle of a game.
 */
function ChessClock() {
  // Current remaining time for each side, in milliseconds. State is
  // synced from the refs below via setState so React re-renders.
  const [whiteTime, setWhiteTime] = useState<number>(600000)
  const [blackTime, setBlackTime] = useState<number>(600000)
  // Which side's clock is ticking when the timer is running.
  const [activePlayer, setActivePlayer] = useState<Player>('white')
  // Whether the clock is actively counting down.
  const [isRunning, setIsRunning] = useState<boolean>(false)
  // Dialog visibility flags. Each one pauses the clock when opened.
  const [isConfigurationOpen, setIsConfigurationOpen] = useState<boolean>(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false)
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false)
  // The current preset (committed) times — what Restart will reset to.
  const [whiteCustomTime, setWhiteCustomTime] = useState<number>(600000)
  const [blackCustomTime, setBlackCustomTime] = useState<number>(600000)
  // Per-move increment for each side. Not currently added back on tap
  // (the original didn't either) — kept here so the UI can show it.
  const [whiteIncrement, setWhiteIncrement] = useState<number>(0)
  const [blackIncrement, setBlackIncrement] = useState<number>(0)

  // Refs hold the authoritative time values for the animation loop.
  // We can't use React state inside requestAnimationFrame because
  // setState is batched/async; refs let us read-modify-write at 60fps
  // without going through a render cycle for every tick.
  const whiteTimeRef = useRef<number>(600000)
  const blackTimeRef = useRef<number>(600000)
  // Timestamp of the previous frame, used to compute elapsed delta.
  const lastUpdateRef = useRef<number | null>(null)
  // Handle for the active rAF callback, so we can cancel it on stop.
  const animationFrameRef = useRef<number | null>(null)

  // Temporary state for the configuration dialog — bound to its inputs
  // so the player can preview a preset without committing it until
  // they hit Save. Cancel discards back to the committed values.
  const [tempWhiteCustomTime, setTempWhiteCustomTime] = useState<number>(600000)
  const [tempBlackCustomTime, setTempBlackCustomTime] = useState<number>(600000)
  const [tempWhiteIncrement, setTempWhiteIncrement] = useState<number>(0)
  const [tempBlackIncrement, setTempBlackIncrement] = useState<number>(0)
  // Temporary state for the edit dialog — same pattern. Edited values
  // override the displayed time but not the preset/restart target.
  const [tempWhiteTime, setTempWhiteTime] = useState<number>(600000)
  const [tempBlackTime, setTempBlackTime] = useState<number>(600000)

  // Whether the clock is filling the viewport. We use the Fullscreen
  // API so this also hides the browser chrome on mobile.
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  // The currently-selected preset key, drives the Select dropdown.
  const [selectedPreset, setSelectedPreset] = useState<string>('ten_min_no_increment')

  // The list of time-control presets. Memoised so identity is stable
  // across renders — not strictly necessary here but avoids any
  // surprise if a child component depends on it.
  const presets = useMemo<Preset[]>(
    () => [
      { type: 'one_min_no_increment', time: 1 * 60 * 1000, increment: 0 },
      { type: 'one_min_one_sec_increment', time: 1 * 60 * 1000, increment: 1000 },
      { type: 'two_min_no_increment', time: 2 * 60 * 1000, increment: 0 },
      { type: 'two_min_one_sec_increment', time: 2 * 60 * 1000, increment: 1000 },
      { type: 'three_min_no_increment', time: 3 * 60 * 1000, increment: 0 },
      { type: 'three_min_two_sec_increment', time: 3 * 60 * 1000, increment: 2000 },
      { type: 'three_min_three_sec_increment', time: 3 * 60 * 1000, increment: 3000 },
      { type: 'five_min_no_increment', time: 5 * 60 * 1000, increment: 0 },
      { type: 'five_min_two_sec_increment', time: 5 * 60 * 1000, increment: 2000 },
      { type: 'five_min_three_sec_increment', time: 5 * 60 * 1000, increment: 3000 },
      { type: 'ten_min_no_increment', time: 10 * 60 * 1000, increment: 0 },
      { type: 'ten_min_five_sec_increment', time: 10 * 60 * 1000, increment: 5000 },
      { type: 'ten_min_ten_sec_increment', time: 10 * 60 * 1000, increment: 10000 },
      { type: 'fifteen_min_no_increment', time: 15 * 60 * 1000, increment: 0 },
      { type: 'fifteen_min_ten_sec_increment', time: 15 * 60 * 1000, increment: 10000 },
      { type: 'twenty_five_min_no_increment', time: 25 * 60 * 1000, increment: 0 },
      { type: 'twenty_five_min_ten_sec_increment', time: 25 * 60 * 1000, increment: 10000 },
      { type: 'thirty_min_no_increment', time: 30 * 60 * 1000, increment: 0 },
      { type: 'thirty_min_ten_sec_increment', time: 30 * 60 * 1000, increment: 10000 },
      { type: 'sixty_min_thirty_sec_increment', time: 60 * 60 * 1000, increment: 30000 },
      { type: 'ninety_min_no_increment', time: 90 * 60 * 1000, increment: 0 },
      { type: 'ninety_min_ten_sec_increment', time: 90 * 60 * 1000, increment: 10000 },
      { type: 'ninety_min_thirty_sec_increment', time: 90 * 60 * 1000, increment: 30000 },
      { type: 'one_twenty_min_no_increment', time: 120 * 60 * 1000, increment: 0 },
      { type: 'one_twenty_min_thirty_sec_increment', time: 120 * 60 * 1000, increment: 30000 },
    ],
    []
  )

  // Set the browser tab title once on mount.
  useEffect(() => {
    document.title = 'Chess Clock'
  }, [])

  // The main tick loop. We use requestAnimationFrame instead of
  // setInterval so the clock stays in sync with the browser's render
  // cadence — setInterval drifts over long sessions, while rAF gives
  // us reliable delta-time updates. Time values are stored in refs so
  // the loop doesn't trigger re-renders for every frame.
  useEffect(() => {
    const updateTimer = () => {
      const now = performance.now()
      const elapsed = now - (lastUpdateRef.current || now)
      lastUpdateRef.current = now

      if (isRunning) {
        if (activePlayer === 'white') {
          whiteTimeRef.current = Math.max(0, whiteTimeRef.current - elapsed)
          setWhiteTime(whiteTimeRef.current)
        } else if (activePlayer === 'black') {
          blackTimeRef.current = Math.max(0, blackTimeRef.current - elapsed)
          setBlackTime(blackTimeRef.current)
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateTimer)
    }

    if (isRunning) {
      lastUpdateRef.current = performance.now()
      animationFrameRef.current = requestAnimationFrame(updateTimer)
    } else if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isRunning, activePlayer])

  // Format a millisecond duration as H:MM:SS, or M:SS if under an hour.
  const formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600000)
    const minutes = Math.floor((time % 3600000) / 60000)
    const seconds = Math.floor((time % 60000) / 1000)
    return `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`
  }

  // Handler for tapping a player's clock panel. If the tapping side
  // matches the active player, end their turn and switch. Taps on the
  // non-active side, or while paused, or on a flagged (zero-time) side
  // are no-ops. The green-layer slide animation is now CSS-driven via
  // the `activePlayer` state, so this handler just flips the state.
  const handlePlayerClick = (player: Player) => {
    if (!isRunning) return

    if ((player === 'white' && whiteTime === 0) || (player === 'black' && blackTime === 0)) {
      return
    }

    if (player === activePlayer) {
      if (player === 'white') {
        const newTime = whiteTimeRef.current + whiteIncrement
        whiteTimeRef.current = newTime
        setWhiteTime(newTime)
        setActivePlayer('black')
      } else {
        const newTime = blackTimeRef.current + blackIncrement
        blackTimeRef.current = newTime
        setBlackTime(newTime)
        setActivePlayer('white')
      }
    }
  }

  const handleStartStop = () => {
    setIsRunning(!isRunning)
  }

  // Cross-browser fullscreen toggle. The various vendor-prefixed
  // methods cover older Safari and Firefox; modern browsers expose
  // the standard names but the rest are kept for safety.
  const toggleFullscreen = () => {
    const element = document.documentElement as HTMLElement & {
      mozRequestFullScreen?: () => Promise<void>
      webkitRequestFullscreen?: () => Promise<void>
      msRequestFullscreen?: () => Promise<void>
    }
    const doc = document as Document & {
      mozCancelFullScreen?: () => Promise<void>
      webkitExitFullscreen?: () => Promise<void>
      msExitFullscreen?: () => Promise<void>
    }

    if (!document.fullscreenElement) {
      if (element.requestFullscreen) {
        element.requestFullscreen()
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen()
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen()
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen()
      }
      setIsFullscreen(true)
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen()
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen()
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen()
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen()
      }
      setIsFullscreen(false)
    }
  }

  // Sync the displayed times + refs whenever the committed preset
  // times change. Handles both initial load and post-Save updates
  // from the configuration dialog.
  useEffect(() => {
    setWhiteTime(whiteCustomTime)
    setBlackTime(blackCustomTime)
    whiteTimeRef.current = whiteCustomTime
    blackTimeRef.current = blackCustomTime
  }, [whiteCustomTime, blackCustomTime])

  // Generates 0..n-1 option entries for the H/M/S selects in the edit
  // dialog. Pulled out so the JSX stays readable.
  const renderNumberOptions = (n: number) =>
    Array.from({ length: n }, (_, i) => (
      <SelectItem key={i} value={i.toString()}>
        {i}
      </SelectItem>
    ))

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[5000] bg-black flex flex-col'
          : 'relative w-full flex flex-col'
      }
      style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 64px)' }}
    >
      {/* Top panel — White's clock. Rotated 180° so the player on
          that side of the phone sees it the right way up. */}
      <div
        className="clickable-box relative flex-1 flex flex-col justify-center items-center text-white text-6xl cursor-pointer overflow-hidden"
        style={{ transform: 'rotate(180deg)' }}
        onClick={() => handlePlayerClick('white')}
        onMouseDown={e => e.preventDefault()}
        onTouchStart={e => e.preventDefault()}
      >
        {/* Grey base layer — visible when this side isn't active.
            Turns red when this side flags (time runs out). */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: activePlayer === 'white' && whiteTime === 0 ? 'red' : 'grey',
            zIndex: 1,
          }}
        />

        {/* Green active layer — slides up from 0% to 100% when this
            side becomes active. Tailwind transitions handle the
            slide; the height itself is data-driven. */}
        <div
          className="absolute top-0 left-0 w-full transition-[height] duration-300 ease-out"
          style={{
            height: activePlayer === 'white' ? '100%' : '0%',
            backgroundColor: whiteTime === 0 ? 'red' : 'green',
            zIndex: 2,
          }}
        />

        {/* Content layer — time + increment label. Stacked above
            both background layers via z-index. */}
        <div className="relative z-[3] flex flex-col items-center">
          <div className="flex items-baseline">
            <span>{formatTime(whiteTime)}</span>
          </div>
          {whiteIncrement > 0 && (
            <span className="text-base mt-2 text-gray-300">
              +{Math.floor(whiteIncrement / 1000)}s increment
            </span>
          )}
        </div>
      </div>

      {/* Middle control bar. Pause/Play, Edit current times, Restart,
          Settings (preset picker), Fullscreen toggle. */}
      <div id="controls" className="h-[50px] flex justify-center items-center gap-4 p-4 bg-muted">
        <Button variant="ghost" size="icon" onClick={handleStartStop}>
          {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen()
            setIsFullscreen(false)
            setIsRunning(false)
            setIsEditOpen(true)
            setTempWhiteTime(whiteTime)
            setTempBlackTime(blackTime)
          }}
        >
          <Pencil className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen()
            setIsFullscreen(false)
            setIsRunning(false)
            setIsConfirmOpen(true)
          }}
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen()
            setIsFullscreen(false)
            setIsRunning(false)
            setIsConfigurationOpen(true)
          }}
        >
          <Settings className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </Button>
      </div>

      {/* Bottom panel — Black's clock. Reads the normal way up. */}
      <div
        className="clickable-box relative flex-1 flex flex-col justify-center items-center text-white text-6xl cursor-pointer overflow-hidden"
        onClick={() => handlePlayerClick('black')}
        onMouseDown={e => e.preventDefault()}
        onTouchStart={e => e.preventDefault()}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: activePlayer === 'black' && blackTime === 0 ? 'red' : 'grey',
            zIndex: 1,
          }}
        />
        <div
          className="absolute top-0 left-0 w-full transition-[height] duration-300 ease-out"
          style={{
            height: activePlayer === 'black' ? '100%' : '0%',
            backgroundColor: blackTime === 0 ? 'red' : 'green',
            zIndex: 2,
          }}
        />
        <div className="relative z-[3] flex flex-col items-center">
          <div className="flex items-baseline">
            <span>{formatTime(blackTime)}</span>
          </div>
          {blackIncrement > 0 && (
            <span className="text-base mt-2 text-gray-300">
              +{Math.floor(blackIncrement / 1000)}s increment
            </span>
          )}
        </div>
      </div>

      {/* Restart confirmation dialog. Two-step so an accidental tap
          on the Restart button mid-game doesn't wipe the position. */}
      <Dialog
        open={isConfirmOpen}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setIsRunning(false)
            setIsConfirmOpen(false)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Restart</DialogTitle>
            <DialogDescription>Are you sure you want to restart the clocks?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                // Reset both displayed times and refs back to the
                // committed preset values, and reset the active
                // player to white.
                setWhiteTime(whiteCustomTime)
                setBlackTime(blackCustomTime)
                whiteTimeRef.current = whiteCustomTime
                blackTimeRef.current = blackCustomTime
                setActivePlayer('white')
                setIsRunning(false)
                setIsConfirmOpen(false)
              }}
            >
              Confirm
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsRunning(false)
                setIsConfirmOpen(false)
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configuration dialog — preset picker. Selecting a preset
          updates the temp state; Save commits it, Cancel discards. */}
      <Dialog open={isConfigurationOpen} onOpenChange={setIsConfigurationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Time</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label>Preset</Label>
            <Select
              value={selectedPreset}
              onValueChange={(value: string) => {
                setSelectedPreset(value)
                const preset = presets.find(p => p.type === value)
                if (preset) {
                  setTempWhiteCustomTime(preset.time)
                  setTempBlackCustomTime(preset.time)
                  setTempWhiteIncrement(preset.increment || 0)
                  setTempBlackIncrement(preset.increment || 0)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a preset" />
              </SelectTrigger>
              <SelectContent>
                {presets.map(preset => (
                  <SelectItem key={preset.type} value={preset.type}>
                    {preset.type.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                // Commit the picked preset everywhere: displayed
                // times, refs, committed customs, increments. Reset
                // the active player to white so it's a clean start.
                setWhiteTime(tempWhiteCustomTime)
                setBlackTime(tempBlackCustomTime)
                whiteTimeRef.current = tempWhiteCustomTime
                blackTimeRef.current = tempBlackCustomTime
                setWhiteCustomTime(tempWhiteCustomTime)
                setBlackCustomTime(tempBlackCustomTime)
                setWhiteIncrement(tempWhiteIncrement)
                setBlackIncrement(tempBlackIncrement)
                setIsConfigurationOpen(false)
                setIsRunning(false)
                setActivePlayer('white')
              }}
            >
              Save
            </Button>
            <Button variant="destructive" onClick={() => setIsConfigurationOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog — manual H/M/S override for the current
          displayed times. Doesn't change the preset/restart target. */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Current Times</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div>
              <Label className="mb-2 block">White Times</Label>
              <div className="flex gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Hours</Label>
                  <Select
                    value={Math.floor(tempWhiteTime / 3600000).toString()}
                    onValueChange={(value: string) =>
                      setTempWhiteTime(parseInt(value) * 3600000 + (tempWhiteTime % 3600000))
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>{renderNumberOptions(24)}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Minutes</Label>
                  <Select
                    value={Math.floor((tempWhiteTime % 3600000) / 60000).toString()}
                    onValueChange={(value: string) =>
                      setTempWhiteTime(
                        Math.floor(tempWhiteTime / 3600000) * 3600000 +
                          parseInt(value) * 60000 +
                          (tempWhiteTime % 60000)
                      )
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>{renderNumberOptions(60)}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Seconds</Label>
                  <Select
                    value={Math.floor((tempWhiteTime % 60000) / 1000).toString()}
                    onValueChange={(value: string) =>
                      setTempWhiteTime(
                        Math.floor(tempWhiteTime / 60000) * 60000 + parseInt(value) * 1000
                      )
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>{renderNumberOptions(60)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Black Times</Label>
              <div className="flex gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Hours</Label>
                  <Select
                    value={Math.floor(tempBlackTime / 3600000).toString()}
                    onValueChange={(value: string) =>
                      setTempBlackTime(parseInt(value) * 3600000 + (tempBlackTime % 3600000))
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>{renderNumberOptions(24)}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Minutes</Label>
                  <Select
                    value={Math.floor((tempBlackTime % 3600000) / 60000).toString()}
                    onValueChange={(value: string) =>
                      setTempBlackTime(
                        Math.floor(tempBlackTime / 3600000) * 3600000 +
                          parseInt(value) * 60000 +
                          (tempBlackTime % 60000)
                      )
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>{renderNumberOptions(60)}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Seconds</Label>
                  <Select
                    value={Math.floor((tempBlackTime % 60000) / 1000).toString()}
                    onValueChange={(value: string) =>
                      setTempBlackTime(
                        Math.floor(tempBlackTime / 60000) * 60000 + parseInt(value) * 1000
                      )
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>{renderNumberOptions(60)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setWhiteTime(tempWhiteTime)
                setBlackTime(tempBlackTime)
                whiteTimeRef.current = tempWhiteTime
                blackTimeRef.current = tempBlackTime
                setIsEditOpen(false)
                setIsRunning(false)
              }}
            >
              Save
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsEditOpen(false)
                setIsRunning(false)
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ChessClock
