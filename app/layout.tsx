import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/hooks/use-auth"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CRM Portal - Business Management Platform",
  description: "Complete CRM solution for managing leads, clients, projects, tasks, support tickets, and invoicing",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/stellaris-logo-new.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/stellaris-logo-new.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/stellaris-logo-new.png",
        sizes: "48x48",
        type: "image/png",
      },
    ],
    apple: "/stellaris-logo-new.png",
    shortcut: "/stellaris-logo-new.png",
  },
  openGraph: {
    images: [
      {
        url: "/stellaris-logo-new.png",
        width: 1200,
        height: 630,
        alt: "Stellaris CRM Portal",
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
