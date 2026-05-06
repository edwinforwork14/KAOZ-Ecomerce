import { createClient } from "@/utils/supabase/client"

const supabase = createClient()

// Helper para limpiar URLs de imágenes
const cleanImageUrl = (url: string) => {
  if (!url) return "/placeholder.svg"
  if (url.startsWith('http')) return url
  return url
}

// === CATEGORIES ===
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  if (error) return { success: false, error }
  
  return { 
    success: true, 
    categories: data.map((c: any) => ({
      ...c,
      _id: c.id,
      image: cleanImageUrl(c.image_url)
    })) 
  }
}

// === PRODUCTS ===
export async function getProducts(params?: any) {
  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      images:product_images(*),
      variants:product_variants(*)
    `, { count: 'exact' })

  if (params?.category) query = query.eq('category_id', params.category)
  if (params?.search) query = query.ilike('name', `%${params.search}%`)
  if (params?.isNew) query = query.eq('is_new', true)

  const page = params?.page || 1
  const limit = params?.limit || 12
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query.range(from, to)

  if (error) return { success: false, error }

  const mappedProducts = data.map((p: any) => ({
    ...p,
    _id: p.id,
    images: (p.images || []).map((img: any) => ({ ...img, url: cleanImageUrl(img.url) })),
    variants: p.variants || []
  }))

  return { 
    success: true, 
    products: mappedProducts, 
    total: count,
    totalPages: Math.ceil((count || 0) / limit)
  }
}

// === ORDERS ===
export async function createOrder(orderData: any) {
  const orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`
  const { data, error } = await supabase
    .from('orders')
    .insert([{
      order_number: orderNumber,
      customer_info: orderData.customerInfo,
      shipping_address: orderData.shippingAddress,
      shipping_method: orderData.shippingMethod,
      payment_method: orderData.paymentMethod,
      notes: orderData.notes,
      order_status: 'pending',
      total: 0 // Se calcularía en el servidor o se pasaría desde el front
    }])
    .select()
    .single()

  if (error) return { success: false, message: error.message }
  return { success: true, order: { ...data, _id: data.id, orderNumber: data.order_number } }
}

export async function updateOrderWhatsApp(orderId: string) {
  return { success: true }
}

// === USER / AUTH ===
export async function getMe() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }
  
  return { 
    success: true, 
    user: {
      ...user,
      firstName: user.user_metadata?.first_name,
      lastName: user.user_metadata?.last_name,
      phone: user.user_metadata?.phone
    } 
  }
}

// === DASHBOARD & STATS ===
export async function getDashboardStats() {
  const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true })
  const { count: categoryCount } = await supabase.from('categories').select('*', { count: 'exact', head: true })
  const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true })

  return {
    success: true,
    stats: {
      totalRevenue: 0,
      totalOrders: orderCount || 0,
      totalCustomers: 0,
      totalProducts: productCount || 0,
      aov: 0,
      conversionRate: 0,
      revenuePerCustomer: 0,
      retentionRate: 0,
      abandonmentRate: 0,
      recentOrders: [],
      topProducts: [],
      ordersByStatus: [
        { _id: 'pending', count: orderCount || 0 },
        { _id: 'delivered', count: 0 }
      ]
    }
  }
}

export async function updateExchangeRate() { return { success: true } }

// === ADMIN CRUD ===
export async function createProduct(formData: any) {
  const rawData = JSON.parse(formData.get('data'))
  const { data, error } = await supabase
    .from('products')
    .insert([{
      name: rawData.name,
      description: rawData.description,
      price: rawData.price,
      original_price: rawData.originalPrice,
      category_id: rawData.category,
      brand: rawData.brand,
      is_new: rawData.isNew,
      is_featured: rawData.isFeatured
    }])
    .select()
    .single()

  if (error) return { success: false, message: error.message }
  return { success: true, product: { ...data, _id: data.id } }
}

export async function updateProduct(id: string, formData: any) {
  const rawData = JSON.parse(formData.get('data'))
  const { error } = await supabase
    .from('products')
    .update({
      name: rawData.name,
      description: rawData.description,
      price: rawData.price,
      original_price: rawData.originalPrice,
      category_id: rawData.category,
      brand: rawData.brand,
      is_new: rawData.isNew,
      is_featured: rawData.isFeatured
    })
    .eq('id', id)

  if (error) return { success: false, message: error.message }
  return { success: true }
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return { success: false, message: error.message }
  return { success: true }
}

// === SETTINGS ===
export async function getPublicSettings() {
  return {
    success: true,
    settings: { 
      currency: { symbol: '$', code: 'USD', showBsPrice: false },
      exchangeRate: { current: { usd: 1, eur: 1 }, lastUpdated: new Date().toISOString() },
      shippingMethods: [
        { id: 'standard', name: 'Envío Estándar', type: 'standard', additionalCost: 5, freeFrom: 100, requiresAddress: true },
        { id: 'pickup', name: 'Retiro en Tienda', type: 'pickup', additionalCost: 0, requiresAddress: false, pickupData: { address: 'Calle Principal #123', schedule: 'Lun-Vie 9am-6pm' } }
      ],
      paymentMethods: [
        { id: 'whatsapp', name: 'WhatsApp Pay / Transferencia', icon: 'whatsapp', isActive: true, whatsappMessage: 'Hola, quiero concretar mi pago.' }
      ]
    }
  }
}

export const api = {
  getCategories,
  getProducts,
  createOrder,
  updateOrderWhatsApp,
  getMe,
  getDashboardStats,
  updateExchangeRate,
  createProduct,
  updateProduct,
  deleteProduct,
  getPublicSettings,
  getSettings: getPublicSettings,
  getCart: async () => ({ success: true, cart: { items: [] } }),
  addToCart: async () => ({ success: true }),
  removeFromCart: async () => ({ success: true }),
  updateCartItem: async () => ({ success: true }),
  clearCart: async () => ({ success: true }),
  getFilterOptions: async () => ({ success: true, filterOptions: { brands: [], colors: [], priceRange: { min: 0, max: 1000 }, counts: { new: 0, discount: 0, inStock: 0 } } })
}