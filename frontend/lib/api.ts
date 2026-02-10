//const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010/api";
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://yenfit.shop/api';

// Variable para evitar múltiples redirects
let isRedirecting = false;

const getHeaders = () => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const sessionId = localStorage.getItem('sessionId') || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('sessionId', sessionId);
    headers['x-session-id'] = sessionId;
  }

  return headers;
};

// Función para manejar respuestas y errores de autenticación
const handleResponse = async (response: Response) => {
  const data = await response.json();
  
  // Si el token está expirado o es inválido
  if (!response.ok && response.status === 401) {
    const errorCodes = ['TOKEN_EXPIRED', 'INVALID_TOKEN', 'USER_NOT_FOUND'];
    
    if (data.code && errorCodes.includes(data.code)) {
      // Solo redirigir una vez
      if (!isRedirecting && typeof window !== 'undefined') {
        isRedirecting = true;
        
        // Limpiar datos de autenticación
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Disparar evento para que el auth context se actualice
        window.dispatchEvent(new Event('auth-expired'));
        
        // Redirigir al login con mensaje
        const currentPath = window.location.pathname;
        if (currentPath !== '/auth/login' && currentPath !== '/auth/register') {
          window.location.href = `/auth/login?expired=true&redirect=${encodeURIComponent(currentPath)}`;
        }
        
        // Reset después de un segundo
        setTimeout(() => {
          isRedirecting = false;
        }, 1000);
      }
    }
  }
  
  return data;
};

// Función wrapper para fetch con manejo de errores
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, options);
    return await handleResponse(response);
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const api = {
  // Auth
  async register(data: any) {
    return fetchWithAuth(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  async login(data: any) {
    const result = await fetchWithAuth(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (result.success && result.token) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    }
    return result;
  },

  async getMe() {
    return fetchWithAuth(`${API_URL}/auth/me`, {
      headers: getHeaders(),
    });
  },

  // Products
  async getProducts(params?: any) {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    return fetchWithAuth(`${API_URL}/products?${queryString}`, {
      headers: getHeaders(),
    });
  },

  async getProduct(id: string) {
    return fetchWithAuth(`${API_URL}/products/${id}`, {
      headers: getHeaders(),
    });
  },

  async getFeaturedProducts() {
    return fetchWithAuth(`${API_URL}/products/featured`, {
      headers: getHeaders(),
    });
  },

  async getFilterOptions(params?: { category?: string; search?: string }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchWithAuth(`${API_URL}/products/filter-options${queryString ? `?${queryString}` : ''}`, {
      headers: getHeaders(),
    });
  },

  // Categories
  async getCategories() {
    return fetchWithAuth(`${API_URL}/categories`, {
      headers: getHeaders(),
    });
  },

  async getCategory(id: string) {
    return fetchWithAuth(`${API_URL}/categories/${id}`, {
      headers: getHeaders(),
    });
  },

  // Cart
  async getCart() {
    return fetchWithAuth(`${API_URL}/cart`, {
      headers: getHeaders(),
    });
  },

  async addToCart(data: any) {
    return fetchWithAuth(`${API_URL}/cart/add`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  async updateCartItem(itemId: string, quantity: number) {
    return fetchWithAuth(`${API_URL}/cart/item/${itemId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ quantity }),
    });
  },

  async removeFromCart(itemId: string) {
    return fetchWithAuth(`${API_URL}/cart/item/${itemId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  async clearCart() {
    return fetchWithAuth(`${API_URL}/cart/clear`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  async syncCart() {
    return fetchWithAuth(`${API_URL}/cart/sync`, {
      method: 'POST',
      headers: getHeaders(),
    });
  },

  // Orders
  async createOrder(data: any) {
    return fetchWithAuth(`${API_URL}/orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  async updateOrderWhatsApp(orderId: string) {
    return fetchWithAuth(`${API_URL}/orders/${orderId}/whatsapp`, {
      method: 'PUT',
      headers: getHeaders(),
    });
  },

  async getMyOrders() {
    return fetchWithAuth(`${API_URL}/orders/my-orders`, {
      headers: getHeaders(),
    });
  },

  async searchOrder(orderNumber: string) {
    return fetchWithAuth(`${API_URL}/orders/search?orderNumber=${orderNumber}`, {
      headers: getHeaders(),
    });
  },

  // Settings (PUBLIC)
  async getPublicSettings() {
    return fetchWithAuth(`${API_URL}/settings/public`, {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  // Admin - Settings
  async getSettings() {
    return fetchWithAuth(`${API_URL}/settings`, {
      headers: getHeaders(),
    });
  },

  async updateSettings(data: any) {
    return fetchWithAuth(`${API_URL}/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  // Payment Methods
  async getPaymentMethods() {
    return fetchWithAuth(`${API_URL}/settings/payment-methods`, {
      headers: getHeaders(),
    });
  },

  async addPaymentMethod(data: any) {
    return fetchWithAuth(`${API_URL}/settings/payment-methods`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  async updatePaymentMethod(methodId: string, data: any) {
    return fetchWithAuth(`${API_URL}/settings/payment-methods/${methodId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  async deletePaymentMethod(methodId: string) {
    return fetchWithAuth(`${API_URL}/settings/payment-methods/${methodId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  // Shipping Methods
  async getShippingMethods() {
    return fetchWithAuth(`${API_URL}/settings/shipping-methods`, {
      headers: getHeaders(),
    });
  },

  async addShippingMethod(data: any) {
    return fetchWithAuth(`${API_URL}/settings/shipping-methods`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  async updateShippingMethod(methodId: string, data: any) {
    return fetchWithAuth(`${API_URL}/settings/shipping-methods/${methodId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  async deleteShippingMethod(methodId: string) {
    return fetchWithAuth(`${API_URL}/settings/shipping-methods/${methodId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  // Exchange Rate
  async getExchangeRate() {
    return fetchWithAuth(`${API_URL}/settings/exchange-rate`, {
      headers: getHeaders(),
    });
  },

  async updateExchangeRate() {
    return fetchWithAuth(`${API_URL}/settings/exchange-rate/update`, {
      method: 'POST',
      headers: getHeaders(),
    });
  },

  async getExchangeRateHistory(limit?: number) {
    return fetchWithAuth(`${API_URL}/settings/exchange-rate/history?limit=${limit || 30}`, {
      headers: getHeaders(),
    });
  },

  // Admin - Products
  async createProduct(formData: FormData) {
    const headers = getHeaders();
    delete (headers as any)['Content-Type'];
    
    return fetchWithAuth(`${API_URL}/admin/products`, {
      method: 'POST',
      headers,
      body: formData,
    });
  },

  async updateProduct(id: string, formData: FormData) {
    const headers = getHeaders();
    delete (headers as any)['Content-Type'];
    
    return fetchWithAuth(`${API_URL}/admin/products/${id}`, {
      method: 'PUT',
      headers,
      body: formData,
    });
  },

  async deleteProduct(id: string) {
    return fetchWithAuth(`${API_URL}/admin/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  async uploadVariantImages(productId: string, variantIndex: number, formData: FormData) {
    const headers = getHeaders();
    delete (headers as any)['Content-Type'];
    
    return fetchWithAuth(`${API_URL}/admin/products/${productId}/variants/${variantIndex}/images`, {
      method: 'POST',
      headers,
      body: formData,
    });
  },

  // Admin - Orders
  async getAllOrders(params?: any) {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    return fetchWithAuth(`${API_URL}/admin/orders?${queryString}`, {
      headers: getHeaders(),
    });
  },

  async updateOrderStatus(id: string, data: any) {
    return fetchWithAuth(`${API_URL}/admin/orders/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  async deleteOrder(id: string, reason?: string, permanent?: boolean) {
    return fetchWithAuth(`${API_URL}/admin/orders/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ reason, permanent }),
    });
  },

  async restoreOrder(id: string) {
    return fetchWithAuth(`${API_URL}/admin/orders/${id}/restore`, {
      method: 'POST',
      headers: getHeaders(),
    });
  },

  // Admin - Customers
  async getAllCustomers(params?: any) {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    return fetchWithAuth(`${API_URL}/admin/customers?${queryString}`, {
      headers: getHeaders(),
    });
  },

  async getCustomerDetails(id: string) {
    return fetchWithAuth(`${API_URL}/admin/customers/${id}`, {
      headers: getHeaders(),
    });
  },

  async getCustomerCartHistory(customerId: string, params?: any) {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    return fetchWithAuth(`${API_URL}/admin/customers/${customerId}/cart-history?${queryString}`, {
      headers: getHeaders(),
    });
  },

  // Admin - Categories
  async getAdminCategories(tree?: boolean) {
    return fetchWithAuth(`${API_URL}/admin/categories?tree=${tree || false}`, {
      headers: getHeaders(),
    });
  },

  async createCategory(data: any) {
    return fetchWithAuth(`${API_URL}/admin/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  async updateCategory(id: string, data: any) {
    return fetchWithAuth(`${API_URL}/admin/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  async deleteCategory(id: string, force?: boolean) {
    return fetchWithAuth(`${API_URL}/admin/categories/${id}?force=${force || false}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  // Analytics
  async getDashboardStats() {
    return fetchWithAuth(`${API_URL}/analytics/dashboard`, {
      headers: getHeaders(),
    });
  },

  async getInventoryReport() {
    return fetchWithAuth(`${API_URL}/analytics/inventory`, {
      headers: getHeaders(),
    });
  },
};