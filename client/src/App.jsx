import { useEffect } from 'react'
import AppRoutes from './routes'
import { useAppDispatch } from './app/hooks'
import { fetchMe } from './features/auth/authSlice'

export default function App() {
  const dispatch = useAppDispatch()
  useEffect(() => { dispatch(fetchMe()) }, [dispatch])
  return <AppRoutes />
}
