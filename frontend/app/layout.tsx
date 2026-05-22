import type { Metadata } from "next"
import { Space_Grotesk } from "next/font/google"
import { CartProvider } from "@/contexts/cart-context"
import { AuthProvider } from "@/contexts/auth-context"
import { brandConfig } from "@/lib/config"
import MiniCartToast from "@/components/MiniCartToast"
import DeploymentChecker from "@/components/DeploymentChecker"
import { OrganizationSchema, WebsiteSchema, WebPageSchema } from "@/components/jsonld"
import { SeoAnnotations } from "@/components/seo-annotations"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kaoz-sport.com"

export const metadata: Metadata = {
  title: {
    default: `${brandConfig.name} | Premium Streetwear · Moda Urbana Minimalista`,
    template: `%s | ${brandConfig.name} Official Store`
  },
  description: brandConfig.seo.description,
  keywords: brandConfig.seoExtended.keywordEcosystem,
  generator: "Next.js",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: siteUrl,
  },

  icons: {
    icon: [
      { url: "/favicon.ico" }
    ],
    apple: [
      { url: "/apple-icon.png" }
    ]
  },

  // Google Search Console and other verification
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
  },

  openGraph: {
    title: `${brandConfig.name} | Premium Streetwear · Moda Urbana`,
    description: brandConfig.seo.description,
    type: "website",
    locale: "es_ES",
    url: siteUrl,
    siteName: brandConfig.name,
    images: [
      {
        url: brandConfig.seo.ogImage,
        width: 1200,
        height: 630,
        alt: `${brandConfig.name} - Premium Streetwear & Moda Urbana`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `${brandConfig.name} | Premium Streetwear`,
    description: brandConfig.seo.description,
    images: [brandConfig.seo.ogImage],
    site: brandConfig.seo.twitterHandle,
    creator: brandConfig.seo.twitterHandle,
  },

  // Additional SEO meta tags
  other: {
    // Strategic: help Google understand the relationship between KAOS and common misspelling KAOZ
    "application-name": "KAOS",
    // Geo targeting signals for Google
    "geo.region": brandConfig.seoExtended.businessLocation.country,
    "geo.placename": brandConfig.seoExtended.businessLocation.city,
    // Mobile optimization
    "format-detection": "telephone=yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black",
    "apple-mobile-web-app-title": brandConfig.name,
    // Bing webmaster tools
    "msapplication-TileImage": `${siteUrl}/kaozlogo1.jpeg`,
    "msapplication-TileColor": "#000000",
  },

  // Pages indexation rules
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} dark`} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap" rel="stylesheet"/>
        {/* Strategic SEO annotations for semantic clarity and KAOZ disambiguation */}
        <SeoAnnotations />
      </head>
      <body className={`${spaceGrotesk.className} selection:bg-tertiary selection:text-on-tertiary`} suppressHydrationWarning>
        <DeploymentChecker>
          <AuthProvider>
            <CartProvider>
              {/* JSON-LD Structured Data (rendered in body for compatibility) */}
              <OrganizationSchema />
              <WebsiteSchema />
              <WebPageSchema
                title={`${brandConfig.name} | Premium Streetwear · Moda Urbana Minimalista`}
                description={brandConfig.seo.description}
                path="/"
              />
              {children}
              <MiniCartToast />
            </CartProvider>
          </AuthProvider>
        </DeploymentChecker>
      </body>
    </html>
  )
}

