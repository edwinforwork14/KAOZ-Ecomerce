'use server';

import { revalidatePath } from 'next/cache';

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5010").replace(/\/$/, "");

export async function getProducts(params?: {
  category?: string;
  search?: string;
  limit?: number;
}) {
  try {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${BACKEND_URL}/api/products?${queryParams.toString()}`);
    const data = await response.json();

    if (!data.success) {
      return { success: false, error: data.message || 'Error fetching products' };
    }

    return { success: true, data: data.products };
  } catch (error: any) {
    console.error('Error in getProducts action:', error);
    return { success: false, error: error.message };
  }
}

export async function createOrder(orderData: any) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });
    
    const data = await response.json();

    if (!data.success) {
      return { success: false, error: data.message || 'Error al crear pedido' };
    }

    revalidatePath('/admin/orders');
    return { success: true, orderNumber: data.order.orderNumber };
  } catch (error: any) {
    console.error('Error in createOrder action:', error);
    return { success: false, error: error.message };
  }
}
