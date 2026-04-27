import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ca_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export function extractApiError(error) {
  return error.response?.data?.message || 'Something went wrong. Please try again.'
}

export default api
