export default function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'badge badge-neutral',
    green: 'badge badge-success',
    red: 'badge badge-danger',
    blue: 'badge badge-info',
    amber: 'badge badge-warning',
    purple: 'badge badge-accent',
  }
  return <span className={tones[tone] || tones.neutral}>{children}</span>
}
