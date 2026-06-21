import { useEffect, useState } from 'react'
import { Copy, Download } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { convertMoveTreeToPGN, type MoveTree } from './helper'

interface SpaceVisualizerExportCardProps {
  moves: MoveTree
}

/**
 * Lightweight export controls for the current move tree.
 *
 * The PGN is derived from the move tree whenever it changes, and exposed
 * through two actions:
 *  - Copy PGN: writes the PGN to the clipboard
 *  - Download PGN: saves the PGN as a .pgn file
 */
function SpaceVisualizerExportCard({ moves }: SpaceVisualizerExportCardProps) {
  const [pgn, setPgn] = useState('')

  useEffect(() => {
    const newPgn = convertMoveTreeToPGN(moves)
    if (newPgn !== pgn) {
      setPgn(newPgn)
    }
  }, [moves, pgn])

  const handleCopyToClipboard = async () => {
    if (!pgn) {
      toast.error('Nothing to copy yet')
      return
    }
    try {
      await navigator.clipboard.writeText(pgn)
      toast.success('PGN copied to clipboard')
    } catch {
      toast.error('Failed to copy PGN')
    }
  }

  const handleDownload = () => {
    if (!pgn) {
      toast.error('Nothing to download yet')
      return
    }
    // Trigger a browser download by creating a blob URL and clicking a hidden anchor
    const blob = new Blob([pgn], { type: 'application/x-chess-pgn' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'spacevisualizer.pgn'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('PGN downloaded')
  }

  return (
    <div className="flex flex-row gap-2">
      <Button onClick={handleCopyToClipboard} variant="default">
        <Copy className="mr-2 h-4 w-4" />
        Copy PGN
      </Button>
      <Button onClick={handleDownload} variant="secondary">
        <Download className="mr-2 h-4 w-4" />
        Download PGN
      </Button>
    </div>
  )
}

export default SpaceVisualizerExportCard
