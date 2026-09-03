"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Church,
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardCheck,
  HandCoins,
  Megaphone,
  HeartHandshake,
  FileBarChart,
  LogOut,
  UserCog,
  ListChecks,
  Bell,
  CalendarCheck,
} from "lucide-react"
import { useChurch } from "@/lib/church-context"
import type { Role } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["Administrator", "Pastor", "Finance Officer", "Ministry Leader", "Church Member"],
  },
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    icon: Bell,
    roles: ["Administrator", "Pastor", "Finance Officer", "Ministry Leader", "Church Member"],
  },
  {
    href: "/dashboard/users",
    label: "User Accounts",
    icon: UserCog,
    roles: ["Administrator"],
  },
  {
    href: "/dashboard/members",
    label: "Members",
    icon: Users,
    roles: ["Administrator", "Pastor"],
  },
  {
    href: "/dashboard/ministries",
    label: "Ministries",
    icon: HeartHandshake,
    roles: ["Administrator", "Pastor", "Ministry Leader"],
  },
  {
    href: "/dashboard/activities",
    label: "Ministry Activities",
    icon: ListChecks,
    roles: ["Administrator", "Pastor", "Ministry Leader"],
  },
  {
    href: "/dashboard/events",
    label: "Events",
    icon: CalendarDays,
    roles: ["Administrator", "Pastor", "Ministry Leader", "Church Member", "Finance Officer"],
  },
  {
    href: "/dashboard/attendance",
    label: "Attendance",
    icon: ClipboardCheck,
    roles: ["Administrator", "Pastor", "Ministry Leader"],
  },
  {
    href: "/dashboard/my-attendance",
    label: "My Attendance",
    icon: CalendarCheck,
    roles: ["Church Member"],
  },
  {
    href: "/dashboard/donations",
    label: "Donations",
    icon: HandCoins,
    roles: ["Administrator", "Pastor", "Finance Officer", "Church Member"],
  },
  {
    href: "/dashboard/announcements",
    label: "Announcements",
    icon: Megaphone,
    roles: ["Administrator", "Pastor", "Finance Officer", "Ministry Leader", "Church Member"],
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    icon: FileBarChart,
    roles: ["Administrator", "Pastor"],
  },
]

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, logout } = useChurch()

  if (!currentUser) return null

  const items = NAV_ITEMS.filter((i) => i.roles.includes(currentUser.role))

  const handleLogout = () => {
    logout()
    router.replace("/")
  }

  return (
    <aside className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="size-10 rounded-lg bg-accent text-accent-foreground grid place-items-center shrink-0">
          <Church className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-accent font-semibold">IUAFC</p>
          <p className="text-sm font-semibold leading-tight truncate">Church Manager</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="size-9 rounded-full bg-sidebar-accent grid place-items-center text-sm font-semibold">
            {currentUser.fullName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{currentUser.fullName}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{currentUser.role}</p>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" />
          Log out
        </Button>
      </div>
    </aside>
  )
}
