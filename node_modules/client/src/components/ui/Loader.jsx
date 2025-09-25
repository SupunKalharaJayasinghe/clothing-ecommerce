export default function Loader({ className = '' }) {
  return (
    <div className={`w-full flex items-center justify-center py-10 ${className}`}>
      <div className="inline-flex items-center gap-2 text-sm text-[--color-muted]">
        <span className="h-5 w-5 rounded-full border-2 border-[--color-border] border-t-[--color-brand-600] animate-spin" />
        <span>Loading…</span>
      </div>
    </div>
  )
}
