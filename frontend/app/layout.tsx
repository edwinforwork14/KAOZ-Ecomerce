import type { Metadata } from "next"
import { Space_Grotesk } from "next/font/google"
import { CartProvider } from "@/contexts/cart-context"
import { AuthProvider } from "@/contexts/auth-context"
import { brandConfig } from "@/lib/config"
import MiniCartToast from "@/components/MiniCartToast"
import DeploymentChecker from "@/components/DeploymentChecker"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: `KAOS Urban Athletics | Premium E-commerce`,
    template: `%s | KAOS Urban Athletics`
  },
  description: "Technical sportswear strictly engineered for the urban grid.",
  keywords: ["kaos", "athletics", "urban", "technical", "sportswear"],
  generator: "Next.js",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"),

  icons: {
    icon: [
      { url: "/favicon.ico" }
    ]
  },

  openGraph: {
    title: `KAOS Urban Athletics | Premium E-commerce`,
    description: "Technical sportswear strictly engineered for the urban grid.",
    type: "website",
    locale: "es_ES",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"
  },

  twitter: {
    card: "summary_large_image",
    title: `KAOS Urban Athletics | Premium E-commerce`,
    description: "Technical sportswear strictly engineered for the urban grid.",
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} dark`} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap" rel="stylesheet"/>
      </head>
      <body className={`${spaceGrotesk.className} selection:bg-tertiary selection:text-on-tertiary`} suppressHydrationWarning>
        <DeploymentChecker>
          <AuthProvider>
            <CartProvider>
              {children}
              <MiniCartToast />
            </CartProvider>
          </AuthProvider>
        </DeploymentChecker>
      </body>
    </html>
  )
}

