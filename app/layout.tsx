import type React from 'react'
import { Inter } from 'next/font/google'
import { FirebaseAuthProvider } from '@/contexts/firebase-auth-context'
import { MemberProfileProvider } from '@/contexts/member-profile-context'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <FirebaseAuthProvider>
          <MemberProfileProvider>{children}</MemberProfileProvider>
        </FirebaseAuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}

export const metadata = {
  title: 'MyFlow - Professional CRM Platform',
  description: 'Advanced customer relationship management system with VIP profiles, campaigns, and gift management.',
  generator: 'v0.dev',
}
