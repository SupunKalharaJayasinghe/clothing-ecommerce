// Centralized color mapping for consistent color dot rendering across the app
export function getColorValue(colorName) {
  if (!colorName) return '#6b7280' // gray-500 default
  const color = String(colorName).toLowerCase().trim()
  const colorMap = {
    red: '#ef4444',
    blue: '#3b82f6',
    'mid blue': '#3b82f6',
    navy: '#1e40af',
    green: '#22c55e',
    yellow: '#eab308',
    orange: '#f97316',
    purple: '#a855f7',
    pink: '#ec4899',
    black: '#1f2937',
    white: '#f9fafb',
    gray: '#6b7280',
    grey: '#6b7280',
    brown: '#92400e',
    beige: '#d6d3d1',
    cream: '#fef7cd',
  }
  return colorMap[color] || color || '#6b7280'
}
