"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useFirebaseAuth as useAuth } from "@/contexts/firebase-auth-context"
import { createRBACManager } from "@/lib/rbac-utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Users, Target, Gift, Settings, LogOut, Shield, ChevronRight, Sparkles, User } from "lucide-react"

const navigation = [
  {
    name: "VIP Profile",
    href: "/vip-profile",
    icon: Users,
    module: "vip-profile",
    description: "Manage VIP players",
    color: "from-emerald-500 to-teal-600",
  },
  {
    name: "Campaign",
    href: "/campaign",
    icon: Target,
    module: "campaign",
    description: "Create campaigns",
    color: "from-blue-500 to-indigo-600",
  },
  {
    name: "Gift & Approval",
    href: "/gift-approval",
    icon: Gift,
    module: "gift-approval",
    description: "Handle requests",
    color: "from-purple-500 to-pink-600",
  },
  {
    name: "User Management",
    href: "/user-management",
    icon: Settings,
    module: "user-management",
    description: "Manage permissions",
    color: "from-orange-500 to-red-600",
  },
]

// Profile navigation item (always accessible)
const profileNavItem = {
  name: "Profile & Settings",
  href: "/profile",
  icon: User,
  description: "Account settings",
  color: "from-gray-500 to-gray-600",
}

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout, hasPermission } = useAuth()

  if (!user) return null

  // Filter navigation based on permissions
  const filteredNavigation = navigation.filter((item) => {
    // Check if user has VIEW permission for this module
    return hasPermission(item.module, 'VIEW')
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "from-purple-500 to-pink-500"
      case "MANAGER":
        return "from-blue-500 to-indigo-500"
      case "KAM":
        return "from-emerald-500 to-teal-500"
      case "PROCUREMENT":
        return "from-orange-500 to-amber-500"
      case "AUDIT":
        return "from-gray-500 to-slate-500"
      default:
        return "from-gray-400 to-gray-500"
    }
  }

  return (
    <div className="flex flex-col w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 h-screen shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-center h-20 border-b border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg bg-white">
            <Image 
              src="/aetheriondataworks.jpg" 
              alt="MyFlow Logo" 
              width={40} 
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">MyFlow</h1>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Professional Edition
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between custom-scrollbar overflow-y-auto">
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {filteredNavigation.map((item, index) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "group relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02]",
                    isActive
                      ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 shadow-lg"
                      : "hover:bg-slate-800/50 border border-transparent",
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-4 p-4">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
                        isActive ? `bg-gradient-to-r ${item.color} shadow-lg` : "bg-slate-700 group-hover:bg-slate-600",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 transition-all duration-300",
                          isActive ? "text-white" : "text-slate-300 group-hover:text-white",
                        )}
                      />
                    </div>
                    <div className="flex-1">
                      <p
                        className={cn(
                          "font-medium transition-colors duration-300",
                          isActive ? "text-white" : "text-slate-300 group-hover:text-white",
                        )}
                      >
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-all duration-300",
                        isActive
                          ? "text-blue-400 translate-x-1"
                          : "text-slate-500 group-hover:text-slate-300 group-hover:translate-x-1",
                      )}
                    />
                  </div>

                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl" />
                  )}
                </div>
              </Link>
            )
          })}
          
          {/* Profile Link */}
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <Link href={profileNavItem.href}>
              <div
                className={cn(
                  "group relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02]",
                  pathname.startsWith(profileNavItem.href)
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 shadow-lg"
                    : "hover:bg-slate-800/50 border border-transparent",
                )}
              >
                <div className="flex items-center gap-4 p-4">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg",
                      `bg-gradient-to-r ${profileNavItem.color}`,
                      pathname.startsWith(profileNavItem.href)
                        ? "shadow-blue-500/25 scale-110"
                        : "group-hover:shadow-xl group-hover:scale-105",
                    )}
                  >
                    <profileNavItem.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold group-hover:text-blue-200 transition-colors duration-300">
                      {profileNavItem.name}
                    </p>
                    <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                      {profileNavItem.description}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-all duration-300",
                      pathname.startsWith(profileNavItem.href)
                        ? "text-blue-400 translate-x-1"
                        : "text-slate-500 group-hover:text-slate-300 group-hover:translate-x-1",
                    )}
                  />
                </div>

                {pathname.startsWith(profileNavItem.href) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl" />
                )}
              </div>
            </Link>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
          <div className="mb-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-slate-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">{user.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{user.name}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Badge
                className={cn(
                  "text-xs font-medium bg-gradient-to-r text-white border-0 shadow-lg",
                  getRoleColor(user.role),
                )}
              >
                {user.role}
              </Badge>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                {user.merchants.length} Merchants
              </Badge>
            </div>

            <div className="flex flex-wrap gap-1">
              {user.currencies.slice(0, 3).map((currency) => (
                <span key={currency} className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-md">
                  {currency}
                </span>
              ))}
              {user.currencies.length > 3 && (
                <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-md">
                  +{user.currencies.length - 3}
                </span>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500 transition-all duration-200 group"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 group-hover:rotate-12 transition-transform duration-200" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
