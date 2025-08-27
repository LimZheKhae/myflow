'use client'

import { useFirebaseAuth as useAuth } from '@/contexts/firebase-auth-context'
import { Badge } from '@/components/ui/badge'
import { Calendar, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/ui/NotificationBell'

interface HeaderProps {
  title: string
  description?: string
}

export default function Header({ title, description }: HeaderProps) {
  const { user } = useAuth()

  return (
    <div className="border-b border-slate-700/50 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">{title}</h1>
            {description && (
              <p className="text-sm text-slate-300 mt-1 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="bg-slate-800/50 border border-slate-600 rounded-md p-1">
            <NotificationBell />
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4 pl-4 border-l border-slate-600">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-100">{user?.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 shadow-sm">
                  {user?.role}
                </Badge>
                <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date().toLocaleDateString()}
                </Badge>
              </div>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold">{user?.name.charAt(0).toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
