import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { RootProviders } from "@/components/shared/root-providers"
import { ServiceWorkerRegister } from "@/components/shared/service-worker-register"
import { NetworkStatus } from "@/components/shared/network-status"
import { ThemeInit } from "@/components/shared/theme-init"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "ElPrece",
  description: "Sistema de gestión escolar",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon-192.png",
  },
  appleWebApp: {
    title: "ElPrece",
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
        <ThemeInit />
        <RootProviders>
          {children}
          <ServiceWorkerRegister />
          <NetworkStatus />
        </RootProviders>
      </body>
    </html>
  )
}
