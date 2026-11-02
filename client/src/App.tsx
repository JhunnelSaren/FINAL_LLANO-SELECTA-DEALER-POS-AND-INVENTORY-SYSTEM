import React from 'react'
import { useAuth } from './context/AuthContext'
import { ToastProvider } from './components/common/Toast'
import Navbar from './components/layout/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import OrdersDelivery, { type OrdersDeliveryTab } from './pages/OrdersDelivery'
import Inventory from './pages/Inventory'
import StoresFreezers from './pages/StoresFreezers'
import SalesReports, { type SalesReportsTab } from './pages/SalesReports'
import Settings from './pages/Settings'

export type ActiveTab = 'dashboard' | 'orders-delivery' | 'inventory' | 'stores-freezers' | 'sales-reports' | 'settings'

function AppContent() {
  const { user, isLoading: loading } = useAuth()
  const [activeTab, setActiveTab] = React.useState<string>('dashboard')
  const [ordersSubTab, setOrdersSubTab] = React.useState<OrdersDeliveryTab>('bookings')
  const [salesReportsSubTab, setSalesReportsSubTab] = React.useState<SalesReportsTab>('receipts')

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

  const isAdmin = user.role === 'Admin'
  const displayedTab = !isAdmin && (activeTab === 'stores-freezers' || activeTab === 'settings') ? 'dashboard' : activeTab

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab={displayedTab} setActiveTab={setActiveTab} />
      <main className="max-w-screen-2xl mx-auto px-4 py-6">
        {displayedTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} setOrdersSubTab={setOrdersSubTab} setSalesReportsSubTab={setSalesReportsSubTab} />}
        {displayedTab === 'orders-delivery' && <OrdersDelivery activeSubTab={ordersSubTab} setActiveSubTab={setOrdersSubTab} onOpenReconciliation={() => { setSalesReportsSubTab('collection'); setActiveTab('sales-reports') }} />}
        {displayedTab === 'inventory' && <Inventory />}
        {displayedTab === 'stores-freezers' && isAdmin && <StoresFreezers />}
        {displayedTab === 'sales-reports' && <SalesReports activeTab={isAdmin ? salesReportsSubTab : 'collection'} setActiveTab={setSalesReportsSubTab} />}
        {displayedTab === 'settings' && isAdmin && <Settings />}
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
