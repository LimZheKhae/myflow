"use client"

import { Badge } from "@/components/ui/badge"

export const TierBadge = ({ value }: { value: string }) => {
  const colors: Record<string, string> = {
    Diamond: "bg-purple-100 text-purple-800",
    Platinum: "bg-green-100 text-green-800",
    Gold: "bg-yellow-100 text-yellow-800",
    Silver: "bg-slate-100 text-slate-800",
    Bronze: "bg-orange-100 text-orange-800",
  }
  const cls = colors[value] || "bg-slate-100 text-slate-800"
  return <Badge className={cls}>{value}</Badge>
}

export const PlayerStatusBadge = ({ value }: { value: string }) => {
  const colors: Record<string, string> = {
    Active: "bg-green-100 text-green-800",
    Inactive: "bg-yellow-100 text-yellow-800",
    Dormant: "bg-red-100 text-red-800",
  }
  const cls = colors[value] || "bg-slate-100 text-slate-800"
  return <Badge className={cls}>{value}</Badge>
}

export const CallOutcomeBadge = ({ value }: { value: string }) => {
  const colors: Record<string, string> = {
    Successful: "bg-green-100 text-green-800",
    "No Answer": "bg-yellow-100 text-yellow-800",
    Callback: "bg-blue-100 text-blue-800",
    Rejected: "bg-red-100 text-red-800",
  }
  const cls = colors[value] || "bg-slate-100 text-slate-800"
  return <Badge className={cls}>{value}</Badge>
}

export const CurrencyBadge = ({ value }: { value: string }) => {
  const colors: Record<string, string> = {
    USD: "bg-green-100 text-green-800",
    SGD: "bg-blue-100 text-blue-800",
    MYR: "bg-orange-100 text-orange-800",
    EUR: "bg-indigo-100 text-indigo-800",
    GBP: "bg-pink-100 text-pink-800",
    VND: "bg-red-100 text-red-800",
    CAD: "bg-cyan-100 text-cyan-800",
    GBPUSD: "bg-teal-100 text-teal-800",
  }
  const cls = colors[value] || "bg-slate-100 text-slate-800"
  return <Badge className={cls}>{value}</Badge>
}


