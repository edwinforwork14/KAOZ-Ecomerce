const mongoose = require("mongoose");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Models (Legacy)
const Product = require("../src/models/Product");
const Category = require("../src/models/Category");
const User = require("../src/models/User");

// Supabase Setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Needs service role to bypass RLS
);

const idMap = new Map(); // MongoDB ID -> Postgres UUID

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🚀 Connected to MongoDB");

    // 1. Migrate Categories
    console.log("📁 Migrating Categories...");
    const categories = await Category.find().lean();
    
    // Sort by level to ensure parents are created first
    categories.sort((a, b) => (a.level || 0) - (b.level || 0));

    for (const cat of categories) {
      const parentId = cat.parent ? idMap.get(cat.parent.toString()) : null;
      
      const { data, error } = await supabase
        .from("categories")
        .insert([{
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          image_url: cat.image,
          parent_id: parentId,
          level: cat.level,
          display_order: cat.order,
          is_active: cat.isActive,
          seo: cat.seo || {}
        }])
        .select()
        .single();

      if (error) {
        console.error(`❌ Error migrating category ${cat.name}:`, error.message);
      } else {
        idMap.set(cat._id.toString(), data.id);
      }
    }

    // 2. Migrate Products
    console.log("📦 Migrating Products...");
    const products = await Product.find().lean();

    for (const p of products) {
      const categoryId = idMap.get(p.category.toString());
      if (!categoryId) {
        console.warn(`⚠️ Skipping product ${p.name}: Category not found`);
        continue;
      }

      // Insert Product
      const { data: newProduct, error: pError } = await supabase
        .from("products")
        .insert([{
          name: p.name,
          description: p.description,
          price: p.price,
          original_price: p.originalPrice,
          price_config: p.priceConfig || {},
          category_id: categoryId,
          brand: p.brand,
          is_new: p.isNew,
          marked_as_new_at: p.markedAsNewAt,
          new_duration_days: p.newDurationDays,
          is_featured: p.isFeatured,
          is_active: p.isActive,
          rating: p.rating,
          review_count: p.reviewCount,
          view_count: p.viewCount,
          add_to_cart_count: p.addToCartCount,
          tags: p.tags,
          features: p.features,
          seo: p.seo || {}
        }])
        .select()
        .single();

      if (pError) {
        console.error(`❌ Error migrating product ${p.name}:`, pError.message);
        continue;
      }

      // 3. Migrate Variants
      if (p.variants && p.variants.length > 0) {
        for (const v of p.variants) {
          const { data: newVariant, error: vError } = await supabase
            .from("product_variants")
            .insert([{
              product_id: newProduct.id,
              color: v.color,
              color_hex: v.colorHex
            }])
            .select()
            .single();

          if (vError) {
            console.error(`❌ Error migrating variant for ${p.name}:`, vError.message);
            continue;
          }

          // Images for this variant
          if (v.images && v.images.length > 0) {
            const variantImages = v.images.map(img => ({
              variant_id: newVariant.id,
              url: img.url,
              alt: img.alt,
              is_main: img.isMain
            }));
            await supabase.from("product_images").insert(variantImages);
          }

          // Sizes for this variant
          if (v.sizes && v.sizes.length > 0) {
            const variantSizes = v.sizes.map(s => ({
              variant_id: newVariant.id,
              size: s.size,
              stock: s.stock,
              sku: s.sku
            }));
            await supabase.from("product_sizes").insert(variantSizes);
          }
        }
      }

      // General images (if no variants or general ones exist)
      if (p.images && p.images.length > 0) {
        const generalImages = p.images.map(img => ({
          product_id: newProduct.id,
          url: img.url,
          alt: img.alt,
          is_main: img.isMain
        }));
        await supabase.from("product_images").insert(generalImages);
      }
    }

    console.log("✅ Migration finished successfully!");
    process.exit(0);
  } catch (error) {
    console.error("💥 Fatal Migration Error:", error);
    process.exit(1);
  }
}

migrate();
