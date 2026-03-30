import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Products from './pages/Products'
import Orders from './pages/Orders'
import StockMovements from './pages/StockMovements'

function AppContent() {
  return (
    <div className="appShell">
      <Sidebar />
      <div className="mainArea">
        <Header />
        <main className="pageContent">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clienti" element={<Customers />} />
            <Route path="/magazzino" element={<Products />} />
            <Route path="/ordini" element={<Orders />} />
            <Route path="/movimenti" element={<StockMovements />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div style={{ padding: 30 }}>Caricamento...</div>
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      <Route
        path="/*"
        element={
          <ProtectedRoute session={session}>
            <Layout>
              <AppContent />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}