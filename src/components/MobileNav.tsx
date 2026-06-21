import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { NAV_GROUPS } from '@/config/navigation'

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Menu className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[340px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-1 px-4 pb-6">
          <Accordion type="multiple" className="w-full">
            {NAV_GROUPS.map(group => {
              const items = group.items
              if (items) {
                return (
                  <AccordionItem key={group.label} value={group.label}>
                    <AccordionTrigger className="text-sm font-medium">
                      {group.label}
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="flex flex-col gap-1 pl-2">
                        {items.map(item => (
                          <li key={item.to}>
                            <NavLink
                              to={item.to}
                              onClick={close}
                              className="block px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                              {item.label}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                )
              }
            })}
          </Accordion>
        </div>
      </SheetContent>
    </Sheet>
  )
}
