import mongoose from 'mongoose'
const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  images: [String],
  categories: [String]
}, { timestamps: true })
export default mongoose.model('Product', productSchema)
