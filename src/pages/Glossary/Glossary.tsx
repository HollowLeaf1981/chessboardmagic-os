import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { chessterms } from '@/data/chessterms'

/**
 * Glossary
 * ------------
 * Searchable glossary of chess terminology. The shared `chessterms` dataset
 * mixes several categories (terms, players, openings, engines, world
 * champions) so we filter to just Type === 'T' here. Users can type any
 * substring to narrow the list in real time.
 */
const Glossary = () => {
  // Current search query. Empty string shows every glossary entry.
  const [searchTerm, setSearchTerm] = useState('')

  // Set the browser tab title once on mount.
  useEffect(() => {
    document.title = 'Chess Glossary'
  }, [])

  /**
   * Filtered + sorted glossary entries, memoised so we only recompute when
   * the query changes. Two filters: keep only glossary terms (Type 'T'),
   * and keep only those whose Term contains the query (case-insensitive).
   * Sorted by Key for a stable alphabetical-ish order independent of the
   * dataset's source order.
   */
  const filteredTerms = useMemo(() => {
    // Lowercase the query once rather than on every comparison below.
    const q = searchTerm.toLowerCase()
    return (
      chessterms
        .filter(term => term.Type === 'T' && term.Term.toLowerCase().includes(q))
        // `>` string comparison is fine for plain ASCII keys; switch to
        // localeCompare if accented characters ever appear in Key values.
        .sort((a, b) => (a.Key > b.Key ? 1 : -1))
    )
  }, [searchTerm])

  return (
    <div className="page-container">
      <h1 className="heading-1">Glossary</h1>

      <div className="mt-6 max-w-2xl flex flex-col gap-4">
        {/* Search input. autoComplete="off" stops browsers offering
            previously-typed values, which would be noisy here. */}
        <Input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          autoComplete="off"
        />

        {/* Results list. Each entry shows the term as a heading with its
            description beneath. Generous vertical gap to keep entries
            visually distinct as the user scrolls. */}
        <div className="flex flex-col gap-10">
          {filteredTerms.map(term => (
            // Key is unique per term in the dataset, so it's safe as a
            // React key — no index suffix needed.
            <div key={term.Key} className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">{term.Term}</h2>
              <p className="text-muted-foreground">{term.Description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Glossary
