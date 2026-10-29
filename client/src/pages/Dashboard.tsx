import React, { useEffect, useState } from 'react';
import {
  ClipboardList, Truck, Package, TrendingUp,
  AlertTriangle, DollarSign, Snowflake, Target,
  ChevronRight, RefreshCw, CheckCircle2, Clock, Loader2
} from 'lucide-react';
import { apiRequest } from '../utils/api';
import { formatPeso, formatDate } from '../utils/formatters';
import { StatusBadge } from '../components/common/StatusBadge';

interface DashboardData {
  metrics: {
    todayBookings: { count: number; scheduledDeliveries: number };
    bookingsToPrepare: number;
    stockReceiptsToday: number;
    stockStatus: { totalSaleableUnits: number; lowStockCount: number; lowStockProducts: any[] };
    deliveryStatus: { inProgress: number; awaitingReconciliation: number };
    outstandingBalances: { totalAmount: number; count: number };
    discrepancies: { pendingApprovalsCount: number; pendingShortageAmount: number; pendingBoCount: number };
    freezersVerification: { dueCount: number; freezers: any[] };
    quota: { monthYear: string; target: number; achieved: number; percentage: number; remaining: number };
  };
  recentBookings: any[];
  recentRuns: any[];
}

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  setSubTab?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await apiRequest<DashboardData>('/dashboard');
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p className="text-rose-700 font-medium">{error}</p>
        <button onClick={fetchDashboard} className="mt-3 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm hover:bg-rose-700 transition">
          Retry
        </button>
      </div>
    );
  }

  const m = data?.metrics;
  if (!m) return null;

  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' });

  const metricCards = [
    {
      label: "Today's Bookings & Deliveries",
      icon: ClipboardList,
      color: 'blue',
      value: m.todayBookings.count,
      sub: `${m.todayBookings.scheduledDeliveries} trips scheduled today`,
      onClick: () => setActiveTab('orders-delivery'),
      alert: false,
    },
    {
      label: 'Bookings to Prepare',
      icon: Clock,
      color: 'amber',
      value: m.bookingsToPrepare,
      sub: 'Waiting for stock and delivery planning',
      onClick: () => setActiveTab('orders-delivery'),
      alert: m.bookingsToPrepare > 0,
    },
    {
      label: 'Freezer Van Receipts Today',
      icon: Package,
      color: 'violet',
      value: m.stockReceiptsToday,
      sub: 'Receipts recorded with stock added to inventory',
      onClick: () => setActiveTab('orders-delivery'),
      alert: false,
    },
    {
      label: 'Products in Stock',
      icon: Package,
      color: m.stockStatus.lowStockCount > 0 ? 'rose' : 'emerald',
      value: m.stockStatus.totalSaleableUnits,
      sub: m.stockStatus.lowStockCount > 0
        ? `⚠️ ${m.stockStatus.lowStockCount} products below minimum level`
        : 'All products above safety threshold',
      onClick: () => setActiveTab('inventory'),
      alert: m.stockStatus.lowStockCount > 0,
    },
    {
      label: 'Deliveries In Progress',
      icon: Truck,
      color: 'blue',
      value: m.deliveryStatus.inProgress,
      sub: `${m.deliveryStatus.awaitingReconciliation} completed deliveries`,
      onClick: () => setActiveTab('orders-delivery'),
      alert: m.deliveryStatus.inProgress > 0,
    },
    {
      label: 'Outstanding Customer Balances',
      icon: DollarSign,
      color: m.outstandingBalances.totalAmount > 0 ? 'amber' : 'emerald',
      value: formatPeso(m.outstandingBalances.totalAmount),
      sub: `${m.outstandingBalances.count} stores with unpaid balances`,
      onClick: () => setActiveTab('sales-reports'),
      alert: m.outstandingBalances.totalAmount > 0,
    },
    {
      label: 'Cash Discrepancies',
      icon: AlertTriangle,
      color: m.discrepancies.pendingApprovalsCount > 0 ? 'rose' : 'emerald',
      value: m.discrepancies.pendingApprovalsCount,
      sub: `${m.discrepancies.pendingApprovalsCount} route record(s) pending review | ${m.discrepancies.pendingBoCount} BO items pending disposition | ${formatPeso(m.discrepancies.pendingShortageAmount)} shortage`,
      onClick: () => setActiveTab('sales-reports'),
      alert: m.discrepancies.pendingApprovalsCount > 0,
    },
    {
      label: 'Freezers Due for Verification',
      icon: Snowflake,
      color: m.freezersVerification.dueCount > 0 ? 'amber' : 'emerald',
      value: m.freezersVerification.dueCount,
      sub: m.freezersVerification.dueCount > 0
        ? 'Monthly Timemark scan required'
        : 'All freezer scans up to date',
      onClick: () => setActiveTab('stores-freezers'),
      alert: m.freezersVerification.dueCount > 0,
    },
    {
      label: `Selecta POS Quota — ${m.quota.monthYear}`,
      icon: Target,
      color: m.quota.percentage >= 100 ? 'emerald' : m.quota.percentage >= 75 ? 'blue' : 'amber',
      value: `${m.quota.percentage}%`,
      sub: `${formatPeso(m.quota.achieved)} of ${formatPeso(m.quota.target)} | Remaining: ${formatPeso(m.quota.remaining)}`,
      onClick: () => setActiveTab('sales-reports'),
      alert: false,
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
    violet: 'bg-violet-50 border-violet-200 text-violet-600',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    rose: 'bg-rose-50 border-rose-200 text-rose-600',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">Operations Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">{today}</p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* 9 Metric Cards — all clickable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          const colors = colorMap[card.color] || colorMap.blue;
          return (
            <button
              key={idx}
              onClick={card.onClick}
              className={`bg-white border rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 group relative ${card.alert ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}
            >
              {card.alert && (
                <span className="absolute top-3 right-3 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              )}
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border ${colors} mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-black text-slate-800 leading-none mb-1">{card.value}</div>
              <div className="text-xs font-semibold text-slate-600 mb-1">{card.label}</div>
              <div className="text-xs text-slate-400">{card.sub}</div>
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition">
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Quota Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-slate-800">Monthly Selecta POS Quota Progress — {m.quota.monthYear}</h3>
          </div>
          <button
            onClick={() => setActiveTab('sales-reports')}
            className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
          >
            Manage Quota <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Achieved: <span className="font-bold text-slate-700">{formatPeso(m.quota.achieved)}</span></span>
              <span>Target: <span className="font-bold text-slate-700">{formatPeso(m.quota.target)}</span></span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${m.quota.percentage >= 100 ? 'bg-emerald-500' : m.quota.percentage >= 75 ? 'bg-blue-500' : m.quota.percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, m.quota.percentage)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>{m.quota.percentage}% achieved</span>
              <span>Remaining: {formatPeso(m.quota.remaining)}</span>
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 min-w-[60px] text-right">
            {m.quota.percentage}%
          </div>
        </div>
      </div>

      {/* Two Compact Operational Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Bookings */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-slate-700 text-sm">Recent Bookings</h3>
            </div>
            <button
              onClick={() => setActiveTab('orders-delivery')}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-0.5"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {(data?.recentBookings || []).length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">No recent bookings</div>
            ) : (
              (data?.recentBookings || []).slice(0, 5).map((b) => (
                <div key={b.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition">
                  <div>
                    <div className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">{b.storeName}</div>
                    <div className="text-xs text-slate-400">{b.bookingNumber} · {formatDate(b.bookingDate)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-slate-800">{formatPeso(b.subtotal)}</div>
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Delivery Runs */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-slate-700 text-sm">Recent Delivery Runs</h3>
            </div>
            <button
              onClick={() => setActiveTab('orders-delivery')}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-0.5"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {(data?.recentRuns || []).length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">No recent delivery runs</div>
            ) : (
              (data?.recentRuns || []).slice(0, 5).map((r: any) => (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition">
                  <div>
                    <div className="text-sm font-semibold text-slate-700">{r.runNumber}</div>
                    <div className="text-xs text-slate-400">{r.route} · Driver: {r.driver}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {m.stockStatus.lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-amber-800 text-sm">Low Stock Alert — {m.stockStatus.lowStockProducts.length} Products Below Minimum</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {m.stockStatus.lowStockProducts.slice(0, 8).map((p: any) => (
              <div key={p.id} className="bg-white border border-amber-200 rounded-lg px-3 py-2">
                <div className="text-xs font-semibold text-slate-700 truncate">{p.name}</div>
                <div className="text-xs text-amber-700 mt-0.5">
                  <span className="font-bold">{p.stock}</span> / {p.minStock} min
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
