"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"
import { CheckCircle2, AlertTriangle, AlertCircle, Info, Loader2 } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      richColors
      toastOptions={{
        classNames: {
          success: "bg-emerald-50 text-emerald-900 border-emerald-200",
          error: "bg-red-50 text-red-900 border-red-200",
          warning: "bg-amber-50 text-amber-900 border-amber-200",
          info: "bg-blue-50 text-blue-900 border-blue-200",
          default: "bg-popover text-popover-foreground border-border",
          closeButton: "text-foreground/60 hover:text-foreground",
          actionButton: "bg-transparent hover:bg-foreground/10",
          cancelButton: "bg-transparent hover:bg-foreground/10",
          icon: "opacity-90",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
        warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
        error: <AlertCircle className="h-5 w-5 text-red-600" />,
        info: <Info className="h-5 w-5 text-blue-600" />,
        loading: <Loader2 className="h-5 w-5 animate-spin text-foreground/70" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
