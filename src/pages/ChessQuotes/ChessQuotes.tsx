import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { chessquotes } from '@/data/chessquotes'

/**
 * ChessQuotes
 * ---------------
 * Browsable list of chess quotes with a live search filter. Users can type
 * any substring and the list narrows to quotes whose author or body text
 * matches (case-insensitive). Results are displayed sorted by author name.
 */
const ChessQuotes = () => {
  // Current value of the search input. Empty string means "show everything".
  const [searchTerm, setSearchTerm] = useState('')

  // Set the browser tab title once on mount. Runs only on the initial render
  // because the dependency array is empty.
  useEffect(() => {
    document.title = 'Chess Quotes'
  }, [])

  /**
   * Filtered + sorted quote list, memoised so we only recompute when the
   * search term changes. Without useMemo this would re-run on every render,
   * which matters because the underlying `chessquotes` dataset can be large.
   */
  const filteredQuotes = useMemo(() => {
    // Lowercase the query once so each comparison below is a simple substring
    // check rather than re-lowercasing on every iteration.
    const q = searchTerm.toLowerCase()
    return (
      chessquotes
        .filter(
          quote => quote.Author.toLowerCase().includes(q) || quote.Quote.toLowerCase().includes(q)
        )
        // Alphabetical sort by author. String comparison with > works here
        // because we only need a stable lexicographic ordering, not locale-aware
        // collation. Swap to `localeCompare` if accented names need correct order.
        .sort((a, b) => (a.Author > b.Author ? 1 : -1))
    )
  }, [searchTerm])

  return (
    <div className="page-container">
      <h1 className="heading-1">Quotes</h1>

      <div className="mt-6 max-w-2xl flex flex-col gap-4">
        {/* Search box. autoComplete="off" prevents browsers from suggesting
            previously-typed values, which would be noisy for a content filter. */}
        <Input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          autoComplete="off"
        />

        {/* Quote list. Each item shows the quote in large type with the
            author beneath, separated by an em-dash for a classic citation look. */}
        <div className="flex flex-col gap-10">
          {filteredQuotes.map((quote, i) => (
            // Key combines author + index because the same author can appear
            // multiple times; the index disambiguates duplicates within the
            // filtered list.
            <div key={`${quote.Author}-${i}`} className="flex flex-col gap-3">
              <p className="text-xl font-semibold">"{quote.Quote}"</p>
              <p className="text-muted-foreground">— {quote.Author}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ChessQuotes
