import React from 'react'
import { useAuth } from './context/AuthContext'
import { ToastProvider } from './components/common/Toast'
import Navbar from './components/layout/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import OrdersDelivery from './pages/OrdersDelivery'
import Reconciliation from './pages/Reconciliation'
import Inventory from './pages/Inventory'
import StoresFreezers from './pages/StoresFreezers'
import SalesReports from './pages/SalesReports'
import Settings from './pages/Settings'

export type ActiveTab = 'dashboard' | 'orders-delivery' | 'reconciliation' | 'inventory' | 'stores-freezers' | 'sales-reports' | 'settings'

function AppContent() {
  const { user, isLoading: loading } = useAuth()
  const [activeTab, setActiveTab] = React.useState<string>('dashboard')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading Llano POS...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="max-w-screen-2xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
        {activeTab === 'orders-delivery' && <OrdersDelivery />}
        {activeTab === 'reconciliation' && <Reconciliation />}
        {activeTab === 'inventory' && <Inventory />}
        {activeTab === 'stores-freezers' && <StoresFreezers />}
        {activeTab === 'sales-reports' && <SalesReports />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}
