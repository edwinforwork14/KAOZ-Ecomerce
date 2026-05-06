'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getProducts(params?: {
  category?: string;
  search?: string;
  limit?: number;
}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('products')
    .select(`
      *,
      categories (name, slug),
      product_variants (
        *,
        product_sizes (*)
      ),
      product_images (*)
    `)
    .eq('is_active', true);

  if (params?.category) {
    query = query.eq('category_id', params.category);
  }

  if (params?.search) {
    query = query.ilike('name', `%${params.search}%`);
  }

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching products:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function createOrder(orderData: any) {
  const supabase = await createClient();
  
  // 1. Create Order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      ...orderData.main,
      order_number: `YF-${Date.now()}`
    }])
    .select()
    .single();

  if (orderError) return { success: false, error: orderError.message };

  // 2. Create Order Items
  const items = orderData.items.map((item: any) => ({
    order_id: order.id,
    ...item
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(items);

  if (itemsError) return { success: false, error: itemsError.message };

  revalidatePath('/admin/orders');
  return { success: true, orderNumber: order.order_number };
}
