import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { formatPeso, formatDate, formatDateTime } from '../utils/formatters';
import { getAuthToken } from '../utils/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  stockOnHand: number;
  reservedQty: number;
  availableQty: number;
  quarantineQty: number;
  minStockLevel: number;
  isActive: boolean;
}

interface LedgerEntry {
  id: string;
  createdAt: string;
  type: string;
  qty: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string | null;
  notes: string | null;
  product: { name: string; sku: string };
}

interface BORecord {
  id: string;
  storeName: string;
  product: { name: string; sku: string };
  qty: number;
  totalDeduction: number;
  reason: string;
  status: string;
  createdAt: string;
  disposition: string | null;
  dispositionNotes: string | null;
}

interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stockOnHand: number;
  minStockLevel: number;
  deficit: number;
}

type SubTab = 'stock' | 'movements' | 'damaged' | 'lowstock';

const MOVEMENT_TYPES = [
  'Supplier Receiving',
  'Dispatch',
  'Sale Delivered',
  'Intact Return',
  'BO Quarantine',
  'Physical Adjustment',
  'BO Disposition',
];

// ─── API Helper ──────────────────────────────────────────────────────────────

async function apiFetch(url: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    if (token) window.dispatchEvent(new CustomEvent('llano:session-expired'));
    throw new Error('Unauthorized');
  }
  return res;
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center items-center py-16">
      <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StockBadge({ available, min }: { available: number; min: number }) {
  if (available <= 0)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        Out of Stock
      </span>
    );
  if (available <= min)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
        Low Stock
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      In Stock
    </span>
  );
}

function BOStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    REFUNDED: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Stock on Hand Tab ────────────────────────────────────────────────────────

function StockOnHand({ isAdmin, showToast }: { isAdmin: boolean; showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Adjust modal
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'>('ADJUSTMENT_IN');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editMinLevel, setEditMinLevel] = useState('');
  const [editing, setEditing] = useState(false);

  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/products');
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts((Array.isArray(data) ? data : data.products ?? []).map((p: any) => ({
        id: p.id, sku: p.sku, name: p.name, unitPrice: p.sellingPrice,
        stockOnHand: p.stock, reservedQty: p.reservedStock, availableQty: p.availableStock,
        quarantineQty: p.quarantineStock, minStockLevel: p.minStock, isActive: p.isActive,
      })));
    } catch (e: any) {
      showToast(e.message ?? 'Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      products.filter(
        p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      )
    );
  }, [search, products]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiFetch('/api/inventory/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Export downloaded successfully', 'success');
    } catch (e: any) {
      showToast(e.message ?? 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const openAdjust = (p: Product) => {
    setAdjustTarget(p);
    setAdjustType('ADJUSTMENT_IN');
    setAdjustQty('');
    setAdjustReason('');
  };

  const submitAdjust = async () => {
    if (!adjustTarget) return;
    if (!adjustQty || Number(adjustQty) <= 0) { showToast('Enter a valid quantity', 'error'); return; }
    if (!adjustReason.trim()) { showToast('Reason is required', 'error'); return; }
    setAdjusting(true);
    try {
      const change = Number(adjustQty) * (adjustType === 'ADJUSTMENT_IN' ? 1 : -1);
      const res = await apiFetch('/api/products/adjust', {
        method: 'POST',
        body: JSON.stringify({ productId: adjustTarget.id, newPhysicalStock: adjustTarget.stockOnHand + change, reason: adjustReason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Adjustment failed');
      }
      showToast('Stock adjusted successfully', 'success');
      setAdjustTarget(null);
      load();
    } catch (e: any) {
      showToast(e.message ?? 'Adjustment failed', 'error');
    } finally {
      setAdjusting(false);
    }
  };

  const openEdit = (p: Product) => {
    setEditTarget(p);
    setEditPrice(String(p.unitPrice));
    setEditMinLevel(String(p.minStockLevel));
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    if (!editPrice || isNaN(Number(editPrice)) || Number(editPrice) < 0) { showToast('Enter a valid price', 'error'); return; }
    if (!editMinLevel || isNaN(Number(editMinLevel)) || Number(editMinLevel) < 0) { showToast('Enter a valid min stock level', 'error'); return; }
    setEditing(true);
    try {
      const res = await apiFetch(`/api/products/${editTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({ sellingPrice: Number(editPrice), minStock: Number(editMinLevel) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Update failed');
      }
      showToast('Product updated successfully', 'success');
      setEditTarget(null);
      load();
    } catch (e: any) {
      showToast(e.message ?? 'Update failed', 'error');
    } finally {
      setEditing(false);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by product name or SKU…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60"
        >
          {exporting ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m-4-4l4 4 4-4" />
            </svg>
          )}
          Export to Excel
        </button>
      </div>

      {loading ? <Spinner /> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-rose-50 text-rose-800 text-xs uppercase tracking-wide">
              <tr>
                {['SKU', 'Product Name', 'Unit Price', 'On Hand', 'Reserved', 'Available', 'Quarantine', 'Min Level', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-gray-400">No products found.</td></tr>
              ) : filtered.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white hover:bg-rose-50/40' : 'bg-gray-50/50 hover:bg-rose-50/40'}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-700">{formatPeso(p.unitPrice)}</td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums">{p.stockOnHand}</td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums">{p.reservedQty}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{p.availableQty}</td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums">{p.quarantineQty}</td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums">{p.minStockLevel}</td>
                  <td className="px-4 py-3">
                    <StockBadge available={p.availableQty} min={p.minStockLevel} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:border-rose-400 hover:text-rose-700 text-gray-600 font-medium transition"
                      >
                        Edit
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => openAdjust(p)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium transition"
                        >
                          Adjust
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustTarget && (
        <Modal title={`Adjust Stock — ${adjustTarget.name}`} onClose={() => setAdjustTarget(null)}>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">Current On Hand: <strong>{adjustTarget.stockOnHand}</strong></p>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <div className="flex gap-4">
                {(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'] as const).map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="adjustType"
                      value={t}
                      checked={adjustType === t}
                      onChange={() => setAdjustType(t)}
                      className="accent-rose-600"
                    />
                    {t === 'ADJUSTMENT_IN' ? 'In (+)' : 'Out (-)'}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                value={adjustQty}
                onChange={e => setAdjustQty(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Enter quantity"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="e.g. Physical count correction"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAdjustTarget(null)}
                className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitAdjust}
                disabled={adjusting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-2 text-sm font-semibold transition disabled:opacity-60"
              >
                {adjusting ? 'Saving…' : 'Submit Adjustment'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <Modal title={`Edit — ${editTarget.name}`} onClose={() => setEditTarget(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₱)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={editPrice}
                onChange={e => setEditPrice(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
              <input
                type="number"
                min={0}
                value={editMinLevel}
                onChange={e => setEditMinLevel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitEdit}
                disabled={editing}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-2 text-sm font-semibold transition disabled:opacity-60"
              >
                {editing ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Stock Movements Tab ──────────────────────────────────────────────────────

function StockMovements({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 50;

  // Filters
  const [products, setProducts] = useState<{ id: string; name: string; sku: string }[]>([]);
  const [filterProduct, setFilterProduct] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    apiFetch('/api/products')
      .then(r => r.json())
      .then(d => setProducts((Array.isArray(d) ? d : d.products ?? []).map((x: any) => ({ id: x.id, name: x.name, sku: x.sku }))))
      .catch(() => {});
  }, []);

  const load = useCallback(async (p: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProduct) params.set('productId', filterProduct);
      if (filterType) params.set('movementType', filterType);
      if (filterDate) {
        params.set('dateFrom', filterDate);
        params.set('dateTo', filterDate);
      }
      params.set('page', String(p));
      params.set('limit', String(limit));
      const res = await apiFetch(`/api/inventory/ledger?${params}`);
      if (!res.ok) throw new Error('Failed to load ledger');
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.entries ?? [];
      setEntries(rows.map((e: any) => ({
        id: e.id, createdAt: e.createdAt, type: e.movementType ?? e.type,
        qty: e.changeQty ?? e.qty,
        balanceBefore: (e.runningSaleable ?? 0) - (e.changeQty ?? 0),
        balanceAfter: e.runningSaleable ?? e.balanceAfter,
        reference: e.reference, notes: e.notes,
        product: { name: e.productName ?? e.product?.name, sku: e.productId ?? e.product?.sku },
      })));
      setTotal(Array.isArray(data) ? rows.length : data.total ?? rows.length);
      setPage(p);
    } catch (e: any) {
      showToast(e.message ?? 'Failed to load ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterProduct, filterType, filterDate, showToast]);

  useEffect(() => { load(1); }, []);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const qtyColor = (qty: number) => qty >= 0 ? 'text-green-600' : 'text-red-600';
  const qtyPrefix = (qty: number) => qty >= 0 ? `+${qty}` : `${qty}`;

  return (
    <div>
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <select
          value={filterProduct}
          onChange={e => setFilterProduct(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
        >
          <option value="">All Products</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.sku} – {p.name}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
        >
          <option value="">All Types</option>
          {MOVEMENT_TYPES.map(t => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <label className="text-xs font-medium text-gray-600">
          Filter by date
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </label>
        <button
          onClick={() => load(1)}
          className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          Search
        </button>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-rose-50 text-rose-800 text-xs uppercase tracking-wide">
                <tr>
                  {['Date / Time', 'Product', 'Type', 'Qty Change', 'Balance Before', 'Balance After', 'Reference', 'Notes'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {entries.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">No movements found.</td></tr>
                ) : entries.map((e, i) => (
                  <tr key={e.id} className={i % 2 === 0 ? 'bg-white hover:bg-rose-50/40' : 'bg-gray-50/50 hover:bg-rose-50/40'}>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{formatDateTime(e.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{e.product.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{e.product.sku}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        {e.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-bold tabular-nums ${qtyColor(e.qty)}`}>
                      {qtyPrefix(e.qty)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700">{e.balanceBefore}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-gray-800">{e.balanceAfter}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{e.reference ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{e.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Showing {entries.length} of {total} entries
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Damaged / BO Tab ─────────────────────────────────────────────────────────

function DamagedBO({ isAdmin, showToast }: { isAdmin: boolean; showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void }) {
  const [records, setRecords] = useState<BORecord[]>([]);
  const [customers, setCustomers] = useState<{ id: string; storeName: string; area: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sku: string; category: string; sellingPrice: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState({ customerId: '', productId: '', quantity: 1, reason: '', disposition: 'Pending', notes: '' });
  const [dispositionTarget, setDispositionTarget] = useState<BORecord | null>(null);
  const [dispositionForm, setDispositionForm] = useState({ disposition: 'Pending', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/inventory/bo');
      if (!res.ok) throw new Error('Failed to load BO records');
      const data = await res.json();
      setRecords((data.records ?? []).map((r: any) => ({
        id: r.id, storeName: r.storeName || '—', product: { name: r.productName, sku: r.productId }, qty: r.quantity,
        totalDeduction: Number(r.totalDeduction) || 0, reason: r.reason, status: r.disposition === 'Refunded' ? 'REFUNDED' : 'PENDING',
        createdAt: r.createdAt, disposition: r.disposition, dispositionNotes: r.notes,
      })));
    } catch (e: any) {
      showToast(e.message ?? 'Failed to load BO records', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/customers?status=Active').then(async res => {
        if (!res.ok) throw new Error('Could not load customers');
        return res.json();
      }),
      apiFetch('/api/products').then(async res => {
        if (!res.ok) throw new Error('Could not load products');
        return res.json();
      }),
    ]).then(([customerRows, productRows]) => {
      setCustomers((Array.isArray(customerRows) ? customerRows : []).map((c: any) => ({ id: c.id, storeName: c.storeName, area: c.area })));
      setProducts((Array.isArray(productRows) ? productRows : []).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku || p.id, category: p.category, sellingPrice: Number(p.sellingPrice) || 0 })));
    }).catch((e: any) => showToast(e.message || 'Could not load customer and product choices', 'error'));
  }, [showToast]);

  const selectedProduct = products.find(p => p.id === addForm.productId);
  const manualBoTotal = (Number(addForm.quantity) || 0) * (selectedProduct?.sellingPrice || 0);

  const submitManualBO = async () => {
    if (!addForm.customerId || !addForm.productId || !addForm.reason.trim() || !Number.isInteger(Number(addForm.quantity)) || Number(addForm.quantity) < 1) {
      showToast('Choose a store and product, enter a whole-number quantity, and add a reason.', 'warning');
      return;
    }
    if (addForm.disposition === 'Refunded' && !addForm.notes.trim()) {
      showToast('Add refund or credit details before marking the BO as refunded.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/inventory/bo', {
        method: 'POST',
        body: JSON.stringify({ ...addForm, quantity: Number(addForm.quantity) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Could not record BO');
      }
      showToast(`BO recorded (${formatPeso(manualBoTotal)}) and added to quarantine stock`, 'success');
      setShowAddForm(false);
      setAddForm({ customerId: '', productId: '', quantity: 1, reason: '', disposition: 'Pending', notes: '' });
      await load();
    } catch (e: any) {
      showToast(e.message || 'Could not record BO', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitDisposition = async () => {
    if (!dispositionTarget) return;
    if (dispositionForm.disposition === 'Refunded' && !dispositionForm.notes.trim() && !dispositionTarget.dispositionNotes) {
      showToast('Add refund or credit details before marking the BO as refunded.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(`/api/inventory/bo/${dispositionTarget.id}/disposition`, {
        method: 'POST',
        body: JSON.stringify({ disposition: dispositionForm.disposition, notes: dispositionForm.notes.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Could not update BO status');
      }
      showToast(`BO status updated to ${dispositionForm.disposition.toLowerCase()}`, 'success');
      setDispositionTarget(null);
      await load();
    } catch (e: any) {
      showToast(e.message ?? 'Could not update BO status', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {isAdmin && <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div><h3 className="font-semibold text-gray-800">Customer BO &amp; damaged returns</h3><p className="text-xs text-gray-500 mt-1">Delivery BOs appear here immediately and are added to quarantine stock at route reconciliation. Manual BO entries update quarantine stock now.</p></div>
        <button type="button" onClick={() => setShowAddForm(true)} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">+ Add Customer BO</button>
      </div>}
      {loading ? <Spinner /> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-rose-50 text-rose-800 text-xs uppercase tracking-wide">
              <tr>
                {['Date', 'Customer / Store', 'Product', 'Qty', 'BO Total', 'Reason / Type', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {records.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">No BO / damaged records found.</td></tr>
              ) : records.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? 'bg-white hover:bg-rose-50/40' : 'bg-gray-50/50 hover:bg-rose-50/40'}>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-700">{r.storeName}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{r.product.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{r.product.sku}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-gray-800">{r.qty}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-gray-800 whitespace-nowrap">{formatPeso(r.totalDeduction)}</td>
                  <td className="px-4 py-3 text-gray-600">{r.reason}</td>
                  <td className="px-4 py-3">
                    <BOStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && (
                      <button
                        onClick={() => { setDispositionTarget(r); setDispositionForm({ disposition: r.disposition || 'Pending', notes: '' }); }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium transition"
                      >
                        Update
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddForm && (
        <Modal title="Add Customer BO" onClose={() => !saving && setShowAddForm(false)}>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Customer / Store
              <select value={addForm.customerId} onChange={e => setAddForm({ ...addForm, customerId: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">Select store</option>{customers.map(c => <option key={c.id} value={c.id}>{c.storeName} · {c.area}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">Product
              <select value={addForm.productId} onChange={e => setAddForm({ ...addForm, productId: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">Select product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} · {formatPeso(p.sellingPrice)}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-gray-700">Quantity
                <input type="number" min={1} step={1} value={addForm.quantity} onChange={e => setAddForm({ ...addForm, quantity: Number(e.target.value) || 0 })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-gray-700"><span className="block text-xs text-gray-500">Customer BO total</span><strong>{formatPeso(manualBoTotal)}</strong></div>
            </div>
            <label className="block text-sm font-medium text-gray-700">Reason
              <input value={addForm.reason} onChange={e => setAddForm({ ...addForm, reason: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Damaged, melted, or refused product" />
            </label>
            <label className="block text-sm font-medium text-gray-700">Refund status
              <select value={addForm.disposition} onChange={e => setAddForm({ ...addForm, disposition: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="Pending">Pending</option><option value="Refunded">Refunded by SELECTA</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">Refund / credit details {addForm.disposition === 'Refunded' && <span className="text-red-500">*</span>}
              <textarea value={addForm.notes} onChange={e => setAddForm({ ...addForm, notes: e.target.value })} rows={2} className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Reference or note for the customer history" />
            </label>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowAddForm(false)} disabled={saving} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={submitManualBO} disabled={saving} className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{saving ? 'Saving…' : 'Add BO to Inventory'}</button>
            </div>
          </div>
        </Modal>
      )}

      {dispositionTarget && (
        <Modal title={`Update BO — ${dispositionTarget.product.name}`} onClose={() => !saving && setDispositionTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{dispositionTarget.storeName} · Qty: <strong>{dispositionTarget.qty}</strong> · BO total: <strong>{formatPeso(dispositionTarget.totalDeduction)}</strong></p>
            <label className="block text-sm font-medium text-gray-700">Status
              <select value={dispositionForm.disposition} onChange={e => setDispositionForm({ ...dispositionForm, disposition: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="Pending">Pending</option><option value="Refunded">Refunded by SELECTA</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">Refund / status note {dispositionForm.disposition === 'Refunded' && !dispositionTarget.dispositionNotes && <span className="text-red-500">*</span>}
              <textarea value={dispositionForm.notes} onChange={e => setDispositionForm({ ...dispositionForm, notes: e.target.value })} rows={3} className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Add refund reference or status note" />
            </label>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setDispositionTarget(null)} disabled={saving} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={submitDisposition} disabled={saving} className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save Status'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Low Stock Tab ────────────────────────────────────────────────────────────

function LowStock({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [products, setProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/api/inventory/low-stock');
        if (!res.ok) throw new Error('Failed to load low stock data');
        const data = await res.json();
        const sorted = (Array.isArray(data) ? data : data.products ?? []).map((p: any) => ({
          id: p.id, name: p.name, sku: p.sku, stockOnHand: p.stock,
          minStockLevel: p.minStock, deficit: p.deficit,
        })).sort((a: LowStockProduct, b: LowStockProduct) => b.deficit - a.deficit);
        setProducts(sorted);
      } catch (e: any) {
        showToast(e.message ?? 'Failed to load low stock data', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  return (
    <div>
      {/* Alert Banner */}
      {!loading && products.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-4">
          <svg className="w-5 h-5 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-sm font-semibold">
            {products.length} product{products.length !== 1 ? 's are' : ' is'} below minimum stock level.
          </p>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-rose-50 text-rose-800 text-xs uppercase tracking-wide">
              <tr>
                {['SKU', 'Product', 'Current Stock', 'Min Level', 'Deficit'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {products.length === 0 ? (
                <tr>
                    <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <svg className="w-10 h-10 text-green-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-green-600">All products are well stocked!</span>
                    </div>
                  </td>
                </tr>
              ) : products.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white hover:bg-rose-50/40' : 'bg-gray-50/50 hover:bg-rose-50/40'}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-red-600">{p.stockOnHand}</td>
                  <td className="px-4 py-3 tabular-nums text-gray-700">{p.minStockLevel}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                      -{p.deficit}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Inventory() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('stock');

  const tabs: { id: SubTab; label: string }[] = [
    { id: 'stock', label: 'Stock on Hand' },
    { id: 'movements', label: 'Stock Movements' },
    { id: 'damaged', label: 'Damaged / BO' },
    { id: 'lowstock', label: 'Low Stock' },
  ];

  return (
    <div className="p-4 sm:p-6 min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500 mt-1">Manage stock levels, movements, and damaged goods for Llano Selecta.</p>
      </div>

      {/* Sub-tab Bar */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 min-w-max px-4 py-2 text-sm font-semibold rounded-lg transition whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        {activeSubTab === 'stock' && (
          <StockOnHand isAdmin={isAdmin} showToast={showToast} />
        )}
        {activeSubTab === 'movements' && (
          <StockMovements showToast={showToast} />
        )}
        {activeSubTab === 'damaged' && (
          <DamagedBO isAdmin={isAdmin} showToast={showToast} />
        )}
        {activeSubTab === 'lowstock' && (
          <LowStock showToast={showToast} />
        )}
      </div>
    </div>
  );
}
