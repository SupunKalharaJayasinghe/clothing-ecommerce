import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  withCredentials: true,
  timeout: 15000,
})

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
)

export default api
