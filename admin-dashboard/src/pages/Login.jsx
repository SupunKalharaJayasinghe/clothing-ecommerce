import React, { useState } from 'react'
import { useAuth } from '../state/auth'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, Shield, ArrowRight, Eye, EyeOff, RefreshCw } from 'lucide-react'

export default function LoginPage() {
  const { login, verifyEmailLogin, emailStep } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await login(identifier, password)
      if (!res?.emailLoginRequired) {
        navigate('/')
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const onVerify = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')
    try {
      await verifyEmailLogin(code.trim())
      navigate('/')
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const onResendCode = async () => {
    setResendLoading(true)
    setError('')
    try {
      // Trigger login again to resend the code
      await login(identifier, password)
      setError('') // Clear any previous errors on successful resend
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to resend code')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[var(--page-bg)] to-[var(--surface)]">
      <div className="w-full max-w-lg">
        {!emailStep.required ? (
          <div className="login-container">
            {/* Header Section */}
            <div className="login-header">
              <div className="login-icon">
                <Shield size={32} />
              </div>
              <h1 className="login-title">Admin Dashboard</h1>
              <p className="login-subtitle">Sign in to access your admin panel</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message">
                <div className="error-content">
                  {error}
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={onSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label">
                  <Mail size={16} />
                  Email or Username
                </label>
                <input 
                  className="form-input" 
                  value={identifier} 
                  onChange={e=>setIdentifier(e.target.value)} 
                  placeholder="Enter your email or username"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Lock size={16} />
                  Password
                </label>
                <div className="password-input-container">
                  <input 
                    type={showPassword ? "text" : "password"}
                    className="form-input password-input" 
                    value={password} 
                    onChange={e=>setPassword(e.target.value)} 
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button className="login-button" disabled={loading}>
                {loading ? (
                  <div className="loading-content">
                    <div className="loading-spinner"></div>
                    Signing in...
                  </div>
                ) : (
                  <div className="button-content">
                    Sign In
                    <ArrowRight size={16} />
                  </div>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="login-container">
            {/* Verification Header */}
            <div className="login-header">
              <div className="login-icon verification">
                <Mail size={32} />
              </div>
              <h1 className="login-title">Verify Your Email</h1>
              <p className="login-subtitle">We've sent a 6-digit code to your email. Enter it below to continue.</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message">
                <div className="error-content">
                  {error}
                </div>
              </div>
            )}

            {/* Verification Form */}
            <form onSubmit={onVerify} className="login-form">
              <div className="form-group">
                <label className="form-label">
                  <Shield size={16} />
                  Verification Code
                </label>
                <input 
                  className="form-input verification-input" 
                  value={code} 
                  onChange={e=>setCode(e.target.value)} 
                  placeholder="123456" 
                  maxLength="6"
                  required
                />
              </div>

              <div className="button-group">
                <button className="login-button" disabled={loading || resendLoading}>
                  {loading ? (
                    <div className="loading-content">
                      <div className="loading-spinner"></div>
                      Verifying...
                    </div>
                  ) : (
                    <div className="button-content">
                      Verify
                      <ArrowRight size={16} />
                    </div>
                  )}
                </button>
                
                <div className="resend-section">
                  <p className="resend-text">Didn't receive the code?</p>
                  <button 
                    type="button" 
                    className="resend-button" 
                    onClick={onResendCode}
                    disabled={loading || resendLoading}
                  >
                    {resendLoading ? (
                      <div className="loading-content">
                        <div className="loading-spinner-small"></div>
                        Resending...
                      </div>
                    ) : (
                      <div className="button-content">
                        <RefreshCw size={14} />
                        Resend Code
                      </div>
                    )}
                  </button>
                </div>

                <button type="button" className="cancel-button" onClick={() => window.location.reload()}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
