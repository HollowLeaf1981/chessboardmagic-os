import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import ThemeToggle from '@/components/ui/ThemeToggle'
import MobileNav from '@/components/MobileNav'
import { NAV_GROUPS } from '@/config/navigation'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <nav className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/img/logo-transparent-black.png"
              alt="Chessboard Magic"
              className="h-12 w-12 dark:hidden"
            />
            <img
              src="/img/logo-transparent.png"
              alt="Chessboard Magic"
              className="hidden h-12 w-12 dark:block"
            />
            <span className="font-semibold tracking-tight">Chessboard Magic</span>
          </Link>

          {/* Desktop navigation */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              {NAV_GROUPS.map(group => {
                const items = group.items
                if (items) {
                  return (
                    <NavigationMenuItem key={group.label}>
                      <NavigationMenuTrigger className="text-base">
                        {group.label}
                      </NavigationMenuTrigger>

                      <NavigationMenuContent>
                        <ul className="grid w-[680px] grid-cols-3 gap-1 p-4">
                          {items.map(item => (
                            <li key={item.to}>
                              <NavigationMenuLink asChild>
                                <NavLink
                                  to={item.to}
                                  className="block select-none rounded-md p-3 no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                >
                                  <div className="text-sm font-medium leading-none">
                                    {item.label}
                                    {item.description && (
                                      <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                </NavLink>
                              </NavigationMenuLink>
                            </li>
                          ))}
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  )
                }
                return (
                  <NavigationMenuItem key={group.label}>
                    <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                      <NavLink to={group.to!}>{group.label}</NavLink>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )
              })}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <div className="md:hidden">
              <MobileNav />
            </div>
          </div>
        </nav>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 pt-6">
        <Outlet />
      </div>
    </div>
  )
}
