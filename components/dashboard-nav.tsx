"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { BarChart3, TrendingUp, Users, Briefcase, CheckSquare, HeadphonesIcon, FileText, LogOut } from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Leads", href: "/dashboard/leads", icon: TrendingUp },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Projects", href: "/dashboard/projects", icon: Briefcase },
  { name: "Tasks", href: "/dashboard/tasks", icon: CheckSquare },
  { name: "Tickets", href: "/dashboard/tickets", icon: HeadphonesIcon },
  { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
]

export function DashboardNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <Link href="/" className="flex items-center">
          <Image
            src="/stellaris-logo.png"
            alt="Stellaris IT Consulting & Resourcing"
            width={180}
            height={40}
            className="h-8 w-auto"
          />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 rounded-lg bg-muted p-3">
          <p className="text-sm font-medium">{user?.full_name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          <p className="mt-1 text-xs font-medium text-primary capitalize">{user?.role}</p>
        </div>
        <Button variant="outline" className="w-full justify-start bg-transparent" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}
