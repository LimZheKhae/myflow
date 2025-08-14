"use client"

import { useFirebaseAuth } from "@/contexts/firebase-auth-context"
import FirebaseLoginForm from "@/components/auth/firebase-login-form"
import Sidebar from "@/components/layout/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Target, Gift, Settings, TrendingUp, BarChart3, Sparkles } from "lucide-react"

const moduleCards = [
  {
    title: "VIP Profiles",
    description: "Manage VIP player data and relationships",
    icon: Users,
    color: "from-emerald-500 to-teal-600",
    bgColor: "from-emerald-50 to-teal-50",
    stats: "150+ Players",
  },
  {
    title: "Campaigns",
    description: "Create and manage retention campaigns",
    icon: Target,
    color: "from-blue-500 to-indigo-600",
    bgColor: "from-blue-50 to-indigo-50",
    stats: "12 Active",
  },
  {
    title: "Gift Approval",
    description: "Handle gift requests and approvals",
    icon: Gift,
    color: "from-purple-500 to-pink-600",
    bgColor: "from-purple-50 to-pink-50",
    stats: "8 Pending",
  },
  {
    title: "User Management",
    description: "Manage user permissions and access",
    icon: Settings,
    color: "from-orange-500 to-red-600",
    bgColor: "from-orange-50 to-red-50",
    stats: "25 Users",
  },
]

export default function HomePage() {
  const { user } = useFirebaseAuth()

  if (!user) {
    return <FirebaseLoginForm />
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-6xl mx-auto text-center animate-fade-in">
            {/* Welcome Header */}
            <div className="mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl mb-6 shadow-2xl">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-5xl font-bold gradient-text mb-4">Welcome to MyFlow</h1>
              <p className="text-xl text-gray-600 mb-2">
                Hello, <span className="font-semibold text-gray-800">{user.name}</span>
              </p>
              <p className="text-gray-500 flex items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Select a module from the sidebar to get started
              </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <Card className="glass-card hover-lift border-0 shadow-xl">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">98.5%</h3>
                  <p className="text-sm text-gray-600">System Uptime</p>
                </CardContent>
              </Card>

              <Card className="glass-card hover-lift border-0 shadow-xl">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">2,847</h3>
                  <p className="text-sm text-gray-600">Total Records</p>
                </CardContent>
              </Card>

              <Card className="glass-card hover-lift border-0 shadow-xl">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">156</h3>
                  <p className="text-sm text-gray-600">Active Users</p>
                </CardContent>
              </Card>
            </div>

            {/* Module Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {moduleCards.map((module, index) => (
                <Card
                  key={module.title}
                  className="glass-card hover-lift border-0 shadow-xl group cursor-pointer transition-all duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className={`p-6 bg-gradient-to-br ${module.bgColor} border border-white/20`}>
                    <div className="text-center">
                      <div
                        className={`w-16 h-16 bg-gradient-to-r ${module.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl group-hover:scale-110 transition-transform duration-300`}
                      >
                        <module.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:scale-105 transition-transform duration-300">
                        {module.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed">{module.description}</p>
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${module.color} text-white shadow-lg`}
                      >
                        {module.stats}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div className="flex flex-wrap justify-center gap-4">
                <button className="px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium text-gray-700 hover:text-blue-600 border border-gray-200 hover:border-blue-300">
                  View Recent Activity
                </button>
                <button className="px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium text-gray-700 hover:text-purple-600 border border-gray-200 hover:border-purple-300">
                  Generate Report
                </button>
                <button className="px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium text-gray-700 hover:text-green-600 border border-gray-200 hover:border-green-300">
                  System Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
