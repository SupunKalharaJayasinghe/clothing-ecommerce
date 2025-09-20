import React from 'react'
import { Heart as LucideHeart, Trash2 as LucideTrash2, Search as LucideSearch, ArrowRight as LucideArrowRight, ShoppingCart as LucideShoppingCart, Pencil as LucidePencil, Menu as LucideMenu, Minus as LucideMinus, Plus as LucidePlus } from 'lucide-react'

export function Heart({ size = 18, className = '' }) {
  return <LucideHeart size={size} className={className} aria-hidden="true" />
}

export function Trash2({ size = 18, className = '' }) {
  return <LucideTrash2 size={size} className={className} aria-hidden="true" />
}

export function Search({ size = 16, className = '' }) {
  return <LucideSearch size={size} className={className} aria-hidden="true" />
}

export function ArrowRight({ size = 14, className = '' }) {
  return <LucideArrowRight size={size} className={className} aria-hidden="true" />
}

export function ShoppingCart({ size = 16, className = '' }) {
  return <LucideShoppingCart size={size} className={className} aria-hidden="true" />
}

export function Pencil({ size = 14, className = '' }) {
  return <LucidePencil size={size} className={className} aria-hidden="true" />
}

export function Menu({ size = 18, className = '' }) {
  return <LucideMenu size={size} className={className} aria-hidden="true" />
}

export function Minus({ size = 14, className = '' }) {
  return <LucideMinus size={size} className={className} aria-hidden="true" />
}

export function Plus({ size = 14, className = '' }) {
  return <LucidePlus size={size} className={className} aria-hidden="true" />
}
