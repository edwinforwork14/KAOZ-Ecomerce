require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/database");
const User = require("../src/models/User");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");

const categories = [
  {
    name: "Hombres",
    slug: "men",
    description: "Ropa deportiva para hombres",
  },
  {
    name: "Mujeres",
    slug: "women",
    description: "Ropa deportiva para mujeres",
  },
  {
    name: "Niños",
    slug: "kids",
    description: "Ropa deportiva para niños",
  },
  {
    name: "Accesorios",
    slug: "accessories",
    description: "Accesorios deportivos",
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    // Limpiar base de datos
    console.log("🗑️  Limpiando base de datos...");
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});

    // Crear admin
    console.log("👤 Creando usuario administrador...");
    const admin = await User.create({
      firstName: "Admin",
      lastName: "YF",
      email: "admin@YF.com",
      password: "admin123456",
      role: "admin",
      phone: "+58 412 466 9471",
    });
    console.log("✅ Admin creado:", admin.email);

    // Crear usuario de prueba
    console.log("👤 Creando usuario de prueba...");
    const user = await User.create({
      firstName: "Juan",
      lastName: "Pérez",
      email: "usuario@YF.com",
      password: "usuario123",
      role: "user",
      phone: "+58 412 123 4567",
      address: {
        street: "Calle Principal #123",
        city: "Valencia",
        state: "Carabobo",
        zipCode: "2001",
      },
    });
    console.log("✅ Usuario creado:", user.email);

    // Crear categorías
    console.log("📁 Creando categorías...");
    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ ${createdCategories.length} categorías creadas`);

    // Crear productos
    console.log("📦 Creando productos...");
    const menCategory = createdCategories.find((c) => c.slug === "men");
    const womenCategory = createdCategories.find((c) => c.slug === "women");
    const kidsCategory = createdCategories.find((c) => c.slug === "kids");
    const accessoriesCategory = createdCategories.find(
      (c) => c.slug === "accessories"
    );

    const products = [
      {
        name: "YF Performance Tee",
        description:
          "Camiseta de rendimiento premium con tecnología de absorción de humedad. Perfecta para entrenamientos intensos y uso diario. Fabricada con materiales de alta calidad que garantizan comodidad y durabilidad.",
        price: 45.99,
        category: menCategory._id,
        brand: "YF",
        images: [
          {
            url: "/placeholder.svg?height=400&width=300",
            alt: "YF Performance Tee",
            isMain: true,
          },
        ],
        variants: [
          {
            color: "Black",
            colorHex: "#000000",
            sizes: [
              { size: "S", stock: 15 },
              { size: "M", stock: 20 },
              { size: "L", stock: 18 },
              { size: "XL", stock: 12 },
            ],
          },
          {
            color: "White",
            colorHex: "#FFFFFF",
            sizes: [
              { size: "S", stock: 10 },
              { size: "M", stock: 15 },
              { size: "L", stock: 12 },
              { size: "XL", stock: 8 },
            ],
          },
          {
            color: "Orange",
            colorHex: "#FF6B35",
            sizes: [
              { size: "S", stock: 8 },
              { size: "M", stock: 10 },
              { size: "L", stock: 10 },
              { size: "XL", stock: 5 },
            ],
          },
        ],
        isNew: true,
        isFeatured: true,
        rating: 4.8,
        reviewCount: 156,
        features: [
          "Material transpirable de alta calidad",
          "Tecnología de absorción de humedad",
          "Diseño ergonómico para máximo confort",
          "Resistente al lavado y decoloración",
        ],
      },
      {
        name: "Athletic Shorts Pro",
        description:
          "Shorts deportivos con tecnología de secado rápido y máxima comodidad. Diseñados para atletas que buscan rendimiento y estilo.",
        price: 39.99,
        category: menCategory._id,
        brand: "Nike",
        images: [
          {
            url: "/placeholder.svg?height=400&width=300",
            alt: "Athletic Shorts Pro",
            isMain: true,
          },
        ],
        variants: [
          {
            color: "Black",
            colorHex: "#000000",
            sizes: [
              { size: "S", stock: 12 },
              { size: "M", stock: 18 },
              { size: "L", stock: 15 },
              { size: "XL", stock: 10 },
            ],
          },
          {
            color: "Navy",
            colorHex: "#001F3F",
            sizes: [
              { size: "S", stock: 8 },
              { size: "M", stock: 12 },
              { size: "L", stock: 10 },
              { size: "XL", stock: 6 },
            ],
          },
          {
            color: "Gray",
            colorHex: "#808080",
            sizes: [
              { size: "S", stock: 10 },
              { size: "M", stock: 14 },
              { size: "L", stock: 12 },
              { size: "XL", stock: 8 },
            ],
          },
        ],
        isNew: false,
        isFeatured: true,
        rating: 4.6,
        reviewCount: 89,
        features: [
          "Tecnología de secado rápido",
          "Bolsillos laterales profundos",
          "Cintura elástica ajustable",
          "Tela ligera y duradera",
        ],
      },
      {
        name: "YF Sports Bra",
        description:
          "Sujetador deportivo de alto soporte para entrenamientos intensos. Diseño innovador que combina comodidad y funcionalidad.",
        price: 34.99,
        category: womenCategory._id,
        brand: "YF",
        images: [
          {
            url: "/placeholder.svg?height=400&width=300",
            alt: "YF Sports Bra",
            isMain: true,
          },
        ],
        variants: [
          {
            color: "Black",
            colorHex: "#000000",
            sizes: [
              { size: "XS", stock: 10 },
              { size: "S", stock: 15 },
              { size: "M", stock: 18 },
              { size: "L", stock: 12 },
            ],
          },
          {
            color: "White",
            colorHex: "#FFFFFF",
            sizes: [
              { size: "XS", stock: 8 },
              { size: "S", stock: 12 },
              { size: "M", stock: 15 },
              { size: "L", stock: 10 },
            ],
          },
          {
            color: "Pink",
            colorHex: "#FF69B4",
            sizes: [
              { size: "XS", stock: 12 },
              { size: "S", stock: 16 },
              { size: "M", stock: 20 },
              { size: "L", stock: 14 },
            ],
          },
        ],
        isNew: true,
        isFeatured: true,
        rating: 4.9,
        reviewCount: 203,
        features: [
          "Alto soporte para actividades de alto impacto",
          "Material de compresión elástico",
          "Tirantes ajustables",
          "Diseño moderno y elegante",
        ],
      },
      {
        name: "Training Hoodie",
        description:
          "Sudadera de entrenamiento con capucha y bolsillo frontal. Perfecta para calentar antes del ejercicio o para uso casual.",
        price: 69.99,
        category: menCategory._id,
        brand: "Adidas",
        images: [
          {
            url: "/placeholder.svg?height=400&width=300",
            alt: "Training Hoodie",
            isMain: true,
          },
        ],
        variants: [
          {
            color: "Black",
            colorHex: "#000000",
            sizes: [
              { size: "S", stock: 8 },
              { size: "M", stock: 12 },
              { size: "L", stock: 15 },
              { size: "XL", stock: 10 },
              { size: "XXL", stock: 6 },
            ],
          },
          {
            color: "Gray",
            colorHex: "#808080",
            sizes: [
              { size: "S", stock: 10 },
              { size: "M", stock: 14 },
              { size: "L", stock: 12 },
              { size: "XL", stock: 8 },
              { size: "XXL", stock: 5 },
            ],
          },
          {
            color: "Orange",
            colorHex: "#FF6B35",
            sizes: [
              { size: "S", stock: 6 },
              { size: "M", stock: 10 },
              { size: "L", stock: 8 },
              { size: "XL", stock: 6 },
              { size: "XXL", stock: 4 },
            ],
          },
        ],
        isNew: false,
        isFeatured: false,
        rating: 4.7,
        reviewCount: 127,
        features: [
          "Felpa interior suave y cálida",
          "Capucha ajustable con cordón",
          "Bolsillo canguro espacioso",
          "Puños y dobladillo elásticos",
        ],
      },
      {
        name: "Yoga Leggings",
        description:
          "Leggings de yoga con cintura alta y tela elástica de cuatro direcciones. Comodidad sin límites para tus sesiones de yoga.",
        price: 52.99,
        category: womenCategory._id,
        brand: "Under Armour",
        images: [
          {
            url: "/placeholder.svg?height=400&width=300",
            alt: "Yoga Leggings",
            isMain: true,
          },
        ],
        variants: [
          {
            color: "Black",
            colorHex: "#000000",
            sizes: [
              { size: "XS", stock: 12 },
              { size: "S", stock: 18 },
              { size: "M", stock: 20 },
              { size: "L", stock: 15 },
              { size: "XL", stock: 10 },
            ],
          },
          {
            color: "Navy",
            colorHex: "#001F3F",
            sizes: [
              { size: "XS", stock: 8 },
              { size: "S", stock: 12 },
              { size: "M", stock: 15 },
              { size: "L", stock: 10 },
              { size: "XL", stock: 6 },
            ],
          },
          {
            color: "Purple",
            colorHex: "#800080",
            sizes: [
              { size: "XS", stock: 10 },
              { size: "S", stock: 14 },
              { size: "M", stock: 18 },
              { size: "L", stock: 12 },
              { size: "XL", stock: 8 },
            ],
          },
        ],
        isNew: true,
        isFeatured: true,
        rating: 4.8,
        reviewCount: 178,
        features: [
          "Cintura alta para mayor cobertura",
          "Tela elástica de cuatro direcciones",
          "Tecnología anti-transparencia",
          "Bolsillo lateral oculto",
        ],
      },
      {
        name: "Kids Active Set",
        description:
          "Conjunto deportivo para niños con camiseta y shorts a juego. Perfecto para jugar y hacer ejercicio.",
        price: 29.99,
        category: kidsCategory._id,
        brand: "Puma",
        images: [
          {
            url: "/placeholder.svg?height=400&width=300",
            alt: "Kids Active Set",
            isMain: true,
          },
        ],
        variants: [
          {
            color: "Blue",
            colorHex: "#0000FF",
            sizes: [
              { size: "4", stock: 10 },
              { size: "6", stock: 12 },
              { size: "8", stock: 15 },
              { size: "10", stock: 12 },
              { size: "12", stock: 8 },
            ],
          },
          {
            color: "Pink",
            colorHex: "#FF69B4",
            sizes: [
              { size: "4", stock: 12 },
              { size: "6", stock: 15 },
              { size: "8", stock: 18 },
              { size: "10", stock: 14 },
              { size: "12", stock: 10 },
            ],
          },
          {
            color: "Green",
            colorHex: "#008000",
            sizes: [
              { size: "4", stock: 8 },
              { size: "6", stock: 10 },
              { size: "8", stock: 12 },
              { size: "10", stock: 10 },
              { size: "12", stock: 6 },
            ],
          },
        ],
        isNew: false,
        isFeatured: false,
        rating: 4.5,
        reviewCount: 67,
        features: [
          "Tela suave y cómoda para niños",
          "Diseños coloridos y divertidos",
          "Fácil de lavar y mantener",
          "Perfecto para actividades diarias",
        ],
      },
      {
        name: "YF Cap",
        description:
          "Gorra deportiva con logo bordado y ajuste trasero. Protección solar y estilo en uno.",
        price: 24.99,
        category: accessoriesCategory._id,
        brand: "YF",
        images: [
          {
            url: "/placeholder.svg?height=400&width=300",
            alt: "YF Cap",
            isMain: true,
          },
        ],
        variants: [
          {
            color: "Black",
            colorHex: "#000000",
            sizes: [{ size: "One Size", stock: 50 }],
          },
          {
            color: "White",
            colorHex: "#FFFFFF",
            sizes: [{ size: "One Size", stock: 45 }],
          },
          {
            color: "Orange",
            colorHex: "#FF6B35",
            sizes: [{ size: "One Size", stock: 35 }],
          },
        ],
        isNew: false,
        isFeatured: false,
        rating: 4.4,
        reviewCount: 92,
        features: [
          "Logo YF bordado",
          "Visera curva",
          "Ajuste trasero con hebilla",
          "Material transpirable",
        ],
      },
      {
        name: "Performance Tank",
        description:
          "Camiseta sin mangas de alto rendimiento en oferta especial. Ideal para días calurosos.",
        price: 32.99,
        originalPrice: 45.99,
        category: menCategory._id,
        brand: "YF",
        images: [
          {
            url: "/placeholder.svg?height=400&width=300",
            alt: "Performance Tank",
            isMain: true,
          },
        ],
        variants: [
          {
            color: "Black",
            colorHex: "#000000",
            sizes: [
              { size: "S", stock: 20 },
              { size: "M", stock: 25 },
              { size: "L", stock: 22 },
              { size: "XL", stock: 18 },
            ],
          },
          {
            color: "White",
            colorHex: "#FFFFFF",
            sizes: [
              { size: "S", stock: 15 },
              { size: "M", stock: 20 },
              { size: "L", stock: 18 },
              { size: "XL", stock: 12 },
            ],
          },
          {
            color: "Red",
            colorHex: "#FF0000",
            sizes: [
              { size: "S", stock: 12 },
              { size: "M", stock: 16 },
              { size: "L", stock: 14 },
              { size: "XL", stock: 10 },
            ],
          },
        ],
        isNew: false,
        isFeatured: true,
        rating: 4.6,
        reviewCount: 134,
        features: [
          "Diseño sin mangas para mayor ventilación",
          "Corte moderno y favorecedor",
          "Material de secado rápido",
          "Precio especial de oferta",
        ],
      },
    ];

    const createdProducts = await Product.insertMany(products);
    console.log(`✅ ${createdProducts.length} productos creados`);

    console.log("\n🎉 Base de datos poblada exitosamente!");
    console.log("\n📋 Credenciales de acceso:");
    console.log("Admin: admin@YF.com / admin123456");
    console.log("Usuario: usuario@YF.com / usuario123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

seedDatabase();
