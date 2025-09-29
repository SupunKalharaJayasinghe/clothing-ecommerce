import mongoose from 'mongoose'
import Product from './Product.js'

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating:  { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, minlength: 3, maxlength: 2000 }
  },
  { timestamps: true }
)

// ⚠️ Multi-review per user per product (up to 5) → NO unique index on {product,user}.
// Keep indexes for performance only.
reviewSchema.index({ product: 1, user: 1 })

// static helper to recompute product rating & count
reviewSchema.statics.recalcProductRating = async function (productId) {
  const Review = this
  const agg = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ])

  const stats = agg[0] || { avg: 0, count: 0 }
  await Product.findByIdAndUpdate(productId, {
    rating: Math.round((stats.avg || 0) * 10) / 10,
    reviewsCount: stats.count || 0
  })
}

const Review = mongoose.model('Review', reviewSchema)
export default Review
