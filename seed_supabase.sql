-- 1. Limpiar tablas (Opcional)
-- TRUNCATE categories, products, product_images, product_variants, product_sizes CASCADE;

-- 2. Insertar Categorías
INSERT INTO categories (name, slug) VALUES
('Moda', 'moda'),
('Accesorios', 'accesorios'),
('Tecnología', 'tecnologia'),
('Calzado', 'calzado')
ON CONFLICT (slug) DO NOTHING;

-- 3. Insertar Productos de Ejemplo
INSERT INTO products (name, slug, description, price, original_price, category_id, is_new, is_featured)
VALUES 
('Reloj Minimalist Gold', 'reloj-minimalist-gold', 'Elegancia pura en tu muñeca. Acero inoxidable con baño de oro.', 89.99, 120.00, (SELECT id FROM categories WHERE slug = 'accesorios' LIMIT 1), true, true),
('Zapatillas Urban Pro', 'zapatillas-urban-pro', 'Comodidad y estilo para el día a día.', 65.00, NULL, (SELECT id FROM categories WHERE slug = 'calzado' LIMIT 1), true, true),
('Camiseta Premium Cotton', 'camiseta-premium-cotton', 'Algodón 100% orgánico con corte moderno.', 25.00, 35.00, (SELECT id FROM categories WHERE slug = 'moda' LIMIT 1), false, true),
('Audífonos Studio Wireless', 'audifonos-studio-wireless', 'Sonido envolvente y cancelación de ruido.', 150.00, 199.99, (SELECT id FROM categories WHERE slug = 'tecnologia' LIMIT 1), true, true);

-- 4. Insertar Imágenes
INSERT INTO product_images (product_id, url, "order")
SELECT id, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800', 1 FROM products WHERE slug = 'reloj-minimalist-gold';
INSERT INTO product_images (product_id, url, "order")
SELECT id, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800', 1 FROM products WHERE slug = 'zapatillas-urban-pro';
INSERT INTO product_images (product_id, url, "order")
SELECT id, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800', 1 FROM products WHERE slug = 'camiseta-premium-cotton';
INSERT INTO product_images (product_id, url, "order")
SELECT id, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800', 1 FROM products WHERE slug = 'audifonos-studio-wireless';

-- 5. Insertar Variantes (Colores)
INSERT INTO product_variants (product_id, color)
SELECT id, 'Gold' FROM products WHERE slug = 'reloj-minimalist-gold';
INSERT INTO product_variants (product_id, color)
SELECT id, 'Red' FROM products WHERE slug = 'zapatillas-urban-pro';
INSERT INTO product_variants (product_id, color)
SELECT id, 'White' FROM products WHERE slug = 'camiseta-premium-cotton';
INSERT INTO product_variants (product_id, color)
SELECT id, 'Black' FROM products WHERE slug = 'audifonos-studio-wireless';

-- 6. Insertar Tallas y Stock
INSERT INTO product_sizes (variant_id, size, stock)
SELECT id, 'Única', 50 FROM product_variants WHERE color = 'Gold';
INSERT INTO product_sizes (variant_id, size, stock)
SELECT id, '42', 15 FROM product_variants WHERE color = 'Red';
INSERT INTO product_sizes (variant_id, size, stock)
SELECT id, 'M', 25 FROM product_variants WHERE color = 'White';
INSERT INTO product_sizes (variant_id, size, stock)
SELECT id, 'Estándar', 10 FROM product_variants WHERE color = 'Black';
