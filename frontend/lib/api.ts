// Sanitizar BACKEND_URL para evitar dobles slashes
const getSanitizedBackendUrl = () => {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5010";
  return url.replace(/\/$/, ''); // Remueve el slash al final si existe
}

const BACKEND_URL = getSanitizedBackendUrl();
const API_BASE_URL = `${BACKEND_URL}/api`;

// Helper para limpiar URLs de imágenes
export const cleanImageUrl = (url: string) => {
  if (!url) return "/placeholder.svg"
  if (url.startsWith('http')) return url
  const base = BACKEND_URL.replace(/\/$/, ''); // Eliminar slash final
  if (url.startsWith('/')) return `${base}${url}`
  return `${base}/uploads/${url}`
}


console.log("🚀 KAOZ API initialized with BACKEND_URL:", BACKEND_URL);

// === CATEGORIES ===
export async function getCategories() {
  try {
    const url = `${API_BASE_URL}/public/categories`;
    console.log(`📡 GET Categories from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ HTTP Error ${response.status} fetching categories`);
    }
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("❌ Error fetching categories:", error);
    return { success: false, error };
  }
}

export async function getAdminCategories(tree = false) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/admin/categories?tree=${tree}`, { headers })
    const data = await response.json()
    
    // Mapear _id para consistencia en el frontend
    if (data.success && data.categories) {
      const mapCat = (cat: any) => ({
        ...cat,
        _id: cat.id,
        subcategories: cat.subcategories?.map(mapCat)
      })
      data.categories = data.categories.map(mapCat)
    }
    
    return data
  } catch (error: any) {
    console.error("Error fetching admin categories:", error)
    return { success: false, error }
  }
}

export async function createCategory(categoryData: any) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/admin/categories`, {
      method: "POST",
      headers,
      body: JSON.stringify(categoryData)
    })
    return await response.json()
  } catch (error: any) {
    console.error("Error creating category:", error)
    return { success: false, message: error.message }
  }
}

export async function updateCategory(id: string, categoryData: any) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/admin/categories/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(categoryData)
    })
    return await response.json()
  } catch (error: any) {
    console.error("Error updating category:", error)
    return { success: false, message: error.message }
  }
}

export async function deleteCategory(id: string, force = false) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/admin/categories/${id}${force ? '?force=true' : ''}`, {
      method: "DELETE",
      headers
    })
    return await response.json()
  } catch (error: any) {
    console.error("Error deleting category:", error)
    return { success: false, message: error.message }
  }
}

// === CUSTOMERS ===
export async function getAllCustomers() {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/admin/customers`, { headers })
    const data = await response.json()
    return data
  } catch (error: any) {
    console.error("Error fetching customers:", error)
    return { success: false, error }
  }
}

// === PRODUCTS ===
export async function getProducts(params?: any) {
  try {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined) queryParams.append(key, params[key])
      })
    }
    
    const response = await fetch(`${API_BASE_URL}/products?${queryParams.toString()}`)
    const data = await response.json()
    
    // El backend devuelve los productos con _id si es MongoDB, pero si es Prisma/Supabase 
    // y el backend los mapea, debemos asegurar consistencia.
    if (data.success && Array.isArray(data.products)) {
      data.products = data.products.map((p: any) => ({
        ...p,
        _id: p.id || p._id,
        images: (Array.isArray(p.images) ? p.images : []).map((img: any) => ({ ...img, url: cleanImageUrl(img.url) })),
        variants: (p.variants || []).map((v: any) => ({
          ...v,
          images: (v.images || []).map((img: any) => ({ ...img, url: cleanImageUrl(img.url) }))
        }))
      }))
    }
    
    return data
  } catch (error: any) {
    console.error("Error fetching products:", error)
    return { success: false, error }
  }
}

export async function getProduct(id: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`)
    const data = await response.json()
    
    if (data.success && data.product) {
      data.product = {
        ...data.product,
        _id: data.product.id || data.product._id,
        images: (data.product.images || []).map((img: any) => ({ ...img, url: cleanImageUrl(img.url) })),
        variants: (data.product.variants || []).map((v: any) => ({
          ...v,
          images: (v.images || []).map((img: any) => ({ ...img, url: cleanImageUrl(img.url) }))
        }))
      }
    }
    
    return data
  } catch (error: any) {
    console.error(`Error fetching product ${id}:`, error)
    return { success: false, error }
  }
}

// === ORDERS ===
export async function createOrder(orderData: any) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData)
    })
    const data = await response.json()
    
    if (data.success) {
      return { 
        success: true, 
        order: { 
          ...data.order, 
          _id: data.order.id, 
          orderNumber: data.order.orderNumber 
        } 
      }
    }
    return { success: false, message: data.message || 'Error al crear pedido' }
  } catch (error: any) {
    console.error('Error in createOrder:', error)
    return { success: false, message: error.message }
  }
}

export async function updateOrderWhatsApp(orderId: string) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/whatsapp`, {
      method: 'PUT',
      headers
    })
    return await response.json()
  } catch (error: any) {
    console.error('Error in updateOrderWhatsApp:', error)
    return { success: false, message: error.message }
  }
}

// === USER / AUTH ===
export async function getMe() {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/auth/me`, { headers })
    const data = await response.json()
    return data
  } catch (error: any) {
    console.error("Error fetching me:", error)
    return { success: false, error: error.message }
  }
}

// === DASHBOARD & STATS ===
export async function getDashboardStats() {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/analytics/dashboard`, { headers })
    const data = await response.json()
    return data
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error)
    return { success: false, error: error.message }
  }
}

export async function getInventoryStats() {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/admin/products/stats`, { headers })
    const data = await response.json()
    return data
  } catch (error: any) {
    console.error("Error fetching inventory stats:", error)
    return { success: false, error: error.message }
  }
}

export async function updateExchangeRate(data?: { usd: number, eur?: number }) { 
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/settings/exchange-rate/update`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined
    })
    return await response.json()
  } catch (error: any) {
    console.error("Error updating exchange rate:", error)
    return { success: false, error: error.message }
  }
}

export async function getExchangeRate() {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/settings/exchange-rate`, { headers })
    return await response.json()
  } catch (error: any) {
    console.error("Error fetching exchange rate:", error)
    return { success: false, error: error.message }
  }
}

export async function getExchangeRateHistory(limit: number = 30) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/settings/exchange-rate/history?limit=${limit}`, { headers })
    return await response.json()
  } catch (error: any) {
    console.error("Error fetching exchange rate history:", error)
    return { success: false, error: error.message }
  }
}

// === ADMIN CRUD ===
export async function createProduct(formData: FormData) {
  try {
    const headers = await getAuthHeaders()
    const { 'Content-Type': _, ...authHeaders } = headers
    
    const response = await fetch(`${API_BASE_URL}/admin/products`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
    })
    const data = await response.json()
    return data
  } catch (error: any) {
    console.error("Error creating product:", error)
    return { success: false, message: error.message }
  }
}

export async function updateProduct(id: string, formData: FormData) {
  try {
    const headers = await getAuthHeaders()
    const { 'Content-Type': _, ...authHeaders } = headers
    
    const response = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
      method: "PUT",
      headers: authHeaders,
      body: formData,
    })
    const data = await response.json()
    return data
  } catch (error: any) {
    console.error("Error updating product:", error)
    return { success: false, message: error.message }
  }
}

export async function deleteProduct(id: string) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
      method: "DELETE",
      headers
    })
    const data = await response.json()
    return data
  } catch (error: any) {
    console.error("Error deleting product:", error)
    return { success: false, message: error.message }
  }
}

export async function uploadVariantImages(productId: string, variantIndex: number, formData: FormData) {
  try {
    const headers = await getAuthHeaders()
    const { 'Content-Type': _, ...authHeaders } = headers
    
    const response = await fetch(`${API_BASE_URL}/admin/products/${productId}/variants/${variantIndex}/images`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
    })
    const data = await response.json()
    return data
  } catch (error: any) {
    console.error("Error uploading variant images:", error)
    return { success: false, message: error.message }
  }
}

// === ADMIN ORDERS ===
export async function getAllOrders() {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/admin/orders`, { headers })
    return await response.json()
  } catch (error: any) {
    console.error("Error fetching all orders:", error)
    return { success: false, message: error.message }
  }
}

export async function updateOrderStatus(id: string, updateData: { orderStatus?: string, paymentStatus?: string, note?: string, adminNotes?: string }) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/admin/orders/${id}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    })
    return await response.json()
  } catch (error: any) {
    console.error("Error updating order status:", error)
    return { success: false, message: error.message }
  }
}

// === SETTINGS ===
export async function getPublicSettings() {
  const url = `${API_BASE_URL}/settings/public`;
  console.log(`🌐 [API] Fetching public settings from: ${url}`);
  try {
    const response = await fetch(url)
    console.log(`📡 [API] Response status: ${response.status}`);
    const data = await response.json()
    return data
  } catch (error: any) {
    console.error("❌ [API] Error fetching settings:", error)
    // Fallback básico para evitar que la UI se rompa
    return {
      success: true,
      settings: { 
        currency: { symbol: '$', code: 'USD', showBsPrice: false },
        shippingMethods: [],
        paymentMethods: []
      }
    }
  }
}

export async function getSettings() {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/settings`, { headers })
    return await response.json()
  } catch (error: any) {
    console.error("Error fetching admin settings:", error)
    return { success: false, error: error.message }
  }
}

export async function updateSettings(updates: any) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    })
    return await response.json()
  } catch (error: any) {
    console.error("Error updating settings:", error)
    return { success: false, error: error.message }
  }
}

// Payment Methods
export async function addPaymentMethod(methodData: any) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/settings/payment-methods`, {
      method: 'POST',
      headers,
      body: JSON.stringify(methodData)
    })
    return await response.json()
  } catch (error: any) {
    console.error("Error adding payment method:", error)
    return { success: false, error: error.message }
  }
}

export async function updatePaymentMethod(id: string, methodData: any) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/settings/payment-methods/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(methodData)
    })
    return await response.json()
  } catch (error: any) {
    console.error("Error updating payment method:", error)
    return { success: false, error: error.message }
  }
}

export async function deletePaymentMethod(id: string) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/settings/payment-methods/${id}`, {
      method: 'DELETE',
      headers
    })
    return await response.json()
  } catch (error: any) {
    console.error("Error deleting payment method:", error)
    return { success: false, error: error.message }
  }
}

// Shipping Methods
export async function addShippingMethod(methodData: any) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/settings/shipping-methods`, {
      method: 'POST',
      headers,
      body: JSON.stringify(methodData)
    })
    return await response.json()
  } catch (error: any) {
    console.error("Error adding shipping method:", error)
    return { success: false, error: error.message }
  }
}

export async function updateShippingMethod(id: string, methodData: any) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/settings/shipping-methods/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(methodData)
    })
    return await response.json()
  } catch (error: any) {
    console.error("Error updating shipping method:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteShippingMethod(id: string) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/settings/shipping-methods/${id}`, {
      method: 'DELETE',
      headers
    })
    return await response.json()
  } catch (error: any) {
    console.error("Error deleting shipping method:", error)
    return { success: false, error: error.message }
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

let cachedSession: any = null
let lastSessionFetch = 0
const SESSION_CACHE_TIME = 60 * 1000 // 1 minuto

const ADMIN_TOKEN_KEY = "kaoz_admin_token"

const getAuthHeaders = async () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  const sessionId = getSessionId()
  if (sessionId) {
    headers['x-session-id'] = sessionId
  }

  // Token de admin del backend (JWT propio, independiente de Supabase)
  if (typeof window !== 'undefined') {
    const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY)
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`
    }
  }
  
  return headers
}


// === CART ===
export async function getCart() {
  try {
    const headers = await getAuthHeaders()
    const url = `${API_BASE_URL}/cart`;
    console.log(`📡 GET Cart from: ${url}`);
    const response = await fetch(url, { headers })
    if (!response.ok) {
      console.error(`❌ HTTP Error ${response.status} fetching cart`);
    }
    return await response.json()
  } catch (error: any) {
    console.error('❌ Error in getCart:', error)
    return { success: false, message: error.message }
  }
}

export async function addToCart(itemData: any) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/cart/add`, {
      method: 'POST',
      headers,
      body: JSON.stringify(itemData)
    })
    return await response.json()
  } catch (error: any) {
    console.error('Error in addToCart:', error)
    return { success: false, message: error.message }
  }
}

export async function removeFromCart(itemId: string) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/cart/item/${itemId}`, {
      method: 'DELETE',
      headers
    })
    return await response.json()
  } catch (error: any) {
    console.error('Error in removeFromCart:', error)
    return { success: false, message: error.message }
  }
}

export async function updateCartItem(itemId: string, quantity: number) {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/cart/item/${itemId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ quantity })
    })
    return await response.json()
  } catch (error: any) {
    console.error('Error in updateCartItem:', error)
    return { success: false, message: error.message }
  }
}

export async function clearCart() {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/cart/clear`, {
      method: 'DELETE',
      headers
    })
    return await response.json()
  } catch (error: any) {
    console.error('Error in clearCart:', error)
    return { success: false, message: error.message }
  }
}

// === FILTER OPTIONS ===
export async function getFilterOptions(params?: any) {
  try {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined) queryParams.append(key, params[key])
      })
    }
    
    const response = await fetch(`${API_BASE_URL}/products/filter-options?${queryParams.toString()}`)
    const data = await response.json()
    
    if (data.success && data.filterOptions) {
      return {
        success: true,
        brands: data.filterOptions.brands || [],
        colors: (data.filterOptions.colors || []).map((c: any) => c.name),
        priceRange: data.filterOptions.priceRange || { min: 0, max: 1000 }
      }
    }
    return data
  } catch (error: any) {
    console.error("Error fetching filter options:", error)
    return { success: false, error }
  }
}

export const api = {
  getCategories,
  getProducts,
  getProduct,
  createOrder,
  updateOrderWhatsApp,
  getMe,
  getDashboardStats,
  getExchangeRate,
  getExchangeRateHistory,
  updateExchangeRate,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadVariantImages,
  getPublicSettings,
  getSettings,
  updateSettings,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  addShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
  getCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCart,
  getFilterOptions,
  getAllOrders,
  updateOrderStatus,
  getAllCustomers,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  // === BULK PRODUCTS ===
  initBulkSession: async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/admin/bulk/init`, {
        method: 'POST',
        headers
      })
      return await response.json()
    } catch (error: any) {
      console.error("Error initiating bulk session:", error)
      return { success: false, error: error.message }
    }
  },
  getBulkSession: async (id: string) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/admin/bulk/${id}`, { headers })
      return await response.json()
    } catch (error: any) {
      console.error("Error fetching bulk session:", error)
      return { success: false, error: error.message }
    }
  },
  uploadBulkImages: async (sessionId: string, formData: FormData) => {
    try {
      const headers = await getAuthHeaders()
      const { 'Content-Type': _, ...authHeaders } = headers
      const response = await fetch(`${API_BASE_URL}/admin/bulk/${sessionId}/upload`, {
        method: 'POST',
        headers: authHeaders,
        body: formData
      })
      return await response.json()
    } catch (error: any) {
      console.error("Error uploading bulk images:", error)
      return { success: false, error: error.message }
    }
  },
  updateBulkDrafts: async (id: string, drafts: any[]) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/admin/bulk/${id}/drafts`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ drafts })
      })
      return await response.json()
    } catch (error: any) {
      console.error("Error updating bulk drafts:", error)
      return { success: false, error: error.message }
    }
  },
  publishBulkSession: async (id: string) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/admin/bulk/${id}/publish`, {
        method: 'POST',
        headers
      })
      return await response.json()
    } catch (error: any) {
      console.error("Error publishing bulk session:", error)
      return { success: false, error: error.message }
    }
  },
  // === EXPENSES ===
  getAllExpenses: async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/admin/expenses`, { headers })
      return await response.json()
    } catch (error: any) {
      console.error("Error fetching expenses:", error)
      return { success: false, error: error.message }
    }
  },
  createExpense: async (expenseData: any) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/admin/expenses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(expenseData)
      })
      return await response.json()
    } catch (error: any) {
      console.error("Error creating expense:", error)
      return { success: false, error: error.message }
    }
  },
  deleteExpense: async (id: string) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/admin/expenses/${id}`, {
        method: 'DELETE',
        headers
      })
      return await response.json()
    } catch (error: any) {
      console.error("Error deleting expense:", error)
      return { success: false, error: error.message }
    }
  }
}