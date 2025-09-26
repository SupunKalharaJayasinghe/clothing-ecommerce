import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../lib/axios'

// --- thunks ---
export const registerUser = createAsyncThunk('auth/registerUser', async (payload, thunkAPI) => {
  try {
    const clean = {
      firstName: payload.firstName?.trim(),
      lastName: payload.lastName?.trim(),
      username: payload.username?.trim().toLowerCase(),
      email: payload.email?.trim().toLowerCase(),
      password: payload.password,
      confirmPassword: payload.confirmPassword
    }
    const { data } = await api.post('/auth/register', clean)
    if (data.verificationRequired) return { verificationRequired: true, tmpToken: data.tmpToken }
    return { user: data.user }
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message)
  }
})

export const loginUser = createAsyncThunk('auth/loginUser', async (payload, thunkAPI) => {
  try {
    const clean = { identifier: payload.identifier?.trim().toLowerCase(), password: payload.password }
    const { data } = await api.post('/auth/login', clean)
    if (data.chooseMethodRequired) return { chooseMethodRequired: true, tmpToken: data.tmpToken, methods: data.methods }
    if (data.emailLoginRequired) return { emailLoginRequired: true, tmpToken: data.tmpToken }
    if (data.twoFARequired) return { twoFARequired: true, tmpToken: data.tmpToken }
    return { user: data.user }
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message)
  }
})

export const verifyTwoFA = createAsyncThunk('auth/verifyTwoFA', async (payload, thunkAPI) => {
  try {
    const { tmpToken, code, remember } = payload
    const { data } = await api.post('/auth/2fa/verify', { tmpToken, code, remember })
    return data.user
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message)
  }
})

// Verify email code after login challenge
export const verifyEmailLogin = createAsyncThunk('auth/verifyEmailLogin', async (payload, thunkAPI) => {
  try {
    const { tmpToken, code, remember } = payload
    const { data } = await api.post('/auth/login/verify', { tmpToken, code, remember })
    if (data.twoFARequired) return { twoFARequired: true, tmpToken: data.tmpToken }
    return { user: data.user }
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message)
  }
})

export const chooseLoginMethod = createAsyncThunk('auth/chooseLoginMethod', async (payload, thunkAPI) => {
  try {
    const { tmpToken, method } = payload
    const { data } = await api.post('/auth/login/method', { tmpToken, method })
    if (data.emailLoginRequired) return { emailLoginRequired: true, tmpToken: data.tmpToken }
    if (data.twoFARequired) return { twoFARequired: true, tmpToken: data.tmpToken }
    return thunkAPI.rejectWithValue('Unexpected response')
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message)
  }
})

// Verify email code after registration
export const verifyEmailRegister = createAsyncThunk('auth/verifyEmailRegister', async (payload, thunkAPI) => {
  try {
    const { tmpToken, code } = payload
    const { data } = await api.post('/auth/email/verify', { tmpToken, code })
    return { user: data.user }
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message)
  }
})

export const resendLoginEmailCode = createAsyncThunk('auth/resendLoginEmailCode', async (payload, thunkAPI) => {
  try {
    const { tmpToken } = payload
    const { data } = await api.post('/auth/login/resend', { tmpToken })
    return data
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message)
  }
})

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async (payload, thunkAPI) => {
  try {
    const { identifier } = payload
    const { data } = await api.post('/auth/forgot-password', { identifier })
    return data
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message)
  }
})

export const resetPassword = createAsyncThunk('auth/resetPassword', async (payload, thunkAPI) => {
  try {
    const { token, newPassword, confirmPassword } = payload
    const { data } = await api.post('/auth/reset-password', { token, newPassword, confirmPassword })
    return data
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message)
  }
})

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, thunkAPI) => {
  try {
    const { data } = await api.get('/auth/me')
    return data.user
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message)
  }
})

export const logoutUser = createAsyncThunk('auth/logoutUser', async (_, thunkAPI) => {
  try {
    await api.post('/auth/logout')
    return true
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message)
  }
})

// Persist minimal user snapshot to reduce UI flicker on reload
const LS_AUTH_USER = 'auth_user_v1'
function loadUserFromStorage() {
  try {
    const raw = localStorage.getItem(LS_AUTH_USER)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function saveUserToStorage(user) {
  try {
    if (user) localStorage.setItem(LS_AUTH_USER, JSON.stringify(user))
    else localStorage.removeItem(LS_AUTH_USER)
  } catch {}
}

const initialState = {
  user: loadUserFromStorage(),
  status: 'idle',
  error: null,
  hydrated: false, // set true after first fetchMe completes (success or fail)
  methodChoice: { required: false, tmpToken: null, methods: [] },
  twoFA: { required: false, tmpToken: null },
  email: { required: false, tmpToken: null, mode: null, cooldownUntil: 0 },
  forgot: { status: 'idle', message: null, devToken: null },
  reset: { status: 'idle', message: null },
  resend: { status: 'idle', message: null }
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) { state.error = null }
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (s) => { s.status = 'loading'; s.error = null; s.email = { required: false, tmpToken: null, mode: null } })
      .addCase(registerUser.fulfilled, (s, a) => {
        s.status = 'succeeded'; s.error = null
        if (a.payload?.verificationRequired) {
          s.email = { required: true, tmpToken: a.payload.tmpToken, mode: 'register' }
        } else if (a.payload?.user) {
          s.user = a.payload.user
          saveUserToStorage(s.user)
        }
      })
      .addCase(registerUser.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload })

.addCase(loginUser.pending, (s) => { s.status = 'loading'; s.error = null; s.methodChoice = { required: false, tmpToken: null, methods: [] }; s.twoFA = { required: false, tmpToken: null }; s.email = { required: false, tmpToken: null, mode: null } })
      .addCase(loginUser.fulfilled, (s, a) => {
        s.status = 'succeeded'; s.error = null
        // if email verification required, do not set user yet
if (a.payload?.chooseMethodRequired) {
          s.methodChoice = { required: true, tmpToken: a.payload.tmpToken, methods: a.payload.methods || ['email','totp'] }
        } else if (a.payload?.emailLoginRequired) {
          s.email = { required: true, tmpToken: a.payload.tmpToken, mode: 'login', cooldownUntil: Date.now() + 30_000 }
        } else if (a.payload?.twoFARequired) {
          s.twoFA = { required: true, tmpToken: a.payload.tmpToken }
        } else {
          s.user = a.payload.user
          saveUserToStorage(s.user)
        }
      })
      .addCase(loginUser.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload })

      .addCase(verifyTwoFA.pending, (s) => { s.status = 'loading'; s.error = null })
      .addCase(verifyTwoFA.fulfilled, (s, a) => { s.status = 'succeeded'; s.user = a.payload; s.twoFA = { required: false, tmpToken: null }; saveUserToStorage(s.user) })
      .addCase(verifyTwoFA.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload })

      .addCase(verifyEmailLogin.pending, (s) => { s.status = 'loading'; s.error = null })
.addCase(verifyEmailLogin.fulfilled, (s, a) => {
        s.status = 'succeeded'; s.error = null
        s.email = { required: false, tmpToken: null, mode: null, cooldownUntil: 0 }
        if (a.payload?.twoFARequired) {
          s.twoFA = { required: true, tmpToken: a.payload.tmpToken }
        } else if (a.payload?.user) {
          s.user = a.payload.user
          saveUserToStorage(s.user)
        }
      })
      .addCase(chooseLoginMethod.pending, (s) => { s.status = 'loading'; s.error = null })
      .addCase(chooseLoginMethod.fulfilled, (s, a) => {
        s.status = 'succeeded'; s.error = null
        s.methodChoice = { required: false, tmpToken: null, methods: [] }
        if (a.payload?.emailLoginRequired) {
          s.email = { required: true, tmpToken: a.payload.tmpToken, mode: 'login', cooldownUntil: Date.now() + 30_000 }
        } else if (a.payload?.twoFARequired) {
          s.twoFA = { required: true, tmpToken: a.payload.tmpToken }
        }
      })
      .addCase(chooseLoginMethod.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload })
      .addCase(verifyEmailLogin.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload })

      .addCase(verifyEmailRegister.pending, (s) => { s.status = 'loading'; s.error = null })
      .addCase(verifyEmailRegister.fulfilled, (s, a) => {
        s.status = 'succeeded'; s.error = null
        s.email = { required: false, tmpToken: null, mode: null }
        s.user = a.payload.user
        saveUserToStorage(s.user)
      })
      .addCase(verifyEmailRegister.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload })

      // resend login email code
      .addCase(resendLoginEmailCode.pending, (s) => { s.resend.status = 'loading'; s.resend.message = null; s.error = null })
      .addCase(resendLoginEmailCode.fulfilled, (s, a) => {
        s.resend.status = 'succeeded';
        s.resend.message = a.payload?.message || 'Code resent'
        if (a.payload?.tmpToken) {
          s.email = { ...s.email, tmpToken: a.payload.tmpToken, required: true, mode: 'login', cooldownUntil: Date.now() + 30_000 }
        }
      })
      .addCase(resendLoginEmailCode.rejected, (s, a) => { s.resend.status = 'failed'; s.error = a.payload })

      .addCase(forgotPassword.pending, (s) => { s.forgot.status = 'loading'; s.forgot.message = null; s.forgot.devToken = null; s.error = null })
      .addCase(forgotPassword.fulfilled, (s, a) => { s.forgot.status = 'succeeded'; s.forgot.message = a.payload.message; s.forgot.devToken = a.payload.devToken || null })
      .addCase(forgotPassword.rejected, (s, a) => { s.forgot.status = 'failed'; s.error = a.payload })

      .addCase(resetPassword.pending, (s) => { s.reset.status = 'loading'; s.reset.message = null; s.error = null })
      .addCase(resetPassword.fulfilled, (s, a) => { s.reset.status = 'succeeded'; s.reset.message = a.payload.message })
      .addCase(resetPassword.rejected, (s, a) => { s.reset.status = 'failed'; s.error = a.payload })

      .addCase(fetchMe.pending, (s) => { s.status = 'loading'; s.hydrated = false })
      .addCase(fetchMe.fulfilled, (s, a) => { s.status = 'succeeded'; s.user = a.payload; s.hydrated = true; saveUserToStorage(s.user) })
      .addCase(fetchMe.rejected, (s) => { s.status = 'idle'; s.hydrated = true; s.user = null; saveUserToStorage(null) })

      .addCase(logoutUser.fulfilled, (s) => { s.user = null; s.status = 'idle'; s.hydrated = true; s.twoFA = { required: false, tmpToken: null }; saveUserToStorage(null) })
  }
})

export const { clearAuthError } = authSlice.actions
export default authSlice.reducer
