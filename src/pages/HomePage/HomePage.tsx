import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { NAV_GROUPS } from '@/config/navigation'

export default function HomePage() {
  const technologies = [
    'Vite',
    'React',
    'React-Chessboard',
    'Stockfish.js',
    'TypeScript',
    'Tailwind CSS 4',
    'shadcn/ui',
    'React Router',
    'Zustand',
    'Vitest',
    'ESLint',
    'Prettier',
  ]

  const highlight = 'rounded-md border bg-muted px-1.5 py-0.5 text-foreground'

  // Set the browser tab title once on mount.
  useEffect(() => {
    document.title = 'Chessboard Magic'
  }, [])

  return (
    <main className="flex flex-1 flex-col gap-10 md:grid md:grid-cols-2 md:gap-12">
      <div className="flex flex-col gap-6">
        <p className="max-w-md text-lg text-muted-foreground">
          I put this out here in the hope that it nudges someone to{' '}
          <span className={highlight}>build something cool</span> with{' '}
          <span className={highlight}>chess</span>.
        </p>

        <p className="max-w-md text-lg text-muted-foreground">
          <span className={highlight}>Fork it</span>, ship it, pull it apart, or turn it into your
          own thing. Honestly, I don't mind. Just go{' '}
          <span className={highlight}>make something</span>.
        </p>

        <p className="max-w-md text-lg text-muted-foreground">
          The chess world could do with more{' '}
          <span className={highlight}>weird little projects</span>.
        </p>

        <p className="max-w-md text-muted-foreground">
          Kind regards,
          <br />
          Toan Hoang (HollowLeaf)
        </p>
        <p className="text-sm text-muted-foreground">v0.1.0 · Released 17 June 2026</p>

        <div className="flex flex-col gap-4 pt-2">
          <h2 className="text-lg font-semibold">Built with</h2>
          <ul className="flex flex-wrap gap-2">
            {technologies.map(tech => (
              <li
                key={tech}
                className="rounded-md border bg-muted/40 px-2.5 py-1 text-sm text-muted-foreground"
              >
                {tech}
              </li>
            ))}
          </ul>
          <p className="max-w-md text-sm text-muted-foreground">
            A modern, lightweight stack picked for fast iteration and a clean developer experience.
            Handy if you want to fork this and run with it.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold">What's inside</h2>
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
            {group.description && (
              <p className="max-w-md text-sm text-muted-foreground">{group.description}</p>
            )}
            {group.items && (
              <ul className="flex flex-wrap gap-2 pt-1">
                {group.items.map(item => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      title={item.description}
                      className="inline-block rounded-md border bg-muted/40 px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
