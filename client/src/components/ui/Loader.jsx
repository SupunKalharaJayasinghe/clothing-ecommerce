export default function Loader({ className = '' }) {
  return (
    <div className={`w-full flex items-center justify-center py-10 ${className}`}>
      <div className="inline-flex items-center gap-2 text-sm text-[--color-muted]">
        <span className="w-2.5 h-2.5 rounded-full bg-[--color-brand-600] animate-bounce" />
        <span className="w-2.5 h-2.5 rounded-full bg-[--color-brand-600] animate-bounce [animation-delay:120ms]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[--color-brand-600] animate-bounce [animation-delay:240ms]" />
        <span className="ml-2">Loading…</span>
      </div>
    </div>
  )
}
