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
    .from('Category')
    .select('*')
    .order('name')

  if (error) return { success: false, error }
  
  return { 
    success: true, 
    categories: data.map((c: any) => ({
      ...c,
      _id: c.id,
      image: cleanImageUrl(c.image),
      image_url: cleanImageUrl(c.image)
    })) 
  }
}

// === PRODUCTS ===
export async function getProducts(params?: any) {
  let query = supabase
    .from('Product')
    .select(`
      *,
      category:Category(*),
      images:ProductImage(*),
      variants:ProductVariant(*)
    `, { count: 'exact' })

  if (params?.category) query = query.eq('categoryId', params.category)
  if (params?.search) query = query.ilike('name', `%${params.search}%`)
  if (params?.isNew) query = query.eq('isNew', true)

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
    .from('Order')
    .insert([{
      orderNumber: orderNumber,
      customerInfo: orderData.customerInfo,
      shippingAddress: orderData.shippingAddress,
      shippingMethod: orderData.shippingMethod,
      notes: orderData.notes,
      orderStatus: 'pending',
      total: orderData.total || 0
    }])
    .select()
    .single()

  if (error) return { success: false, message: error.message }
  return { success: true, order: { ...data, _id: data.id, orderNumber: data.orderNumber } }
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
  const { count: productCount } = await supabase.from('Product').select('*', { count: 'exact', head: true })
  const { count: categoryCount } = await supabase.from('Category').select('*', { count: 'exact', head: true })
  const { count: orderCount } = await supabase.from('Order').select('*', { count: 'exact', head: true })

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
    .from('Product')
    .insert([{
      name: rawData.name,
      description: rawData.description,
      price: rawData.price,
      originalPrice: rawData.originalPrice,
      categoryId: rawData.category,
      brand: rawData.brand,
      isNew: rawData.isNew,
      isFeatured: rawData.isFeatured
    }])
    .select()
    .single()

  if (error) return { success: false, message: error.message }
  return { success: true, product: { ...data, _id: data.id } }
}

export async function updateProduct(id: string, formData: any) {
  const rawData = JSON.parse(formData.get('data'))
  const { error } = await supabase
    .from('Product')
    .update({
      name: rawData.name,
      description: rawData.description,
      price: rawData.price,
      originalPrice: rawData.originalPrice,
      categoryId: rawData.category,
      brand: rawData.brand,
      isNew: rawData.isNew,
      isFeatured: rawData.isFeatured
    })
    .eq('id', id)

  if (error) return { success: false, message: error.message }
  return { success: true }
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from('Product').delete().eq('id', id)
  if (error) return { success: false, message: error.message }
  return { success: true }
}

// === SETTINGS ===
export async function getPublicSettings() {
  return {
    success: true,
    settings: { 
      currency: { symbol: '$', code: 'USD', showBsPrice: false },
      exchangeRate: { usd: 1, eur: 1, date: new Date().toISOString() },
      shippingMethods: [
        { id: 'standard', name: 'Envío Estándar', type: 'standard', additionalCost: 5, freeFrom: 100, requiresAddress: true },
        { id: 'pickup', name: 'Retiro en Tienda', type: 'pickup', additionalCost: 0, requiresAddress: false, pickupData: { address: 'Calle Principal #123', schedule: 'Lun-Vie 9am-6pm' } }
      ],
      paymentMethods: [
        { id: 'whatsapp', name: 'WhatsApp Pay / Transferencia', icon: 'whatsapp', isActive: true, whatsappMessage: 'Hola, quiero concretar mi pago.' }
      ]
    },
    exchangeRate: { usd: 1, eur: 1 }
  }
}

// === CART HELPERS ===
const getSessionId = () => {
  if (typeof window === 'undefined') return null
  let sessionId = localStorage.getItem('kaoz_session_id')
  if (!sessionId) {
    sessionId = `sess_${Math.random().toString(36).substring(2, 15)}`
    localStorage.setItem('kaoz_session_id', sessionId)
  }
  return sessionId
}

const getOrCreateCart = async () => {
  const sessionId = getSessionId()
  const { data: { user } } = await supabase.auth.getUser()
  
  let query = supabase.from('Cart').select('id')
  if (user) query = query.eq('userId', user.id)
  else query = query.eq('sessionId', sessionId)
  
  const { data: existingCart } = await query.single()
  
  if (existingCart) return existingCart.id
  
  const { data: newCart, error } = await supabase
    .from('Cart')
    .insert([{
      userId: user?.id || null,
      sessionId: user ? null : sessionId
    }])
    .select()
    .single()
    
  if (error) throw error
  return newCart.id
}

// === CART ===
export async function getCart() {
  try {
    const sessionId = getSessionId()
    const { data: { user } } = await supabase.auth.getUser()
    
    let query = supabase.from('Cart').select('id')
    if (user) query = query.eq('userId', user.id)
    else query = query.eq('sessionId', sessionId)
    
    const { data: cart } = await query.single()
    if (!cart) return { success: true, cart: { items: [] } }
    
    const { data: items, error } = await supabase
      .from('CartItem')
      .select('*, product:Product(*)')
      .eq('cartId', cart.id)
      
    if (error) return { success: false, message: error.message }
    
    return { 
      success: true, 
      cart: { 
        items: items.map(item => ({
          ...item,
          _id: item.id,
          product: {
            ...item.product,
            _id: item.product.id
          }
        })) 
      } 
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function addToCart(itemData: any) {
  try {
    const cartId = await getOrCreateCart()
    
    // Check if item already exists
    const { data: existingItem } = await supabase
      .from('CartItem')
      .select('*')
      .eq('cartId', cartId)
      .eq('productId', itemData.productId)
      .eq('size', itemData.size)
      .eq('color', itemData.color)
      .single()
      
    if (existingItem) {
      const newQty = existingItem.quantity + (itemData.quantity || 1)
      const { error } = await supabase
        .from('CartItem')
        .update({ 
          quantity: newQty,
          subtotal: newQty * existingItem.price
        })
        .eq('id', existingItem.id)
      if (error) return { success: false, message: error.message }
    } else {
      const { error } = await supabase
        .from('CartItem')
        .insert([{
          cartId,
          productId: itemData.productId,
          name: itemData.name,
          image: itemData.image,
          color: itemData.color,
          size: itemData.size,
          quantity: itemData.quantity || 1,
          price: itemData.price,
          subtotal: (itemData.quantity || 1) * itemData.price
        }])
      if (error) return { success: false, message: error.message }
    }
    
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function removeFromCart(itemId: string) {
  const { error } = await supabase.from('CartItem').delete().eq('id', itemId)
  if (error) return { success: false, message: error.message }
  return { success: true }
}

export async function updateCartItem(itemId: string, quantity: number) {
  const { data: item } = await supabase.from('CartItem').select('price').eq('id', itemId).single()
  if (!item) return { success: false, message: 'Item not found' }
  
  const { error } = await supabase
    .from('CartItem')
    .update({ 
      quantity,
      subtotal: quantity * item.price
    })
    .eq('id', itemId)
    
  if (error) return { success: false, message: error.message }
  return { success: true }
}

export async function clearCart() {
  try {
    const sessionId = getSessionId()
    const { data: { user } } = await supabase.auth.getUser()
    
    let query = supabase.from('Cart').select('id')
    if (user) query = query.eq('userId', user.id)
    else query = query.eq('sessionId', sessionId)
    
    const { data: cart } = await query.single()
    if (!cart) return { success: true }
    
    const { error } = await supabase.from('CartItem').delete().eq('cartId', cart.id)
    if (error) return { success: false, message: error.message }
    
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// === FILTER OPTIONS ===
export async function getFilterOptions(params?: any) {
  const { data: products } = await supabase.from('Product').select('brand, price')
  const { data: variants } = await supabase.from('ProductVariant').select('color, colorHex')
  
  const brands = Array.from(new Set((products || []).map(p => p.brand).filter(Boolean)))
  
  const colorMap = new Map()
  variants?.forEach(v => {
    if (v.color && !colorMap.has(v.color)) {
      colorMap.set(v.color, v.colorHex)
    }
  })
  
  const colors = Array.from(colorMap.entries()).map(([name, hex]) => ({ name, hex }))
  
  const prices = (products || []).map(p => p.price)
  const minPrice = prices.length ? Math.min(...prices) : 0
  const maxPrice = prices.length ? Math.max(...prices) : 1000

  return { 
    success: true, 
    filterOptions: { 
      brands, 
      colors, 
      priceRange: { min: minPrice, max: maxPrice }, 
      counts: { 
        new: (products || []).filter((p: any) => p.isNew).length, 
        discount: (products || []).filter((p: any) => p.originalPrice && p.originalPrice > p.price).length, 
        inStock: (products || []).length // Placeholder
      } 
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
  getCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCart,
  getFilterOptions
}