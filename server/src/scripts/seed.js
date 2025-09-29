import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../../src/config/db.js'
import Product, { toSlug } from '../../src/api/models/Product.js'
import Category from '../../src/api/models/Category.js'

async function run() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI not set. Please provide a MongoDB connection string in .env')
    process.exit(1)
  }
  await connectDB(uri)

  const now = Date.now()

  // Ensure default categories exist
  function toSlugLocal(str) { return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') }
  const defaults = [
    { name: 'Men', slug: 'men', sortOrder: 1 },
    { name: 'Women', slug: 'women', sortOrder: 2 },
    { name: 'Kids', slug: 'kids', sortOrder: 3 }
  ]
  const existing = await Category.find({ slug: { $in: defaults.map(d => d.slug) } }).lean()
  const have = new Map(existing.map(c => [c.slug, c]))
  const cats = {}
  for (const d of defaults) {
    if (!have.has(d.slug)) {
      const c = await Category.create({ name: d.name, slug: d.slug, sortOrder: d.sortOrder, active: true })
      cats[d.slug] = c
    } else {
      cats[d.slug] = have.get(d.slug)
    }
  }

  const samples = [
    {
      name: 'Men\'s Classic Tee – Black',
      images: ['https://picsum.photos/seed/men-tee-black/800/800'],
      color: 'black',
      description: 'Premium cotton crew-neck tee. Soft, breathable, and perfect for everyday wear.',
      price: 2999,
      discountPercent: 10,
      rating: 4.5,
      reviewsCount: 120,
      stock: 50,
      lowStockThreshold: 5,
      tags: ['bestseller', 'cotton', 'men'],
      mainTags: ['bestseller', 'discount'],
      category: 'men',
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3)
    },
    {
      name: 'Women\'s Linen Shirt – White',
      images: ['https://picsum.photos/seed/women-linen-white/800/800'],
      color: 'white',
      description: 'Lightweight linen button-up shirt with relaxed fit for a timeless look.',
      price: 5499,
      discountPercent: 0,
      rating: 4.7,
      reviewsCount: 85,
      stock: 30,
      lowStockThreshold: 5,
      tags: ['linen', 'women', 'featured'],
      mainTags: ['featured', 'new'],
      category: 'women',
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2)
    },
    {
      name: 'Kids\' Hoodie – Navy',
      images: ['https://picsum.photos/seed/kids-hoodie-navy/800/800'],
      color: 'navy',
      description: 'Cozy fleece-lined hoodie designed for comfort and play.',
      price: 3999,
      discountPercent: 15,
      rating: 4.2,
      reviewsCount: 40,
      stock: 15,
      lowStockThreshold: 5,
      tags: ['kids', 'hoodie', 'limited'],
      mainTags: ['limited', 'discount'],
      category: 'kids',
      createdAt: new Date(now - 1000 * 60 * 60 * 24)
    }
  ]

  // Ensure unique slugs
  for (const p of samples) {
    p.slug = toSlug(p.name)
  }

  console.log('Seeding products...')
  await Product.deleteMany({})
  // Assign categoryRef based on top-level category
  const withCat = samples.map(p => ({
    ...p,
    categoryRef: (p.category && cats[toSlugLocal(p.category)]) ? cats[toSlugLocal(p.category)]._id : undefined
  }))
  await Product.insertMany(withCat)
  console.log('Seed complete! Inserted:', samples.length)

  await mongoose.connection.close()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
