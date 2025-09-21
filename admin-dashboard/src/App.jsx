import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './ui/Sidebar'
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'
import AdminsPage from './pages/Admins'
import CustomersPage from './pages/Customers'
import { useAuth } from './state/auth'

function Protected({ children, anyOfRoles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!anyOfRoles || anyOfRoles.length === 0) return children
  const roles = user?.roles || []
  const can = roles.includes('admin') || roles.some(r => anyOfRoles.includes(r))
  return can ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <Protected>
            <div className="min-h-screen grid grid-cols-[240px_1fr]">
              <Sidebar />
              <main className="p-6">
                <Routes>
                  <Route index element={<DashboardPage />} />
                  <Route path="admins" element={
                    <Protected anyOfRoles={["user_manager","admin"]}>
                      <AdminsPage />
                    </Protected>
                  } />
                  <Route path="customers" element={
                    <Protected anyOfRoles={["user_manager","admin"]}>
                      <CustomersPage />
                    </Protected>
                  } />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </Protected>
        }
      />
    </Routes>
  )
}
