import type React from "react"

import { useState } from "react"
import { Link } from "react-router"
import { motion } from "framer-motion"
import { Menu, X } from "lucide-react"
import { Button } from "./ui/button"
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet"
import { UserButton } from "@clerk/clerk-react"

export interface NavItem {
  name: string
  icon: React.ReactNode
  href: string
}

interface AdminNavbarProps {
  navItems: NavItem[]
  title?: string
}

export default function AdminNavbar({
  navItems,
  title = "Trail Admin",
}: AdminNavbarProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="w-full bg-amber-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/admin" className="flex items-center">
              <motion.span
                className="text-2xl mr-2"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" }}
              >
                🐎
              </motion.span>
              <span className="font-bold text-xl">{title}</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-amber-700 flex items-center"
              >
                {item.icon}
                <span className="ml-1">{item.name}</span>
              </Link>
            ))}
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-3">
            {/* Clerk UserButton */}
            <UserButton afterSignOutUrl="/sign-in" />

            {/* Mobile menu button */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-amber-700">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-amber-50 text-amber-900 w-64">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">🐎</span>
                      <span className="font-bold text-xl">{title}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="flex flex-col space-y-1">
                    {navItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="px-3 py-3 rounded-md text-sm font-medium hover:bg-amber-200 flex items-center"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.icon}
                        <span className="ml-2">{item.name}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-auto pt-6 border-t border-amber-200 flex justify-center">
                    {/* Mobile view Clerk UserButton */}
                    <UserButton afterSignOutUrl="/sign-in" />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
