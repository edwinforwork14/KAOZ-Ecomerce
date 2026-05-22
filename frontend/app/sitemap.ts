import { MetadataRoute } from "next"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kaoz-sport.com"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Base static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/checkout`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ]

  // Try to fetch products for dynamic product pages
  let productRoutes: MetadataRoute.Sitemap = []
  try {
    const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5010").replace(/\/$/, "")
    const response = await fetch(`${backendUrl}/api/products?limit=1000`, {
      signal: AbortSignal.timeout(5000),
    })
    const data = await response.json()

    if (data.success && Array.isArray(data.products)) {
      productRoutes = data.products.map((product: any) => ({
        url: `${siteUrl}/product/${product.id || product._id}`,
        lastModified: new Date(product.updatedAt || product.createdAt || Date.now()),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }))
    }
  } catch (error) {
    console.error("Error fetching products for sitemap:", error)
    // Continue with static routes only if fetch fails
  }

  // Try to fetch categories for category pages
  let categoryRoutes: MetadataRoute.Sitemap = []
  try {
    const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5010").replace(/\/$/, "")
    const response = await fetch(`${backendUrl}/api/categories`, {
      signal: AbortSignal.timeout(5000),
    })
    const data = await response.json()
    const categories = data.categories || data.data || []

    if (Array.isArray(categories)) {
      categoryRoutes = categories.map((category: any) => ({
        url: `${siteUrl}/catalog/category/${category.slug}`,
        lastModified: new Date(category.updatedAt || category.createdAt || Date.now()),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }))
    }
  } catch (error) {
    console.error("Error fetching categories for sitemap:", error)
  }

  return [...staticRoutes, ...productRoutes, ...categoryRoutes]
}
