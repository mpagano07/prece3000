import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { RootProviders } from "@/components/shared/root-providers"
import { ServiceWorkerRegister } from "@/components/shared/service-worker-register"
import { NetworkStatus } from "@/components/shared/network-status"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Preceptor",
  description: "Sistema de gestión escolar",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon-192.png",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.classList.add("dark");else if(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")}catch(e){}try{window.__deferredInstallPrompt=null;window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__deferredInstallPrompt=e});window.addEventListener("appinstalled",function(){window.__deferredInstallPrompt=null})}catch(e){}})()`,
          }}
        />
        <RootProviders>
          {children}
          <ServiceWorkerRegister />
          <NetworkStatus />
        </RootProviders>
      </body>
    </html>
  )
}
