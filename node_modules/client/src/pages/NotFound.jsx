import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container-app section text-center">
      <h1 className="text-5xl font-black">404</h1>
      <p className="mt-2 text-[--color-muted]">The page you’re looking for doesn’t exist.</p>
      <div className="mt-6">
        <Link to="/" className="btn btn-primary">Go Home</Link>
      </div>
    </div>
  )
}
