import React, { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../utils/http'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // attempt to load session
    api.get('/admin/auth/me')
      .then(res => setUser(res.data.admin))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (identifier, password) => {
    const res = await api.post('/admin/auth/login', { identifier, password })
    setUser(res.data.admin)
  }

  const logout = async () => {
    try { await api.post('/admin/auth/logout') } catch {}
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthCtx.Provider value={{ user, setUser, login, logout, loading }}>
      {!loading && children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  return useContext(AuthCtx)
}
