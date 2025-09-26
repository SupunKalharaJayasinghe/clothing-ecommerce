import mongoose from 'mongoose'

// simple slugify (no external dep)
function toSlug(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },

    // keep unique index; seeding ensures slug is set
    slug: { type: String, unique: true, index: true },

    // at least 1, max 10
    images: {
      type: [String],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 1 && arr.length <= 10,
        message: 'Images array must have between 1 and 10 items'
      },
      required: true
    },

    color: { type: String, required: true, trim: true },
    // normalized lower-case color for fast filtering
    colorLower: { type: String },
    description: { type: String, required: true, trim: true },

    price: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },

    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewsCount: { type: Number, min: 0, default: 0 },

    stock: { type: Number, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 5 },

    tags: { type: [String], default: [] },
    mainTags: {
      type: [String],
      enum: ['discount', 'new', 'limited', 'bestseller', 'featured'],
      default: []
    },

    // NEW: normalized top-level category for tabs/filters
    category: { type: String, enum: ['men', 'women', 'kids'], index: true },
    // Normalized reference to category collection (backward compatible with string category)
    categoryRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true },

    metaTitle: { type: String },
    metaDescription: { type: String }
  },
  { timestamps: true }
)

// ensure slug on save (single-document ops)
productSchema.pre('save', function (next) {
  if (!this.slug || this.isModified('name')) {
    this.slug = toSlug(this.name)
  }
  if (this.isModified('color') || !this.colorLower) {
    this.colorLower = String(this.color || '').toLowerCase().trim()
  }
  next()
})

// ensure slug on bulk insertMany
productSchema.pre('insertMany', function (next, docs) {
  if (Array.isArray(docs)) {
    for (const d of docs) {
      if (!d.slug && d.name) d.slug = toSlug(d.name)
      if (d && d.color && !d.colorLower) d.colorLower = String(d.color).toLowerCase().trim()
    }
  }
  next()
})

// computed values exposed to client
productSchema.virtual('finalPrice').get(function () {
  const pct = this.discountPercent || 0
  return Math.round((this.price * (1 - pct / 100)) * 100) / 100
})
productSchema.virtual('lowStock').get(function () {
  return typeof this.stock === 'number' && typeof this.lowStockThreshold === 'number'
    ? this.stock <= this.lowStockThreshold
    : false
})

// make virtuals appear in JSON
productSchema.set('toJSON', { virtuals: true })
productSchema.set('toObject', { virtuals: true })

// ---------- INDEXES ----------
// Text index ONLY on string fields (no arrays in a compound text index)
productSchema.index({ name: 'text', description: 'text' })

// Separate normal indexes for array fields
productSchema.index({ tags: 1 })
productSchema.index({ mainTags: 1 })

// Useful sorting/filtering
productSchema.index({ createdAt: -1 })
productSchema.index({ price: 1 })
productSchema.index({ rating: -1 })
productSchema.index({ colorLower: 1 })
// category has its own index via the field definition above
// categoryRef has its own index via the field definition above

export default mongoose.model('Product', productSchema)
export { toSlug }
