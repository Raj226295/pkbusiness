import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import Loader from '../common/Loader.jsx'

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { token, user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Loader fullScreen message="Checking your session..." />
  }

  if (!token || !user) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    return <Navigate replace to={user.role === 'admin' ? '/admin' : '/dashboard'} />
  }

  return children
}

export default ProtectedRoute
