import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../lib/axios'

// --- thunks ---
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (payload, thunkAPI) => {
    try {
      // payload: { firstName, lastName, username, email, password, confirmPassword }
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
  }
)

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (payload, thunkAPI) => {
    try {
      // payload: { identifier, password } (identifier = username OR email)
      const clean = {
        identifier: payload.identifier?.trim().toLowerCase(),
        password: payload.password
      }
      const { data } = await api.post('/auth/login', clean)
      return data.user
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message)
    }
  }
)

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

// --- slice ---
const initialState = { user: null, status: 'idle', error: null }

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) { state.error = null }
  },
  extraReducers: (builder) => {
    builder
      // register
      .addCase(registerUser.pending, (s) => { s.status = 'loading'; s.error = null })
      .addCase(registerUser.fulfilled, (s, a) => { s.status = 'succeeded'; s.user = a.payload })
      .addCase(registerUser.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload })
      // login
      .addCase(loginUser.pending, (s) => { s.status = 'loading'; s.error = null })
      .addCase(loginUser.fulfilled, (s, a) => { s.status = 'succeeded'; s.user = a.payload })
      .addCase(loginUser.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload })
      // me
      .addCase(fetchMe.pending, (s) => { s.status = 'loading' })
      .addCase(fetchMe.fulfilled, (s, a) => { s.status = 'succeeded'; s.user = a.payload })
      .addCase(fetchMe.rejected, (s) => { s.status = 'idle' })
      // logout
      .addCase(logoutUser.fulfilled, (s) => { s.user = null; s.status = 'idle' })
  }
})

export const { clearAuthError } = authSlice.actions
export default authSlice.reducer
