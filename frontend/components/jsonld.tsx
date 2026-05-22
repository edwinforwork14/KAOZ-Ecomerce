import { brandConfig } from "@/lib/config"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kaoz-sport.com"

export function OrganizationSchema() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "KAOS",
    alternateName: brandConfig.seoExtended.schemaAlternateName,
    url: siteUrl,
    logo: `${siteUrl}/kaozlogo1.jpeg`,
    description: brandConfig.seo.description,
    email: brandConfig.contact.email,
    telephone: brandConfig.contact.phone,
    address: {
      "@type": "PostalAddress",
      addressCountry: brandConfig.seoExtended.businessLocation.country,
      addressRegion: brandConfig.seoExtended.businessLocation.region,
      addressLocality: brandConfig.seoExtended.businessLocation.city,
    },
    sameAs: [
      `https://instagram.com/${brandConfig.social.instagram}`,
      brandConfig.social.facebook ? `https://facebook.com/${brandConfig.social.facebook}` : "",
      brandConfig.social.twitter ? `https://twitter.com/${brandConfig.social.twitter}` : "",
    ].filter(Boolean),
    // Strategic: signal to Google that searches for "KAOZ" should relate to this entity
    knowsAbout: [
      {
        "@type": "Thing",
        name: "Kaoz clothing brand",
        description: "Also searched as Kaoz, a premium streetwear and urban fashion brand"
      },
      {
        "@type": "Thing",
        name: "Streetwear",
        description: "Urban fashion and streetwear clothing"
      }
    ]
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function WebsiteSchema() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: brandConfig.name,
    alternateName: brandConfig.seoExtended.schemaAlternateName,
    description: brandConfig.seo.description,
    publisher: {
      "@id": `${siteUrl}/#organization`
    },
    inLanguage: brandConfig.seoExtended.defaultLanguage,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function WebPageSchema({
  title,
  description,
  path = "/",
}: {
  title: string
  description: string
  path?: string
}) {
  const url = `${siteUrl}${path}`
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": url,
    url: url,
    name: title,
    description: description,
    isPartOf: {
      "@id": `${siteUrl}/#website`
    },
    about: {
      "@id": `${siteUrl}/#organization`
    },
    inLanguage: brandConfig.seoExtended.defaultLanguage,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.url}`,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

// Product schema for dynamic product pages
export function ProductSchema({ product }: { product: any }) {
  const productUrl = `${siteUrl}/product/${product.id || product._id}`
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": productUrl,
    name: product.name,
    description: product.description || product.name,
    image: product.images?.[0]?.url || product.variants?.[0]?.images?.[0]?.url || `${siteUrl}/placeholder.svg`,
    sku: product.sku || product.id || product._id,
    brand: {
      "@type": "Brand",
      "@id": `${siteUrl}/#organization`,
      name: brandConfig.name,
      alternateName: brandConfig.seoExtended.schemaAlternateName,
    },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "USD",
      availability: product.stock > 0 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      url: productUrl,
      seller: {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`
      }
    },
    inLanguage: brandConfig.seoExtended.defaultLanguage,
  }

  // Add category if available
  if (product.category) {
    jsonLd["category"] = product.category.name || product.category
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
