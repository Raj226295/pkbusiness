import { createContext, useContext, useEffect, useState } from 'react'
import api from '../lib/api.js'

const AuthContext = createContext(null)

function readStoredUser() {
  const rawUser = localStorage.getItem('ca_user')

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('ca_token') || '')
  const [user, setUser] = useState(readStoredUser)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('ca_token')))

  const persistSession = (nextToken, nextUser) => {
    setToken(nextToken)
    setUser(nextUser)
    localStorage.setItem('ca_token', nextToken)
    localStorage.setItem('ca_user', JSON.stringify(nextUser))
  }

  const clearSession = () => {
    setToken('')
    setUser(null)
    localStorage.removeItem('ca_token')
    localStorage.removeItem('ca_user')
  }

  const refreshProfile = async () => {
    const { data } = await api.get('/api/user/profile')
    setUser(data.user)
    localStorage.setItem('ca_user', JSON.stringify(data.user))
    return data.user
  }

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    refreshProfile()
      .catch(() => {
        clearSession()
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  const register = async (payload) => {
    const { data } = await api.post('/api/auth/register', payload)
    persistSession(data.token, data.user)
    return data.user
  }

  const login = async (payload) => {
    const { data } = await api.post('/api/auth/login', payload)
    persistSession(data.token, data.user)
    return data.user
  }

  const logout = () => {
    clearSession()
  }

  const updateUser = (nextUser) => {
    setUser(nextUser)
    localStorage.setItem('ca_user', JSON.stringify(nextUser))
  }

  return (
    <AuthContext.Provider
      value={{
        loading,
        token,
        user,
        login,
        logout,
        refreshProfile,
        register,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
