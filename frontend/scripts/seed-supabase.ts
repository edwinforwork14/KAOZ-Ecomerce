import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
  console.log('🚀 Starting seed with Prisma-style schema...')

  // 1. Categories
  const categories = [
    { name: 'Hombre', slug: 'men', description: 'Colección para hombres', order: 1, isActive: true },
    { name: 'Mujer', slug: 'women', description: 'Colección para mujeres', order: 2, isActive: true },
    { name: 'Kids', slug: 'kids', description: 'Colección infantil', order: 3, isActive: true },
    { name: 'Accesorios', slug: 'accessories', description: 'Accesorios y complementos', order: 4, isActive: true },
  ]

  console.log('📁 Syncing categories...')
  for (const cat of categories) {
    const { error } = await supabase.from('Category').upsert([cat], { onConflict: 'slug' })
    if (error) console.warn(`Warning syncing category ${cat.name}:`, error.message)
  }

  const { data: catData, error: catFetchError } = await supabase.from('Category').select('*')
  if (catFetchError || !catData) {
    console.error('Error fetching categories:', catFetchError)
    return
  }

  const getCatId = (slug: string) => catData.find(c => c.slug === slug)?.id

  // 2. Products
  const products = [
    {
      name: 'Chaqueta Reflectiva KAOZ',
      description: 'Chaqueta técnica con materiales reflectivos para mayor visibilidad y estilo urbano.',
      price: 75.0,
      categoryId: getCatId('men'),
      brand: 'KAOZ',
      isNew: true,
      isFeatured: true,
      isActive: true,
      imageUrl: '/images/Chaqueta reflectiva.jpeg'
    },
    {
      name: 'Franela Oversized Urban',
      description: 'Franela de algodón premium con corte oversized para un look relajado y moderno.',
      price: 35.0,
      categoryId: getCatId('men'),
      brand: 'KAOZ',
      isNew: true,
      isFeatured: true,
      isActive: true,
      imageUrl: '/images/Franela Oversized.jpeg'
    },
    {
      name: 'Suéter UV Kids Adventure',
      description: 'Protección solar y comodidad para los más pequeños en sus aventuras al aire libre.',
      price: 25.0,
      categoryId: getCatId('kids'),
      brand: 'KAOZ',
      isNew: true,
      isFeatured: true,
      isActive: true,
      imageUrl: '/images/Suéter UV con capucha para niños.jpeg'
    },
    {
      name: 'Gorra KAOZ Classic',
      description: 'Gorra ajustable con logo bordado, el accesorio perfecto para cualquier outfit.',
      price: 20.0,
      categoryId: getCatId('accessories'),
      brand: 'KAOZ',
      isNew: false,
      isFeatured: true,
      isActive: true,
      imageUrl: '/images/gorras.jpeg'
    }
  ]

  console.log('📦 Syncing products...')
  for (const product of products) {
    const { imageUrl, ...prodData } = product
    if (!prodData.categoryId) {
      console.warn(`Skipping ${product.name}: Category ID not found`)
      continue
    }

    const { data: pData, error: pError } = await supabase
      .from('Product')
      .upsert([prodData], { onConflict: 'name' })
      .select()
      .single()

    if (pError) {
      console.error(`Error syncing product ${product.name}:`, pError.message)
      continue
    }

    // Image
    await supabase.from('ProductImage').upsert([{
      productId: pData.id,
      url: imageUrl,
      isMain: true
    }], { onConflict: 'productId,url' })

    // Variant
    const { data: vData, error: vError } = await supabase.from('ProductVariant').upsert([{
      productId: pData.id,
      color: 'Único',
      colorHex: '#000000'
    }], { onConflict: 'productId,color' }).select().single()

    if (vError) {
      console.error(`Error syncing variant for ${product.name}:`, vError.message)
      continue
    }

    if (vData) {
      // Size/Stock
      await supabase.from('ProductSize').upsert([{
        variantId: vData.id,
        size: 'Estándar',
        stock: 50
      }], { onConflict: 'variantId,size' })
    }
  }

  console.log('✅ Seed finished successfully!')
}

seed()
