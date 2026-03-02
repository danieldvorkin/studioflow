import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

function normalizeRoleName(user) {
  const roleName = (user?.roleName || '').toString().toLowerCase()
  if (roleName) return roleName

  const role = user?.role
  if (role === 0) return 'owner'
  if (role === 1) return 'staff'
  if (role === 2) return 'instructor'
  if (role === 3) return 'client'
  return ''
}

export default function RoleGate({ allow = [], children, redirectTo = '/dashboard' }) {
  const { user, loading } = useAuth()
  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/signin" replace />

  const roleName = normalizeRoleName(user)
  const allowed = allow.map((r) => r.toLowerCase())

  if (!allowed.includes(roleName)) {
    return <Navigate to={redirectTo} replace />
  }

  return children
}
