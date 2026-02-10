export const brandConfig = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'YF',
  slogan: process.env.NEXT_PUBLIC_BRAND_SLOGAN || '¡𝐃𝐞𝐩𝐨𝐫𝐭𝐞 𝐜𝐨𝐧 𝐞𝐬𝐭𝐢𝐥𝐨 𝐞𝐧 𝐭𝐮 𝐝𝐞𝐬𝐭𝐢𝐧𝐨!',
  colors: {
    primary: process.env.NEXT_PUBLIC_BRAND_COLOR_PRIMARY || '#111827',
    secondary: process.env.NEXT_PUBLIC_BRAND_COLOR_SECONDARY || '#383434ff',
    accent: process.env.NEXT_PUBLIC_BRAND_COLOR_ACCENT || '#141414ff',
  },
  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'corporacionyenfitca@gmail.com',
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '+584122234188',
    address: process.env.NEXT_PUBLIC_CONTACT_ADDRESS || 'Valencia, Venezuela',
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '584122234188',
  },
  social: {
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM || 'https://www.instagram.com/YF.vzla/',
    facebook: process.env.NEXT_PUBLIC_FACEBOOK || 'https://facebook.com/YF',
    twitter: process.env.NEXT_PUBLIC_TWITTER || 'https://twitter.com/YF',
    youtube: process.env.NEXT_PUBLIC_YOUTUBE || 'https://youtube.com/YF',
  },
  seo: {
    description: process.env.NEXT_PUBLIC_META_DESCRIPTION || 'Ropa deportiva premium',
    keywords: process.env.NEXT_PUBLIC_META_KEYWORDS || 'ropa deportiva, fitness',
  },
};