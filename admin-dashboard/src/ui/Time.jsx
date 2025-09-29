import React, { useEffect, useMemo, useState } from 'react'

function toDate(d) {
  if (d instanceof Date) return d
  const t = typeof d === 'number' ? d : Date.parse(d)
  return new Date(t)
}

function formatAbsolute(date) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(date)
  } catch {
    return date.toLocaleString()
  }
}

function formatRelative(from, to = new Date()) {
  const diff = Math.round((from.getTime() - to.getTime()) / 1000) // seconds
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const abs = Math.abs(diff)
  if (abs < 60) return rtf.format(Math.trunc(diff), 'second')
  if (abs < 3600) return rtf.format(Math.trunc(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.trunc(diff / 3600), 'hour')
  if (abs < 2592000) return rtf.format(Math.trunc(diff / 86400), 'day')
  if (abs < 31536000) return rtf.format(Math.trunc(diff / 2592000), 'month')
  return rtf.format(Math.trunc(diff / 31536000), 'year')
}

export default function Time({ value, className = '', mode = 'auto' }) {
  // mode: 'relative' | 'absolute' | 'auto' (relative + tooltip)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    // Update once per minute to keep relative label fresh
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  const date = useMemo(() => toDate(value), [value])
  const title = formatAbsolute(date)

  let label
  if (mode === 'absolute') label = title
  else if (mode === 'relative') label = formatRelative(date, new Date(now))
  else label = formatRelative(date, new Date(now))

  return (
    <time dateTime={date.toISOString()} title={title} className={className}>
      {label}
    </time>
  )
}
