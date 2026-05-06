import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import { CartProvider } from "@/contexts/cart-context"
import { AuthProvider } from "@/contexts/auth-context"
import { brandConfig } from "@/lib/config"
import MiniCartToast from "@/components/MiniCartToast"
import DeploymentChecker from "@/components/DeploymentChecker"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100","200","300","400","500","600","700","800","900"],
  variable: "--font-poppins",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: `${brandConfig.name} | Premium E-commerce`,
    template: `%s | ${brandConfig.name}`
  },
  description: brandConfig.seo.description,
  keywords: brandConfig.seo.keywords,
  generator: "Next.js",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"),

  icons: {
    icon: [
      { url: "/favicon.ico" }
    ]
  },

  openGraph: {
    title: `${brandConfig.name} | Premium E-commerce`,
    description: brandConfig.seo.description,
    type: "website",
    locale: "es_ES",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"
  },

  twitter: {
    card: "summary_large_image",
    title: `${brandConfig.name} | Premium E-commerce`,
    description: brandConfig.seo.description,
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={poppins.variable} suppressHydrationWarning>
      <body className={poppins.className} suppressHydrationWarning>
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
