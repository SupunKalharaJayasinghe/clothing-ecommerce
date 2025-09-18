import Product from '../models/Product.js'
import catchAsync from '../../utils/catchAsync.js'

export const listProducts = catchAsync(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '12', 10)))
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    Product.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
    Product.countDocuments()
  ])
  res.json({ ok: true, page, limit, total, items })
})
