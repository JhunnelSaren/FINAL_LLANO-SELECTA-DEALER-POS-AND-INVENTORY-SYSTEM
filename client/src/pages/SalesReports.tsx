import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { formatPeso, formatDate, formatDateTime } from '../utils/formatters';

// ─── TypeScript Interfaces ───────────────────────────────────────────────────

interface Payment {
  id: string;
  amount: number;
  method: 'Cash' | 'GCash' | 'Check' | 'Bank Transfer';
  reference?: string;
  createdAt: string;
  notes?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: { id: string; name: string };
  deliveryRun?: { runNumber: string };
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  createdAt: string;
  payments: Payment[];
}

interface ReconciliationRecord {
  id: string;
  deliveryRun: { runNumber: string; route: string; runDate: string };
  expectedCash: number;
  actualCash: number;
  variance: number;
  status: string;
  notes?: string;
  approvedBy?: { name: string };
  createdAt: string;
}

interface QuotaEntry {
  id: string;
  amount: number;
  entryDate: string;
  selectaPosRef: string;
  remarks?: string;
  enteredBy: string;
}

interface Quota {
  id?: string;
  monthYear: string;
  target: number;
  achieved: number;
  percentage: number;
  remaining: number;
  entries: QuotaEntry[];
}

function manilaMonthValue() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const year = parts.find(part => part.type === 'year')?.value ?? '2026';
  const month = parts.find(part => part.type === 'month')?.value ?? '01';
  return `${year}-${month}`;
}

interface SalesByProduct { name: string; sku: string; qty: number; revenue: number; }
interface SalesByCustomer { name: string; orders: number; revenue: number; }
interface SalesByRoute { route: string; orders: number; revenue: number; }
interface SalesReport {
  totalSales: number;
  totalOrders: number;
  byProduct: SalesByProduct[];
  byCustomer: SalesByCustomer[];
  byRoute: SalesByRoute[];
}

interface FulfillmentProduct { name: string; ordered: number; delivered: number; shortage: number; rate: number; }
interface FulfillmentReport {
  totalOrdered: number;
  totalDelivered: number;
  totalShortages: number;
  byProduct: FulfillmentProduct[];
}

interface ReceivableCustomer { name: string; balance: number; oldestInvoice: string; invoiceCount: number; }
interface ReceivablesReport {
  totalOutstanding: number;
  customers: ReceivableCustomer[];
}

interface CashDiscrepancyRecord { runNumber: string; route: string; date: string; expected: number; actual: number; variance: number; }
interface CashDiscrepanciesReport {
  records: CashDiscrepancyRecord[];
  totalVariance: number;
}

interface FreezerCustomer { name: string; freezerCount: number; lastVerified: string; status: string; }
interface FreezerComplianceReport {
  totalFreezers: number;
  compliantCount: number;
  dueSoonCount: number;
  overdueCount: number;
  complianceRate: number;
  freezers: Array<{ serialNumber: string; barcode: string; model: string; assignedStoreName: string; area: string; lastVerifiedAt: string | null; status: string }>;
}

interface StaffMember { name: string; role: string; bookings: number; deliveries: number; collections: number; }
interface StaffReport {
  staff: StaffMember[];
}

type TabId = 'receipts' | 'collection' | 'quota' | 'reports';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getToken(): string {
  return localStorage.getItem('token') ?? '';
}

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

function Spinner() {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-rose-600 border-t-transparent" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: 'bg-green-100 text-green-800',
    PARTIAL: 'bg-yellow-100 text-yellow-800',
    UNPAID: 'bg-red-100 text-red-800',
    OVERDUE: 'bg-red-200 text-red-900 font-semibold',
    DRAFT: 'bg-gray-100 text-gray-700',
    SUBMITTED: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

// ─── Print Receipt ────────────────────────────────────────────────────────────

function PrintReceipt({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const handlePrint = () => window.print();

  return (
    <>
      {/* Screen overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 no-print">
        <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">Print Receipt</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
          </div>
          <div id="receipt-content" className="border rounded p-4 text-sm font-mono text-gray-800">
            <div className="text-center mb-3">
              <p className="font-bold text-base">LLANO SELECTA DEALER</p>
              <p className="text-xs text-gray-500">Official Receipt</p>
              <hr className="my-2" />
            </div>
            <div className="space-y-1 mb-3">
              <p><span className="font-semibold">Invoice #:</span> {invoice.invoiceNumber}</p>
              <p><span className="font-semibold">Date:</span> {formatDate(invoice.createdAt)}</p>
              <p><span className="font-semibold">Customer:</span> {invoice.customer.name}</p>
              {invoice.deliveryRun && (
                <p><span className="font-semibold">Delivery Run:</span> {invoice.deliveryRun.runNumber}</p>
              )}
            </div>
            <hr className="my-2" />
            <div className="space-y-1 mb-3">
              <div className="flex justify-between font-semibold">
                <span>Total Amount</span><span>{formatPeso(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Amount Paid</span><span>{formatPeso(invoice.paidAmount)}</span>
              </div>
              <div className={`flex justify-between font-bold ${invoice.balance > 0 ? 'text-red-600' : 'text-green-700'}`}>
                <span>Balance Due</span><span>{formatPeso(invoice.balance)}</span>
              </div>
            </div>
            {invoice.payments.length > 0 && (
              <>
                <hr className="my-2" />
                <p className="font-semibold mb-1">Payment History</p>
                {invoice.payments.map(p => (
                  <div key={p.id} className="flex justify-between text-xs">
                    <span>{formatDate(p.createdAt)} — {p.method}</span>
                    <span>{formatPeso(p.amount)}</span>
                  </div>
                ))}
              </>
            )}
            <hr className="my-3" />
            <p className="text-center text-xs text-gray-500">Thank you for your business!</p>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handlePrint} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded px-4 py-2 text-sm font-semibold">
              🖨️ Print
            </button>
            <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 rounded px-4 py-2 text-sm hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Printable area */}
      <div className="print-only fixed inset-0 bg-white z-[9999] p-8 text-sm font-mono text-gray-900">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-4">
            <p className="font-bold text-lg">LLANO SELECTA DEALER</p>
            <p className="text-xs text-gray-500">Official Receipt</p>
            <hr className="my-2" />
          </div>
          <p><strong>Invoice #:</strong> {invoice.invoiceNumber}</p>
          <p><strong>Date:</strong> {formatDate(invoice.createdAt)}</p>
          <p><strong>Customer:</strong> {invoice.customer.name}</p>
          {invoice.deliveryRun && <p><strong>Delivery Run:</strong> {invoice.deliveryRun.runNumber}</p>}
          <hr className="my-3" />
          <div className="flex justify-between font-semibold"><span>Total Amount</span><span>{formatPeso(invoice.totalAmount)}</span></div>
          <div className="flex justify-between"><span>Amount Paid</span><span>{formatPeso(invoice.paidAmount)}</span></div>
          <div className="flex justify-between font-bold"><span>Balance Due</span><span>{formatPeso(invoice.balance)}</span></div>
          {invoice.payments.length > 0 && (
            <>
              <hr className="my-3" />
              <p className="font-semibold mb-1">Payment History</p>
              {invoice.payments.map(p => (
                <div key={p.id} className="flex justify-between text-xs">
                  <span>{formatDate(p.createdAt)} — {p.method} {p.reference ? `(${p.reference})` : ''}</span>
                  <span>{formatPeso(p.amount)}</span>
                </div>
              ))}
            </>
          )}
          <hr className="my-3" />
          <p className="text-center text-xs text-gray-500">Thank you for your business!</p>
        </div>
      </div>

      <style>{`
        @media print {
          body > *:not(.print-only) { display: none !important; }
          .print-only { display: block !important; position: static !important; }
          .no-print { display: none !important; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>
    </>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

function PaymentModal({
  invoice,
  onClose,
  onSuccess,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const [amount, setAmount] = useState<string>(String(invoice.balance));
  const [method, setMethod] = useState<'Cash' | 'GCash' | 'Check'>('Cash');
  const [reference, setReference] = useState('');
  const [bankName, setBankName] = useState('');
  const [checkDate, setCheckDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    if (numAmount > invoice.balance) {
      showToast('Amount exceeds balance', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ amount: numAmount, paymentMethod: method, referenceNumber: reference, bankName, checkDate, notes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to record payment');
      }
      showToast('Payment recorded successfully', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Failed to record payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Record Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">×</button>
        </div>
        <div className="mb-4 p-3 bg-rose-50 rounded-lg text-sm">
          <p className="text-gray-600">Invoice: <strong>{invoice.invoiceNumber}</strong></p>
          <p className="text-gray-600">Customer: <strong>{invoice.customer.name}</strong></p>
          <p className="text-gray-600">Balance Due: <strong className="text-red-600">{formatPeso(invoice.balance)}</strong></p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₱)</label>
            <input
              type="number"
              min="0.01"
              max={invoice.balance}
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value as typeof method)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
              <option value="Check">Bank Check</option>
            </select>
          </div>
          {(method === 'Check' || method === 'GCash') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {method === 'Check' ? 'Check Number' : 'GCash Reference'}
              </label>
              <input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder={method === 'Check' ? 'Check #' : 'GCash reference #'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}
          {method === 'Check' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <input value={bankName} onChange={e => setBankName(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check Date</label>
                <input type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            >
              {loading ? 'Saving…' : 'Record Payment'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sub-tab: Receipts & Customer Bills ──────────────────────────────────────

function ReceiptsTab() {
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null);
  const [printTarget, setPrintTarget] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (customerFilter) params.set('customerId', customerFilter);
      if (statusFilter) params.set('paymentStatus', statusFilter);
      if (startDate) params.set('dateFrom', startDate);
      if (endDate) params.set('dateTo', endDate);
      const res = await fetch(`/api/invoices?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.invoices ?? [];
      setInvoices(rows.map((row: any) => ({
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        customer: { id: row.customerId, name: row.storeName },
        deliveryRun: row.deliveryStop?.deliveryRun,
        totalAmount: Number(row.netAmountDue),
        paidAmount: Number(row.totalPaid),
        balance: Number(row.balanceRemaining),
        status: String(row.paymentStatus).toUpperCase(),
        createdAt: row.invoiceDate,
        payments: (row.payments ?? []).map((payment: any) => ({
          id: payment.id,
          amount: Number(payment.amount),
          method: payment.paymentMethod,
          reference: payment.referenceNumber,
          createdAt: payment.recordedAt,
          notes: payment.notes,
        })),
      })));
    } catch {
      showToast('Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  }, [customerFilter, statusFilter, startDate, endDate, showToast]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
              <option value="">All Statuses</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
          </div>
          <div className="flex items-end">
            <button onClick={fetchInvoices}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
              🔍 Search
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Invoice #', 'Date', 'Customer', 'Delivery Run', 'Amount', 'Paid', 'Balance', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {invoices.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">No invoices found.</td></tr>
                ) : invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-rose-700">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(inv.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.customer.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{inv.deliveryRun?.runNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatPeso(inv.totalAmount)}</td>
                    <td className="px-4 py-3 text-sm text-green-700 text-right whitespace-nowrap">{formatPeso(inv.paidAmount)}</td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold whitespace-nowrap ${inv.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatPeso(inv.balance)}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {inv.balance > 0 && (
                          <button onClick={() => setPaymentTarget(inv)}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-2 py-1 rounded font-medium transition-colors whitespace-nowrap">
                            💳 Pay
                          </button>
                        )}
                        <button onClick={() => setPrintTarget(inv)}
                          className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs px-2 py-1 rounded font-medium transition-colors whitespace-nowrap">
                          🖨️ Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {paymentTarget && (
        <PaymentModal invoice={paymentTarget} onClose={() => setPaymentTarget(null)} onSuccess={fetchInvoices} />
      )}
      {printTarget && (
        <PrintReceipt invoice={printTarget} onClose={() => setPrintTarget(null)} />
      )}
    </div>
  );
}

// ─── Sub-tab: Daily Collection ────────────────────────────────────────────────

function CollectionTab() {
  const { showToast } = useToast();
  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (route) params.set('route', route);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/reconciliation?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.records ?? [];
      setRecords(rows.map((row: any) => ({
        id: row.id,
        deliveryRun: { runNumber: row.deliveryRun?.runNumber ?? '—', route: row.deliveryRun?.route ?? '—', runDate: row.deliveryRun?.deliveryDate ?? row.deliveryRun?.runDate ?? row.reconciliationDate },
        expectedCash: Number(row.expectedCash) || 0,
        actualCash: Number(row.actualCashCounted ?? row.actualCash) || 0,
        variance: Number(row.cashVariance ?? row.variance) || 0,
        status: row.status ?? 'Draft',
        approvedBy: typeof row.approvedBy === 'string' && row.approvedBy ? { name: row.approvedBy } : row.approvedBy,
        createdAt: row.reconciliationDate ?? row.createdAt,
      })));
    } catch {
      showToast('Failed to load reconciliation records', 'error');
    } finally {
      setLoading(false);
    }
  }, [route, startDate, endDate, showToast]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const totalExpected = records.reduce((s, r) => s + r.expectedCash, 0);
  const totalActual = records.reduce((s, r) => s + r.actualCash, 0);
  const totalVariance = records.reduce((s, r) => s + r.variance, 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Route</label>
            <input type="text" value={route} onChange={e => setRoute(e.target.value)} placeholder="All routes"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
          </div>
          <div className="flex items-end">
            <button onClick={fetchRecords}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
              🔍 Search
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Expected Cash</p>
          <p className="text-2xl font-bold text-gray-900">{formatPeso(totalExpected)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Actual Cash</p>
          <p className="text-2xl font-bold text-gray-900">{formatPeso(totalActual)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Variance</p>
          <p className={`text-2xl font-bold ${totalVariance < 0 ? 'text-red-600' : totalVariance > 0 ? 'text-green-600' : 'text-gray-900'}`}>
            {totalVariance >= 0 ? '+' : ''}{formatPeso(totalVariance)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Run #', 'Date', 'Route', 'Expected', 'Actual', 'Variance', 'Status', 'Approved By'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {records.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">No collection records found.</td></tr>
                ) : records.map(rec => (
                  <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-rose-700">{rec.deliveryRun.runNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(rec.deliveryRun.runDate)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{rec.deliveryRun.route}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatPeso(rec.expectedCash)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatPeso(rec.actualCash)}</td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold whitespace-nowrap ${rec.variance < 0 ? 'text-red-600' : rec.variance > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                      {rec.variance >= 0 ? '+' : ''}{formatPeso(rec.variance)}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={rec.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rec.approvedBy?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-tab: Selecta POS Quota ───────────────────────────────────────────────

function QuotaTab() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const currentMonth = manilaMonthValue();
  const [month, setMonth] = useState(currentMonth);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(false);

  // Set target form
  const [targetAmount, setTargetAmount] = useState('');
  const [settingTarget, setSettingTarget] = useState(false);
  const [showTargetForm, setShowTargetForm] = useState(false);

  // Add entry form
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryAmount, setEntryAmount] = useState('');
  const [entryReference, setEntryReference] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }));
  const [entryNotes, setEntryNotes] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);

  const fetchQuota = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quota?month=${month}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuota(data);
      setTargetAmount(String(data.target ?? ''));
    } catch {
      setQuota(null);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { fetchQuota(); }, [fetchQuota]);

  const handleSetTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) { showToast('Enter a valid target amount', 'error'); return; }
    setSettingTarget(true);
    try {
      const res = await fetch('/api/quota/target', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ monthYear: month, targetAmount: target }),
      });
      if (!res.ok) throw new Error();
      showToast('Quota target set!', 'success');
      setShowTargetForm(false);
      await fetchQuota();
    } catch {
      showToast('Failed to set target', 'error');
    } finally {
      setSettingTarget(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(entryAmount);
    if (isNaN(amount) || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
    setSavingEntry(true);
    try {
      const res = await fetch('/api/quota/entry', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ monthYear: month, selectaPosRef: entryReference.trim(), amount, entryDate, remarks: entryNotes }),
      });
      if (!res.ok) throw new Error();
      showToast('Entry added!', 'success');
      setShowEntryForm(false);
      setEntryAmount('');
      setEntryReference('');
      setEntryNotes('');
      await fetchQuota();
    } catch {
      showToast('Failed to add entry', 'error');
    } finally {
      setSavingEntry(false);
    }
  };

  const pct = quota ? Math.min(quota.percentage, 100) : 0;
  const barColor = quota
    ? quota.percentage >= 100 ? 'bg-green-500'
    : quota.percentage >= 70 ? 'bg-yellow-400'
    : 'bg-red-500'
    : 'bg-gray-300';

  const textColor = quota
    ? quota.percentage >= 100 ? 'text-green-600'
    : quota.percentage >= 70 ? 'text-yellow-600'
    : 'text-red-600'
    : 'text-gray-500';

  return (
    <div className="space-y-4">
      {/* Month picker */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
        </div>
        <button onClick={fetchQuota}
          className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
          Load
        </button>
      </div>

      {loading ? <Spinner /> : (
        <>
          {!quota ? (
            /* No quota set */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <p className="text-gray-500 mb-4">No quota set for <strong>{month}</strong>.</p>
              {isAdmin && (
                <form onSubmit={handleSetTarget} className="max-w-xs mx-auto space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Set Monthly Target (₱)</label>
                    <input type="number" min="1" step="0.01" value={targetAmount} onChange={e => setTargetAmount(e.target.value)}
                      required placeholder="e.g. 500000"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
                  </div>
                  <button type="submit" disabled={settingTarget}
                    className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
                    {settingTarget ? 'Setting…' : 'Set Target'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              {/* Progress Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">Selecta POS Quota — {month}</h3>
                    <p className={`text-sm font-medium mt-0.5 ${textColor}`}>
                      {quota.percentage.toFixed(1)}% achieved
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{formatPeso(quota.achieved)}</p>
                    <p className="text-sm text-gray-500">of {formatPeso(quota.target)} target</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden">
                  <div className={`h-5 rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>₱0</span>
                  <span>{formatPeso(quota.target)}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => setShowEntryForm(v => !v)}
                      className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
                      + Add Entry
                    </button>
                    {isAdmin && <button onClick={() => { setTargetAmount(String(quota.target)); setShowTargetForm(v => !v); }}
                      className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
                      Edit Monthly Target
                    </button>}
                </div>

                {isAdmin && showTargetForm && (
                  <form onSubmit={handleSetTarget} className="mt-4 bg-slate-50 rounded-lg p-4 flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Monthly target for {month} (₱)</label>
                      <input type="number" min="1" step="0.01" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <button type="submit" disabled={settingTarget} className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-semibold">
                      {settingTarget ? 'Saving…' : 'Save Target'}
                    </button>
                  </form>
                )}

                {showEntryForm && (
                  <form onSubmit={handleAddEntry} className="mt-4 bg-rose-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Selecta POS / Z-read Reference</label>
                        <input type="text" value={entryReference} onChange={e => setEntryReference(e.target.value)} required
                          placeholder="e.g. POS-ZREAD-2026-1029" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₱)</label>
                        <input type="number" min="0.01" step="0.01" value={entryAmount} onChange={e => setEntryAmount(e.target.value)} required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Entry Date</label>
                        <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Notes (e.g., Unilever POS Entry #12345)</label>
                      <input type="text" value={entryNotes} onChange={e => setEntryNotes(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={savingEntry}
                        className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
                        {savingEntry ? 'Saving…' : 'Submit Entry'}
                      </button>
                      <button type="button" onClick={() => setShowEntryForm(false)}
                        className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Entry History */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">Entry History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Date', 'POS Reference', 'Amount', 'Recorded By'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {quota.entries.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-8 text-gray-400">No entries yet.</td></tr>
                      ) : quota.entries.map(entry => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(entry.entryDate)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{entry.selectaPosRef}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatPeso(entry.amount)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{entry.enteredBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-tab: Reports ─────────────────────────────────────────────────────────

type ReportKey = 'sales' | 'fulfillment' | 'receivables' | 'cash' | 'freezer' | 'staff';

function ReportsTab() {
  const { showToast } = useToast();

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const monthStart = today.slice(0, 8) + '01';

  // Per-report state
  const [reportData, setReportData] = useState<Partial<Record<ReportKey, any>>>({});
  const [loadingReport, setLoadingReport] = useState<Partial<Record<ReportKey, boolean>>>({});
  const [startDates, setStartDates] = useState<Record<ReportKey, string>>({
    sales: monthStart, fulfillment: monthStart, receivables: '', cash: monthStart, freezer: '', staff: monthStart,
  });
  const [endDates, setEndDates] = useState<Record<ReportKey, string>>({
    sales: today, fulfillment: today, receivables: '', cash: today, freezer: '', staff: today,
  });
  const [routes, setRoutes] = useState<Record<ReportKey, string>>({
    sales: '', fulfillment: '', receivables: '', cash: '', freezer: '', staff: '',
  });

  const generate = async (key: ReportKey) => {
    setLoadingReport(p => ({ ...p, [key]: true }));
    try {
      const params = new URLSearchParams();
      if (startDates[key]) params.set('dateFrom', startDates[key]);
      if (endDates[key]) params.set('dateTo', endDates[key]);
      if (routes[key]) params.set('route', routes[key]);

      const endpointMap: Record<ReportKey, string> = {
        sales: '/api/reports/sales',
        fulfillment: '/api/reports/fulfillment',
        receivables: '/api/reports/receivables',
        cash: '/api/reports/cash-discrepancies',
        freezer: '/api/reports/freezer-compliance',
        staff: '/api/reports/staff-performance',
      };
      const res = await fetch(`${endpointMap[key]}?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReportData(p => ({ ...p, [key]: data }));
    } catch {
      showToast('Failed to generate report', 'error');
    } finally {
      setLoadingReport(p => ({ ...p, [key]: false }));
    }
  };

  const exportReport = async (type: string, key: ReportKey) => {
    try {
      const params = new URLSearchParams({ exportExcel: 'true' });
      if (startDates[key]) params.set('dateFrom', startDates[key]);
      if (endDates[key]) params.set('dateTo', endDates[key]);
      if (routes[key]) params.set('route', routes[key]);
      const res = await fetch(`/api/reports/${type}?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Export failed', 'error');
    }
  };

  const setStart = (k: ReportKey) => (v: string) => setStartDates(p => ({ ...p, [k]: v }));
  const setEnd = (k: ReportKey) => (v: string) => setEndDates(p => ({ ...p, [k]: v }));

  const FilterRow = ({ k, showRoute = false }: { k: ReportKey; showRoute?: boolean }) => (
    <div className="flex flex-wrap gap-2 items-end mt-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Start</label>
        <input type="date" value={startDates[k]} onChange={e => setStart(k)(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">End</label>
        <input type="date" value={endDates[k]} onChange={e => setEnd(k)(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500" />
      </div>
      {showRoute && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Route</label>
          <input type="text" value={routes[k]} onChange={e => setRoutes(p => ({ ...p, [k]: e.target.value }))} placeholder="All"
            className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 w-28" />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">

      {/* 1. Sales Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-800">📊 Sales Summary</h3>
            <p className="text-xs text-gray-500 mt-0.5">Total revenue, top products, and customer breakdown.</p>
            <FilterRow k="sales" showRoute />
          </div>
          <div className="flex flex-col gap-2 items-end justify-start mt-2">
            <button onClick={() => generate('sales')} disabled={loadingReport.sales}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors">
              {loadingReport.sales ? '…' : 'Generate'}
            </button>
            <button onClick={() => exportReport('sales', 'sales')}
              className="border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg px-4 py-1.5 text-sm transition-colors">
              📥 Export
            </button>
          </div>
        </div>
        {reportData.sales && (() => {
          const d = reportData.sales as SalesReport;
          return (
            <div className="mt-4 space-y-4">
              <div className="flex gap-4 flex-wrap">
                <div className="bg-rose-50 rounded-lg p-3 flex-1 min-w-[140px]">
                  <p className="text-xs text-gray-500">Total Sales</p>
                  <p className="text-lg font-bold text-rose-700">{formatPeso(d.totalSales)}</p>
                </div>
                <div className="bg-rose-50 rounded-lg p-3 flex-1 min-w-[140px]">
                  <p className="text-xs text-gray-500">Total Orders</p>
                  <p className="text-lg font-bold text-rose-700">{d.totalOrders}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">By Product</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border rounded-lg overflow-hidden">
                    <thead className="bg-gray-50"><tr>
                      {['Product', 'SKU', 'Qty', 'Revenue'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {d.byProduct.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{p.name}</td>
                          <td className="px-3 py-2 font-mono text-gray-500">{p.sku}</td>
                          <td className="px-3 py-2">{p.qty}</td>
                          <td className="px-3 py-2 font-semibold">{formatPeso(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">By Customer</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border rounded-lg overflow-hidden">
                    <thead className="bg-gray-50"><tr>
                      {['Customer', 'Orders', 'Revenue'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {d.byCustomer.map((c, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{c.name}</td>
                          <td className="px-3 py-2">{c.orders}</td>
                          <td className="px-3 py-2 font-semibold">{formatPeso(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {d.byRoute.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">By Route</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border rounded-lg overflow-hidden">
                      <thead className="bg-gray-50"><tr>
                        {['Route', 'Orders', 'Revenue'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>)}
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {d.byRoute.map((r, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium">{r.route}</td>
                            <td className="px-3 py-2">{r.orders}</td>
                            <td className="px-3 py-2 font-semibold">{formatPeso(r.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* 2. Delivery Fulfillment Rate */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-800">🚚 Delivery Fulfillment Rate</h3>
            <p className="text-xs text-gray-500 mt-0.5">Track shortages and delivery rates per product.</p>
            <FilterRow k="fulfillment" />
          </div>
          <div className="flex flex-col gap-2 items-end justify-start mt-2">
            <button onClick={() => generate('fulfillment')} disabled={loadingReport.fulfillment}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors">
              {loadingReport.fulfillment ? '…' : 'Generate'}
            </button>
            <button onClick={() => exportReport('fulfillment', 'fulfillment')}
              className="border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg px-4 py-1.5 text-sm transition-colors">
              📥 Export
            </button>
          </div>
        </div>
        {reportData.fulfillment && (() => {
          const d = reportData.fulfillment as FulfillmentReport;
          return (
            <div className="mt-4 space-y-3">
              <div className="flex gap-4 flex-wrap">
                {[['Ordered', d.totalOrdered], ['Delivered', d.totalDelivered], ['Shortages', d.totalShortages]].map(([k, v]) => (
                  <div key={String(k)} className="bg-rose-50 rounded-lg p-3 flex-1 min-w-[120px]">
                    <p className="text-xs text-gray-500">{k}</p>
                    <p className="text-lg font-bold text-rose-700">{v}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50"><tr>
                    {['Product', 'Ordered', 'Delivered', 'Shortage', 'Rate'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {d.byProduct.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{p.name}</td>
                        <td className="px-3 py-2">{p.ordered}</td>
                        <td className="px-3 py-2">{p.delivered}</td>
                        <td className={`px-3 py-2 font-semibold ${p.shortage > 0 ? 'text-red-600' : 'text-gray-700'}`}>{p.shortage}</td>
                        <td className="px-3 py-2">
                          <span className={`font-semibold ${p.rate >= 95 ? 'text-green-600' : p.rate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {p.rate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 3. Outstanding Receivables */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-800">💰 Outstanding Receivables</h3>
            <p className="text-xs text-gray-500 mt-0.5">Customer balances sorted by oldest invoice.</p>
          </div>
          <div className="flex flex-col gap-2 items-end justify-start mt-2">
            <button onClick={() => generate('receivables')} disabled={loadingReport.receivables}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors">
              {loadingReport.receivables ? '…' : 'Generate'}
            </button>
            <button onClick={() => exportReport('receivables', 'receivables')}
              className="border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg px-4 py-1.5 text-sm transition-colors">
              📥 Export
            </button>
          </div>
        </div>
        {reportData.receivables && (() => {
          const d = reportData.receivables as ReceivablesReport;
          return (
            <div className="mt-4 space-y-3">
              <div className="bg-rose-50 rounded-lg p-3 inline-block">
                <p className="text-xs text-gray-500">Total Outstanding</p>
                <p className="text-xl font-bold text-red-600">{formatPeso(d.totalOutstanding)}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50"><tr>
                    {['Customer', 'Invoices', 'Oldest Invoice', 'Balance'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {d.customers.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{c.name}</td>
                        <td className="px-3 py-2">{c.invoiceCount}</td>
                        <td className="px-3 py-2 text-gray-500">{formatDate(c.oldestInvoice)}</td>
                        <td className="px-3 py-2 font-bold text-red-600">{formatPeso(c.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 4. Cash Discrepancies */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-800">🔍 Cash Discrepancies</h3>
            <p className="text-xs text-gray-500 mt-0.5">Variance history across delivery runs.</p>
            <FilterRow k="cash" />
          </div>
          <div className="flex flex-col gap-2 items-end justify-start mt-2">
            <button onClick={() => generate('cash')} disabled={loadingReport.cash}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors">
              {loadingReport.cash ? '…' : 'Generate'}
            </button>
          </div>
        </div>
        {reportData.cash && (() => {
          const d = reportData.cash as CashDiscrepanciesReport;
          return (
            <div className="mt-4 space-y-3">
              <div className={`rounded-lg p-3 inline-block ${d.totalVariance < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className="text-xs text-gray-500">Total Variance</p>
                <p className={`text-xl font-bold ${d.totalVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {d.totalVariance >= 0 ? '+' : ''}{formatPeso(d.totalVariance)}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50"><tr>
                    {['Run #', 'Route', 'Date', 'Expected', 'Actual', 'Variance'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {d.records.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono font-semibold text-rose-700">{r.runNumber}</td>
                        <td className="px-3 py-2">{r.route}</td>
                        <td className="px-3 py-2 text-gray-500">{formatDate(r.date)}</td>
                        <td className="px-3 py-2">{formatPeso(r.expected)}</td>
                        <td className="px-3 py-2">{formatPeso(r.actual)}</td>
                        <td className={`px-3 py-2 font-semibold ${r.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {r.variance >= 0 ? '+' : ''}{formatPeso(r.variance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 5. Freezer Compliance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-800">🧊 Freezer Compliance</h3>
            <p className="text-xs text-gray-500 mt-0.5">Customers overdue for freezer verification.</p>
          </div>
          <div className="flex flex-col gap-2 items-end justify-start mt-2">
            <button onClick={() => generate('freezer')} disabled={loadingReport.freezer}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors">
              {loadingReport.freezer ? '…' : 'Generate'}
            </button>
          </div>
        </div>
        {reportData.freezer && (() => {
          const d = reportData.freezer as FreezerComplianceReport;
          return (
            <div className="mt-4 space-y-3">
              <div className="flex gap-4 flex-wrap">
                {[['Total Freezers', d.totalFreezers, ''], ['Compliant', d.compliantCount, 'text-green-600'], ['Due Soon', d.dueSoonCount, 'text-amber-600'], ['Overdue / Due', d.overdueCount, 'text-red-600']].map(([label, val, cls]) => (
                  <div key={String(label)} className="bg-rose-50 rounded-lg p-3 flex-1 min-w-[100px]">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`text-lg font-bold ${cls || 'text-rose-700'}`}>{val}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50"><tr>
                    {['Serial #', 'Barcode', 'Model', 'Store / Area', 'Last Verified', 'Status'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {d.freezers.map((freezer, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{freezer.serialNumber}</td>
                        <td className="px-3 py-2 font-mono">{freezer.barcode}</td>
                        <td className="px-3 py-2">{freezer.model}</td>
                        <td className="px-3 py-2">{freezer.assignedStoreName} · {freezer.area}</td>
                        <td className="px-3 py-2 text-gray-500">{freezer.lastVerifiedAt ? formatDate(freezer.lastVerifiedAt) : 'Never'}</td>
                        <td className="px-3 py-2"><StatusBadge status={freezer.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 6. Staff Performance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-800">👷 Staff Performance</h3>
            <p className="text-xs text-gray-500 mt-0.5">Bookings, deliveries, and collections per staff member.</p>
            <FilterRow k="staff" />
          </div>
          <div className="flex flex-col gap-2 items-end justify-start mt-2">
            <button onClick={() => generate('staff')} disabled={loadingReport.staff}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors">
              {loadingReport.staff ? '…' : 'Generate'}
            </button>
          </div>
        </div>
        {reportData.staff && (() => {
          const d = reportData.staff as StaffReport;
          return (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-xs border rounded-lg overflow-hidden">
                <thead className="bg-gray-50"><tr>
                  {['Name', 'Role', 'Bookings', 'Deliveries', 'Collections'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {d.staff.map((s, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{s.name}</td>
                      <td className="px-3 py-2 text-gray-500">{s.role}</td>
                      <td className="px-3 py-2">{s.bookings}</td>
                      <td className="px-3 py-2">{s.deliveries}</td>
                      <td className="px-3 py-2">{s.collections}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'receipts', label: 'Receipts & Customer Bills', icon: '🧾' },
  { id: 'collection', label: 'Daily Collection', icon: '💵' },
  { id: 'quota', label: 'Selecta POS Quota', icon: '🎯' },
  { id: 'reports', label: 'Reports', icon: '📈' },
];

export default function SalesReports() {
  const [activeTab, setActiveTab] = useState<TabId>('receipts');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-gray-900">Sales Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Invoices, collections, quota tracking, and business reports.</p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex overflow-x-auto -mb-px gap-0" aria-label="Sales Report Tabs">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-rose-600 text-rose-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'receipts' && <ReceiptsTab />}
        {activeTab === 'collection' && <CollectionTab />}
        {activeTab === 'quota' && <QuotaTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </div>
    </div>
  );
}
