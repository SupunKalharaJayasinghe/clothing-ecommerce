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
    return data.user
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message)
  }
})

export const loginUser = createAsyncThunk('auth/loginUser', async (payload, thunkAPI) => {
  try {
    const clean = { identifier: payload.identifier?.trim().toLowerCase(), password: payload.password }
    const { data } = await api.post('/auth/login', clean)
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

const initialState = {
  user: null,
  status: 'idle',
  error: null,
  hydrated: false, // set true after first fetchMe completes (success or fail)
  twoFA: { required: false, tmpToken: null },
  forgot: { status: 'idle', message: null, devToken: null },
  reset: { status: 'idle', message: null }
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) { state.error = null }
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (s) => { s.status = 'loading'; s.error = null })
      .addCase(registerUser.fulfilled, (s, a) => { s.status = 'succeeded'; s.user = a.payload })
      .addCase(registerUser.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload })

      .addCase(loginUser.pending, (s) => { s.status = 'loading'; s.error = null; s.twoFA = { required: false, tmpToken: null } })
      .addCase(loginUser.fulfilled, (s, a) => {
        s.status = 'succeeded'
        if (a.payload?.twoFARequired) {
          s.twoFA = { required: true, tmpToken: a.payload.tmpToken }
        } else {
          s.user = a.payload.user
          s.twoFA = { required: false, tmpToken: null }
        }
      })
      .addCase(loginUser.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload })

      .addCase(verifyTwoFA.pending, (s) => { s.status = 'loading'; s.error = null })
      .addCase(verifyTwoFA.fulfilled, (s, a) => { s.status = 'succeeded'; s.user = a.payload; s.twoFA = { required: false, tmpToken: null } })
      .addCase(verifyTwoFA.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload })

      .addCase(forgotPassword.pending, (s) => { s.forgot.status = 'loading'; s.forgot.message = null; s.forgot.devToken = null; s.error = null })
      .addCase(forgotPassword.fulfilled, (s, a) => { s.forgot.status = 'succeeded'; s.forgot.message = a.payload.message; s.forgot.devToken = a.payload.devToken || null })
      .addCase(forgotPassword.rejected, (s, a) => { s.forgot.status = 'failed'; s.error = a.payload })

      .addCase(resetPassword.pending, (s) => { s.reset.status = 'loading'; s.reset.message = null; s.error = null })
      .addCase(resetPassword.fulfilled, (s, a) => { s.reset.status = 'succeeded'; s.reset.message = a.payload.message })
      .addCase(resetPassword.rejected, (s, a) => { s.reset.status = 'failed'; s.error = a.payload })

      .addCase(fetchMe.pending, (s) => { s.status = 'loading'; s.hydrated = false })
      .addCase(fetchMe.fulfilled, (s, a) => { s.status = 'succeeded'; s.user = a.payload; s.hydrated = true })
      .addCase(fetchMe.rejected, (s) => { s.status = 'idle'; s.hydrated = true })

      .addCase(logoutUser.fulfilled, (s) => { s.user = null; s.status = 'idle'; s.hydrated = true; s.twoFA = { required: false, tmpToken: null } })
  }
})

export const { clearAuthError } = authSlice.actions
export default authSlice.reducer
