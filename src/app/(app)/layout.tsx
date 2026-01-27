import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { TRPCProvider } from '@/lib/trpc'
import '../globals.css'

export const metadata: Metadata = {
  title: 'GroupVibes',
  description: 'A group vibe check app',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <TRPCProvider>
          {children}
        </TRPCProvider>
        <Toaster />
      </body>
    </html>
  )
}
