import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { RootProviders } from "@/components/shared/root-providers"
import { InstallPrompt } from "@/components/shared/install-prompt"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Preceptor",
  description: "Sistema de gestión escolar",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/apple-icon.svg",
  },
  appleWebApp: {
    title: "Preceptor",
    statusBarStyle: "default",
    capable: true,
  },
}

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <RootProviders>
          {children}
          <InstallPrompt />
        </RootProviders>
      </body>
    </html>
  )
}
