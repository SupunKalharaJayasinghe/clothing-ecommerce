import React, { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../utils/http'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emailStep, setEmailStep] = useState({ required: false, tmpToken: null })

  useEffect(() => {
    // attempt to load session
    api.get('/admin/auth/me')
      .then(res => setUser(res.data.admin))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (identifier, password) => {
    const res = await api.post('/admin/auth/login', { identifier, password })
    if (res.data?.emailLoginRequired) {
      setEmailStep({ required: true, tmpToken: res.data.tmpToken })
      return { emailLoginRequired: true }
    }
    setUser(res.data.admin)
    return { ok: true }
  }

  const verifyEmailLogin = async (code) => {
    if (!emailStep.tmpToken) throw new Error('Missing verification token')
    const res = await api.post('/admin/auth/login/verify', { tmpToken: emailStep.tmpToken, code })
    setUser(res.data.admin)
    setEmailStep({ required: false, tmpToken: null })
    return { ok: true }
  }

  const logout = async () => {
    try { await api.post('/admin/auth/logout') } catch {}
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthCtx.Provider value={{ user, setUser, login, verifyEmailLogin, emailStep, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  return useContext(AuthCtx)
}
