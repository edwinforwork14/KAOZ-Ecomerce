// Strategic SEO component: invisible semantic annotations
// Helps Google understand brand relationship between KAOS and common misspelling/variant "KAOZ"
// These are invisible to users but provide semantic context for search engines

import { brandConfig } from "@/lib/config"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kaoz-sport.com"

export function SeoAnnotations() {
  const pinterestVerification = process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION

  return (
    <>
      {/* 
        STRATEGIC SEO ANNOTATIONS
        These invisible elements provide Google with semantic context
        about the KAOS brand and its relationship to common search variants.
      */}

      {/* 
        DNS-prefetch and preconnect for performance (Core Web Vitals)
      */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

      {/* 
        Dublin Core metadata for semantic clarity (used by some search engines)
      */}
      <meta name="DC.title" content={`${brandConfig.name} - Premium Streetwear & Moda Urbana`} />
      <meta name="DC.description" content={brandConfig.seo.description} />
      <meta name="DC.language" content={brandConfig.seoExtended.defaultLanguage} />
      <meta name="DC.subject" content="Streetwear, Moda Urbana, Ropa Deportiva Premium" />

      {/* 
        Pinterest verification (helps with visual search and social signals)
      */}
      {pinterestVerification && (
        <meta name="p:domain_verify" content={pinterestVerification} />
      )}
    </>
  )
}
