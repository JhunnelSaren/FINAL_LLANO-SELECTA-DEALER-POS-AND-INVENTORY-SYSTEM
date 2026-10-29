import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Package, Truck, Plus, Download, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { apiRequest } from '../utils/api';
import { formatPeso, formatDate, getStatusColor } from '../utils/formatters';
import type { Booking, Product, Customer, StockReceiving, DeliveryRun } from '../types';

const subTabs = [
  { id: 'bookings', label: 'Bookings', icon: ClipboardList },
  { id: 'receiving', label: 'Stock Receiving', icon: Package },
  { id: 'prepare', label: 'Prepare & Load', icon: Truck },
  { id: 'delivery', label: 'Delivery', icon: Truck },
] as const;
type SubTab = typeof subTabs[number]['id'];

// â”€â”€â”€ BOOKINGS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BookingsTab() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [fArea, setFArea] = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [fSearch, setFSearch] = useState('');
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formBooker, setFormBooker] = useState(user?.name || '');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<{ productId: string; quantity: number; category: string }[]>([{ productId: '', quantity: 1, category: '' }]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fArea !== 'all') params.set('area', fArea);
      if (fStatus !== 'all') params.set('status', fStatus);
      if (fSearch) params.set('search', fSearch);
      const data = await apiRequest<any>(`/bookings?${params}`);
      setBookings(Array.isArray(data) ? data : []);
    } catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [fArea, fStatus, fSearch]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    Promise.all([
      apiRequest<any>('/products').then(r => setProducts(Array.isArray(r) ? r : r.products || [])),
      apiRequest<any>('/customers').then(r => setCustomers(Array.isArray(r) ? r : r.customers || [])),
    ]).catch(() => {});
  }, []);

  const handleSubmitBooking = async () => {
    if (!formCustomerId) { showToast('Select a customer', 'warning'); return; }
    const validItems = formItems.filter(i => i.productId && i.quantity > 0);
    if (validItems.length === 0) { showToast('Add at least one product line', 'warning'); return; }
    setSubmitting(true);
    try {
      await apiRequest('/bookings', {
        method: 'POST',
      body: JSON.stringify({ customerId: formCustomerId, area: formArea, bookingDate: new Date().toISOString(), bookerName: formBooker, notes: formNotes, items: validItems }),
      });
      showToast('Booking created successfully!');
      setShowForm(false); setFormItems([{ productId: '', quantity: 1, category: '' }]); setFormCustomerId(''); setFormArea(''); setFormNotes('');
      loadData();
    } catch (e: any) { showToast(e.message, 'error'); }
    setSubmitting(false);
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('llano_token');
      const params = new URLSearchParams();
      if (fArea !== 'all') params.set('area', fArea);
      if (fStatus !== 'all') params.set('status', fStatus);
      const res = await fetch(`/api/bookings/export?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'bookings_export.xlsx'; a.click(); URL.revokeObjectURL(url);
      showToast('Bookings exported!');
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleConsolidated = async () => {
    try {
      const params = new URLSearchParams();
      if (fArea !== 'all') params.set('area', fArea);
      if (fStatus !== 'all') params.set('status', fStatus);
      const data = await apiRequest<any>(`/bookings/consolidated?${params}`);
      setSummaryData(data); setShowSummary(true);
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const grandTotal = bookings.reduce((s, b) => s + b.subtotal, 0);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-end">
        <div><label className="block text-xs font-semibold text-slate-600 mb-1">Area</label><select value={fArea} onChange={e => setFArea(e.target.value)} className="border rounded-lg px-3 py-2 text-sm"><option value="all">All Areas</option><option>Valencia</option><option>Cabanglasan</option><option>San Fernando</option></select></div>
        <div><label className="block text-xs font-semibold text-slate-600 mb-1">Status</label><select value={fStatus} onChange={e => setFStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm"><option value="all">All</option><option value="Booked">Booked</option><option value="Prepared">Prepared</option><option value="In Transit">In Transit</option><option value="Delivered">Delivered</option><option value="Backload">Backload</option><option value="Cancelled">Cancelled</option></select></div>
        <div className="flex-1 min-w-[180px]"><label className="block text-xs font-semibold text-slate-600 mb-1">Search</label><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input type="text" value={fSearch} onChange={e => setFSearch(e.target.value)} placeholder="Booking #, store..." className="pl-9 w-full border rounded-lg px-3 py-2 text-sm" /></div></div>
        <button onClick={loadData} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-700"><Search className="inline h-4 w-4 mr-1" />Filter</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowForm(true)} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-700 flex items-center gap-2"><Plus className="h-4 w-4" />New Booking</button>
        <button onClick={handleExport} className="bg-white border text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 flex items-center gap-2"><Download className="h-4 w-4" />Export Excel</button>
        <button onClick={handleConsolidated} className="bg-white border text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50">Summary</button>
      </div>
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b"><tr><th className="text-left px-4 py-3 font-semibold text-slate-600">Booking #</th><th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th><th className="text-left px-4 py-3 font-semibold text-slate-600">Area</th><th className="text-left px-4 py-3 font-semibold text-slate-600">Store</th><th className="text-left px-4 py-3 font-semibold text-slate-600">Booker</th><th className="text-right px-4 py-3 font-semibold text-slate-600">Items</th><th className="text-right px-4 py-3 font-semibold text-slate-600">Total</th><th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr> : bookings.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No bookings found</td></tr> : bookings.map(b => (
              <tr key={b.id} className="border-b hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-rose-700">{b.bookingNumber}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(b.bookingDate)}</td>
                <td className="px-4 py-3 text-slate-600">{b.area}</td>
                <td className="px-4 py-3 font-medium">{b.storeName}</td>
                <td className="px-4 py-3 text-slate-600">{b.bookerName}</td>
                <td className="px-4 py-3 text-right">{b.items?.length || 0}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatPeso(b.subtotal)}</td>
                <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(b.status)}`}>{b.status}</span></td>
              </tr>
            ))}
          </tbody>
          {bookings.length > 0 && <tfoot className="bg-slate-50 border-t"><tr><td colSpan={6} className="px-4 py-3 text-right font-semibold text-slate-600">{bookings.length} booking(s) — Grand Total:</td><td className="px-4 py-3 text-right font-bold text-rose-700">{formatPeso(grandTotal)}</td><td /></tr></tfoot>}
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between"><h3 className="text-lg font-bold text-slate-800">New Booking</h3><button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Customer / Store *</label><select value={formCustomerId} onChange={e => setFormCustomerId(e.target.value)} disabled={!formArea} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-slate-100"><option value="">Select store</option>{customers.filter(c => c.area === formArea && c.status === "Active").map(c => <option key={c.id} value={c.id}>{c.storeName} · {c.subArea || c.purok || c.area}</option>)}</select></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Area *</label><select value={formArea} onChange={e => { setFormArea(e.target.value); setFormCustomerId(''); }} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="">Select area</option><option>Valencia</option><option>Cabanglasan</option><option>San Fernando</option></select></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Booker</label><input type="text" value={formBooker} onChange={e => setFormBooker(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Notes</label><input type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-2">Order Items</label>
                <table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="text-left px-3 py-2">Category</th><th className="text-left px-3 py-2">Flavor / Product</th><th className="text-left px-3 py-2 w-24">Qty</th><th className="text-right px-3 py-2 w-28">Price</th><th className="text-right px-3 py-2 w-28">Subtotal</th><th className="w-10" /></tr></thead>
                  <tbody>{formItems.map((item, idx) => {
                    const prod = products.find(p => p.id === item.productId);
                    const price = prod?.sellingPrice || 0;
                    return (<tr key={idx} className="border-b">
                      <td className="px-3 py-2"><select value={item.category} onChange={e => { const ni = [...formItems]; ni[idx] = { ...ni[idx], category: e.target.value, productId: "" }; setFormItems(ni); }} className="w-full border rounded px-2 py-1 text-sm"><option value="">Select category</option>{[...new Set(products.map(p => p.category))].sort().map(category => <option key={category}>{category}</option>)}</select></td><td className="px-3 py-2"><select value={item.productId} onChange={e => { const ni = [...formItems]; ni[idx].productId = e.target.value; setFormItems(ni); }} className="w-full border rounded px-2 py-1 text-sm" disabled={!item.category}><option value="">Select flavor</option>{products.filter(p => p.category === item.category && p.isActive !== false).map(p => <option key={p.id} value={p.id}>{p.flavor || p.name} ({p.sku})</option>)}</select></td>
                      <td className="px-3 py-2"><input type="number" min={1} value={item.quantity} onChange={e => { const ni = [...formItems]; ni[idx].quantity = parseInt(e.target.value) || 0; setFormItems(ni); }} className="w-full border rounded px-2 py-1 text-sm text-right" /></td>
                      <td className="px-3 py-2 text-right text-slate-600">{formatPeso(price)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatPeso(price * item.quantity)}</td>
                      <td className="px-3 py-2">{formItems.length > 1 && <button onClick={() => setFormItems(formItems.filter((_, i) => i !== idx))} className="text-rose-500"><X className="h-4 w-4" /></button>}</td>
                    </tr>);
                  })}</tbody>
                </table>
                <button onClick={() => setFormItems([...formItems, { productId: '', quantity: 1, category: '' }])} className="mt-2 text-sm text-rose-600 font-semibold hover:underline">+ Add Line</button>
              </div>
              <div className="text-right text-lg font-bold text-rose-700">Total: {formatPeso(formItems.reduce((s, item) => { const p = products.find(x => x.id === item.productId); return s + (p?.sellingPrice || 0) * item.quantity; }, 0))}</div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold">Cancel</button>
              <button onClick={handleSubmitBooking} disabled={submitting} className="px-6 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{submitting ? 'Saving...' : 'Create Booking'}</button>
            </div>
          </div>
        </div>
      )}

      {showSummary && summaryData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSummary(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between"><h3 className="text-lg font-bold">Consolidated Summary</h3><button onClick={() => setShowSummary(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
            <div className="p-6">
              <div className="flex gap-4 mb-4">
                <div className="bg-rose-50 px-4 py-3 rounded-lg border border-rose-200 text-center flex-1"><div className="text-2xl font-bold text-rose-700">{summaryData.totalBookings}</div><div className="text-xs text-rose-600">Bookings</div></div>
                <div className="bg-blue-50 px-4 py-3 rounded-lg border border-blue-200 text-center flex-1"><div className="text-2xl font-bold text-blue-700">{summaryData.grandTotalQuantity}</div><div className="text-xs text-blue-600">Units</div></div>
                <div className="bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-200 text-center flex-1"><div className="text-2xl font-bold text-emerald-700">{formatPeso(summaryData.grandTotalAmount)}</div><div className="text-xs text-emerald-600">Total</div></div>
              </div>
              <table className="w-full text-sm"><thead className="bg-slate-50 border-b"><tr><th className="text-left px-4 py-2">Product</th><th className="text-right px-4 py-2">Qty</th><th className="text-right px-4 py-2">Stores</th><th className="text-right px-4 py-2">Amount</th></tr></thead>
                <tbody>{(summaryData.summary || []).map((s: any, i: number) => (<tr key={i} className="border-b"><td className="px-4 py-2 font-medium">{s.productName}</td><td className="px-4 py-2 text-right">{s.totalQuantity}</td><td className="px-4 py-2 text-right">{s.storesCount}</td><td className="px-4 py-2 text-right font-semibold">{formatPeso(s.totalAmount)}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ BODEGA ORDER TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StockReceivingTab() {
  const { showToast } = useToast();
  const [records, setRecords] = useState<StockReceiving[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [poNumber, setPoNumber] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [checkerName, setCheckerName] = useState('');
  const [receivedAt, setReceivedAt] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ productId: string; expectedQty: number; receivedGoodQty: number; damagedMeltedQty: number; missingQty: number; notes: string }[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [receiving, catalog] = await Promise.all([apiRequest<any>('/receiving'), apiRequest<any>('/products')]);
      setRecords(Array.isArray(receiving) ? receiving : receiving.records || []);
      setProducts(Array.isArray(catalog) ? catalog : catalog.products || []);
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [showToast]);
  useEffect(() => { loadData(); }, [loadData]);

  const addProduct = (productId: string) => {
    if (!productId || items.some(item => item.productId === productId)) return;
    setItems([...items, { productId, expectedQty: 0, receivedGoodQty: 0, damagedMeltedQty: 0, missingQty: 0, notes: '' }]);
  };

  const handleSubmit = async () => {
    if (!poNumber.trim() || !truckPlate.trim() || !receiptPhoto) { showToast('Enter the receipt reference and van details, and attach a photo of the receipt.', 'warning'); return; }
    if (!items.length || items.some(item => item.receivedGoodQty + item.damagedMeltedQty + item.missingQty <= 0)) { showToast('Add products and enter the quantities received.', 'warning'); return; }
    setSubmitting(true);
    const body = new FormData();
    body.append('poNumber', poNumber.trim());
    body.append('truckPlate', truckPlate.trim());
    body.append('receiverName', receiverName.trim());
    body.append('checkerName', checkerName.trim());
    body.append('arrivalDate', new Date(receivedAt).toISOString());
    body.append('remarks', notes);
    body.append('items', JSON.stringify(items));
    body.append('receiptPhoto', receiptPhoto);
    try {
      await apiRequest('/receiving', { method: 'POST', body });
      showToast('Stock received and added to inventory.');
      setShowForm(false); setPoNumber(''); setTruckPlate(''); setReceiverName(''); setCheckerName(''); setNotes(''); setItems([]); setReceiptPhoto(null);
      await loadData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  return <div className="space-y-4">
    <div className="flex justify-between items-center"><h3 className="text-sm font-semibold text-slate-600">{records.length} stock receipt(s)</h3><button onClick={() => setShowForm(true)} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-700 flex items-center gap-2"><Plus className="h-4 w-4" />Receive Freezer Van Stock</button></div>
    <div className="bg-white rounded-xl border overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 border-b"><tr><th className="text-left px-4 py-3">Receipt #</th><th className="text-left px-4 py-3">Received</th><th className="text-left px-4 py-3">Van</th><th className="text-left px-4 py-3">Receiver</th><th className="text-right px-4 py-3">Value</th><th className="text-center px-4 py-3">Receipt</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr> : records.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No receiving history</td></tr> : records.map(record => <tr key={record.id} className="border-b"><td className="px-4 py-3 font-medium text-rose-700">{record.poNumber}</td><td className="px-4 py-3">{formatDate(record.arrivalDate)} {new Date(record.arrivalDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td><td className="px-4 py-3">{record.truckPlate}</td><td className="px-4 py-3">{record.receiverName}</td><td className="px-4 py-3 text-right font-semibold">{formatPeso(record.totalReceivedValue)}</td><td className="px-4 py-3 text-center">{record.receiptPhotoPath ? <a href={record.receiptPhotoPath} target="_blank" rel="noreferrer" className="text-rose-600 underline">View</a> : '—'}</td></tr>)}</tbody></table></div>
    {showForm && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}><div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="px-6 py-4 border-b flex justify-between"><h3 className="text-lg font-bold">Receive Freezer Van Stock</h3><button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
      <div className="p-6 space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-semibold mb-1">Receipt / Supplier Reference *</label><input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm font-semibold mb-1">Freezer Van / Plate *</label><input value={truckPlate} onChange={e => setTruckPlate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Freezer van or plate number" /></div>
        <div><label className="block text-sm font-semibold mb-1">Date and Time Received *</label><input type="datetime-local" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm font-semibold mb-1">Received By</label><input value={receiverName} onChange={e => setReceiverName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm font-semibold mb-1">Checked By</label><input value={checkerName} onChange={e => setCheckerName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm font-semibold mb-1">Receipt Photo *</label><input type="file" accept="image/*,.pdf" onChange={e => setReceiptPhoto(e.target.files?.[0] ?? null)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
      </div>
      <div className="flex items-center justify-between"><label className="block text-sm font-semibold">Products Received</label><select value="" onChange={e => addProduct(e.target.value)} className="border rounded-lg px-3 py-2 text-sm"><option value="">+ Add product</option>{products.filter(product => !items.some(item => item.productId === product.id)).map(product => <option key={product.id} value={product.id}>{product.category} · {product.flavor || product.name}</option>)}</select></div>
      {items.length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="text-left px-2 py-2">Product</th><th className="px-2 py-2">Expected</th><th className="px-2 py-2">Good</th><th className="px-2 py-2">Damaged</th><th className="px-2 py-2">Missing</th><th /></tr></thead><tbody>{items.map((item, index) => { const product = products.find(p => p.id === item.productId)!; return <tr key={item.productId} className="border-b"><td className="px-2 py-2">{product.category} · {product.flavor || product.name}</td>{(['expectedQty', 'receivedGoodQty', 'damagedMeltedQty', 'missingQty'] as const).map(key => <td key={key} className="px-2 py-2"><input type="number" min={0} value={item[key]} onChange={e => { const updated = [...items]; updated[index] = { ...item, [key]: Number(e.target.value) || 0 }; setItems(updated); }} className="w-20 border rounded px-2 py-1 text-right" /></td>)}<td><button onClick={() => setItems(items.filter(line => line.productId !== item.productId))} className="text-rose-500"><X className="h-4 w-4" /></button></td></tr>; })}</tbody></table></div>}
      <div><label className="block text-sm font-semibold mb-1">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" /></div></div>
      <div className="px-6 py-4 border-t flex justify-end gap-3"><button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="px-6 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{submitting ? 'Receiving...' : 'Save Receipt and Add to Inventory'}</button></div>
    </div></div>}
  </div>;
}
function PrepareLoadTab() {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [area, setArea] = useState('');
  const [driver, setDriver] = useState('');
  const [loader1, setLoader1] = useState('');
  const [loader2, setLoader2] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: 'Booked' });
      if (area) params.set('area', area);
      const [bookingsResponse, runsResponse] = await Promise.all([apiRequest<any>(`/bookings?${params}`), apiRequest<any>('/delivery')]);
      setBookings(Array.isArray(bookingsResponse) ? bookingsResponse : []);
      setRuns(Array.isArray(runsResponse) ? runsResponse : runsResponse.runs || []);
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [area, showToast]);
  useEffect(() => { loadData(); }, [loadData]);

  const toggleBooking = (id: string) => setSelectedBookings(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  const handleCreateRun = async () => {
    if (!area) { showToast('Select an area first', 'warning'); return; }
    if (!selectedBookings.length) { showToast('Select at least one booking in this area', 'warning'); return; }
    if (!driver.trim() || !loader1.trim() || !loader2.trim()) { showToast('Enter the driver and both loaders', 'warning'); return; }
    setSubmitting(true);
    try {
      await apiRequest('/delivery', { method: 'POST', body: JSON.stringify({ area, route: area, deliveryDate: new Date().toISOString(), driver, loader1, loader2, collector: driver, bookingIds: selectedBookings }) });
      showToast('Delivery run created with the selected area bookings.'); setShowForm(false); setSelectedBookings([]); setDriver(''); setLoader1(''); setLoader2(''); await loadData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };
  const handleDispatch = async (runId: string) => {
    if (!confirm('Dispatch this run? Stock will be reserved from inventory.')) return;
    try { await apiRequest(`/delivery/${runId}/dispatch`, { method: 'POST', body: JSON.stringify({}) }); showToast('Run dispatched.'); await loadData(); } catch (e: any) { showToast(e.message, 'error'); }
  };
  const readyRuns = runs.filter(run => run.status === 'Draft' || run.status === 'Prepared');

  return <div className="space-y-4">
    <div className="bg-white rounded-xl border p-4 flex flex-wrap items-end gap-3"><div><label className="block text-xs font-semibold text-slate-600 mb-1">Delivery area</label><select value={area} onChange={e => { setArea(e.target.value); setSelectedBookings([]); }} className="border rounded-lg px-3 py-2 text-sm"><option value="">Select area</option><option>Valencia</option><option>Cabanglasan</option><option>San Fernando</option></select></div><div className="flex-1 text-sm text-slate-600">{bookings.length} unassigned booking(s) {area ? `for ${area}` : ''}</div><button disabled={!area} onClick={() => setShowForm(true)} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"><Plus className="inline h-4 w-4 mr-1" />Create Delivery Run</button></div>
    <div className="bg-white rounded-xl border overflow-x-auto"><div className="px-4 py-3 border-b bg-slate-50 font-semibold text-sm">Bookings ready for a run{area ? ` · ${area}` : ''}</div><table className="w-full text-sm"><thead className="bg-slate-50 border-b"><tr><th className="px-4 py-2 w-10"><input type="checkbox" checked={bookings.length > 0 && selectedBookings.length === bookings.length} onChange={e => setSelectedBookings(e.target.checked ? bookings.map(b => b.id) : [])} /></th><th className="text-left px-4 py-2">Booking #</th><th className="text-left px-4 py-2">Store / Customer</th><th className="text-left px-4 py-2">Area · Lugar · Purok</th><th className="text-right px-4 py-2">Total</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading bookings…</td></tr> : bookings.length ? bookings.map(booking => <tr key={booking.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => toggleBooking(booking.id)}><td className="px-4 py-2"><input type="checkbox" checked={selectedBookings.includes(booking.id)} readOnly /></td><td className="px-4 py-2 font-medium text-rose-700">{booking.bookingNumber}</td><td className="px-4 py-2">{booking.storeName} · {booking.customer?.ownerName || ''}</td><td className="px-4 py-2">{[booking.area, booking.customer?.subArea, booking.customer?.purok].filter(Boolean).join(' · ')}</td><td className="px-4 py-2 text-right font-semibold">{formatPeso(booking.subtotal)}</td></tr>) : <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Select an area to see its booked stores and customers.</td></tr>}</tbody></table></div>
    {readyRuns.length > 0 && <div className="bg-white rounded-xl border"><div className="px-4 py-3 border-b bg-amber-50 font-semibold text-sm text-amber-800">Runs ready to dispatch</div>{readyRuns.map(run => <div key={run.id} className="px-4 py-3 border-b flex items-center justify-between"><div><span className="font-medium text-rose-700">{run.runNumber}</span><span className="ml-3 text-slate-600">{run.area || run.route} · {run.driver}</span><span className="ml-2 text-sm text-slate-500">({run.stops?.length || 0} stops)</span></div><button onClick={() => handleDispatch(run.id)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Dispatch</button></div>)}</div>}
    {showForm && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}><div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}><div className="px-6 py-4 border-b flex justify-between"><h3 className="text-lg font-bold">Create {area} Delivery Run</h3><button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-400" /></button></div><div className="p-6 space-y-4"><p className="text-sm text-slate-600">Selected: <strong>{selectedBookings.length}</strong> booking(s) in {area}</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="block text-sm font-semibold mb-1">Driver *</label><input value={driver} onChange={e => setDriver(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div><div><label className="block text-sm font-semibold mb-1">Loader 1 *</label><input value={loader1} onChange={e => setLoader1(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div><div><label className="block text-sm font-semibold mb-1">Loader 2 *</label><input value={loader2} onChange={e => setLoader2(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div></div></div><div className="px-6 py-4 border-t flex justify-end gap-3"><button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button><button onClick={handleCreateRun} disabled={submitting} className="px-6 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{submitting ? 'Creating…' : 'Create Run'}</button></div></div></div>}
  </div>;
}
function DeliveryTab() {
  const { showToast } = useToast();
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<DeliveryRun | null>(null);
  const [stopForm, setStopForm] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const loadData = useCallback(async () => { setLoading(true); try { const data = await apiRequest<any>('/delivery'); setRuns(Array.isArray(data) ? data : data.runs || []); } catch (e: any) { showToast(e.message, 'error'); } finally { setLoading(false); } }, [showToast]);
  useEffect(() => { loadData(); }, [loadData]);

  const handleRecordStop = async (stopId: string) => {
    if (!stopForm) return;
    setSubmitting(true);
    try {
      await apiRequest(`/delivery/stops/${stopId}/record`, { method: 'POST', body: JSON.stringify({ recipientName: stopForm.recipientName, paymentMethod: stopForm.paymentMethod, amountPaid: stopForm.amountPaid, paymentReference: stopForm.paymentReference, bankName: stopForm.bankName, checkDate: stopForm.checkDate, notes: stopForm.notes, items: stopForm.items.map((line: any) => ({ id: line.deliveryItemId, acceptedQty: line.acceptedQty, missingQty: line.missingQty, boRefusedQty: line.boQty })) }) });
      showToast('Delivery, shortages, bad orders, and payment saved.'); setStopForm(null); await loadData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };
  const markBackload = async (stopId: string) => {
    const reason = window.prompt('Why could the store not receive the delivery?', 'Store closed');
    if (!reason?.trim()) return;
    try { await apiRequest(`/delivery/stops/${stopId}/fail`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) }); showToast('Stop marked as failed; full load recorded as backload.'); await loadData(); } catch (e: any) { showToast(e.message, 'error'); }
  };

  return <div className="space-y-4"><div className="bg-white rounded-xl border overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 border-b"><tr><th className="text-left px-4 py-3">Run #</th><th className="text-left px-4 py-3">Area</th><th className="text-left px-4 py-3">Driver</th><th className="text-center px-4 py-3">Stops</th><th className="text-center px-4 py-3">Status</th><th className="text-center px-4 py-3">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr> : runs.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No delivery runs</td></tr> : runs.map(run => <tr key={run.id} className="border-b hover:bg-slate-50"><td className="px-4 py-3 font-medium text-rose-700">{run.runNumber}</td><td className="px-4 py-3">{run.area || run.route}</td><td className="px-4 py-3">{run.driver}</td><td className="px-4 py-3 text-center">{run.stops?.length || 0}</td><td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(run.status)}`}>{run.status}</span></td><td className="px-4 py-3 text-center"><button onClick={() => setSelectedRun(selectedRun?.id === run.id ? null : run)} className="text-rose-600 hover:underline text-sm font-semibold">{selectedRun?.id === run.id ? 'Hide stops' : 'Open stops'}</button></td></tr>)}</tbody></table></div>
  {selectedRun && <div className="bg-white rounded-xl border"><div className="px-4 py-3 border-b bg-slate-50"><h4 className="font-semibold">{selectedRun.area || selectedRun.route} · {selectedRun.runNumber}</h4></div>{selectedRun.stops?.map((stop, index) => <div key={stop.id} className="px-4 py-3 border-b"><div className="flex items-center justify-between gap-3"><div><span className="font-medium">#{index + 1}: {stop.storeName}</span><span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(stop.status)}`}>{stop.status}</span></div>{selectedRun.status === 'In Transit' && (stop.status === 'Pending' || stop.status === 'In Progress') && <div className="flex gap-2"><button onClick={() => setStopForm({ stopId: stop.id, recipientName: '', paymentMethod: 'Cash', amountPaid: 0, paymentReference: '', bankName: '', checkDate: '', notes: '', items: (stop.items || []).map(item => ({ deliveryItemId: item.id, acceptedQty: item.loadedQty, missingQty: 0, boQty: 0 })) })} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Record Delivery</button><button onClick={() => markBackload(stop.id)} className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Failed / Backload</button></div>}</div>
  {stop.status === 'Failed' && <p className="mt-2 text-sm text-amber-700">Backload reason: {stop.notes || 'Delivery failed'}</p>}
  {stopForm?.stopId === stop.id && <div className="mt-3 bg-slate-50 rounded-lg p-4 space-y-3"><table className="w-full text-sm"><thead><tr className="text-left"><th className="px-2 py-1">Product</th><th className="px-2 py-1 text-right">Loaded</th><th className="px-2 py-1">Accepted</th><th className="px-2 py-1">Short</th><th className="px-2 py-1">BO</th><th className="px-2 py-1">Billable</th></tr></thead><tbody>{stop.items?.map((item, i) => { const line = stopForm.items[i]; const bill = (Number(line?.acceptedQty) || 0) * item.unitPrice; return <tr key={item.id}><td className="px-2 py-1">{item.productName}</td><td className="px-2 py-1 text-right text-slate-500">{item.loadedQty}</td>{(['acceptedQty', 'missingQty', 'boQty'] as const).map(field => <td key={field} className="px-2 py-1"><input type="number" min={0} max={item.loadedQty} value={line?.[field] ?? 0} onChange={e => { const updated = { ...stopForm, items: [...stopForm.items] }; updated.items[i] = { ...updated.items[i], [field]: Number(e.target.value) || 0 }; setStopForm(updated); }} className="w-20 border rounded px-2 py-1 text-right" /></td>)}<td className="px-2 py-1 text-right font-medium">{formatPeso(bill)}</td></tr>; })}</tbody></table>
  {(() => { const orderTotal = stopForm.items.reduce((sum: number, line: any) => { const item = stop.items?.find((entry: any) => entry.id === line.deliveryItemId); return sum + (Number(line.acceptedQty) || 0) * (item?.unitPrice || 0); }, 0); const previousBalance = Number(stop.customer?.currentBalance || 0); return <div className="grid grid-cols-3 gap-3 rounded-lg bg-white border p-3 text-sm"><div>Accepted products: <strong>{formatPeso(orderTotal)}</strong></div><div>Previous balance: <strong>{formatPeso(previousBalance)}</strong></div><div>Total due: <strong className="text-rose-700">{formatPeso(orderTotal + previousBalance)}</strong></div></div>; })()}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div><label className="block text-xs font-semibold mb-1">Received by</label><input value={stopForm.recipientName} onChange={e => setStopForm({ ...stopForm, recipientName: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" /></div>
    <div><label className="block text-xs font-semibold mb-1">Payment Method</label><select value={stopForm.paymentMethod} onChange={e => setStopForm({ ...stopForm, paymentMethod: e.target.value })} className="w-full border rounded px-3 py-2 text-sm"><option value="Cash">Cash</option><option value="GCash">GCash</option><option value="Check">Bank Check</option></select></div>
    <div><label className="block text-xs font-semibold mb-1">Amount Paid (₱)</label><input type="number" min={0} step="0.01" value={stopForm.amountPaid} onChange={e => setStopForm({ ...stopForm, amountPaid: Number(e.target.value) || 0 })} className="w-full border rounded px-3 py-2 text-sm" /></div>
    {stopForm.paymentMethod !== 'Cash' && <div><label className="block text-xs font-semibold mb-1">Payment Reference *</label><input value={stopForm.paymentReference} onChange={e => setStopForm({ ...stopForm, paymentReference: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />{stopForm.paymentMethod === 'Check' && <div className="grid grid-cols-2 gap-2 mt-2"><input value={stopForm.bankName} onChange={e => setStopForm({ ...stopForm, bankName: e.target.value })} placeholder="Bank name" className="w-full border rounded px-3 py-2 text-sm" /><input type="date" value={stopForm.checkDate} onChange={e => setStopForm({ ...stopForm, checkDate: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" /></div>}</div>}
    <div className="md:col-span-2"><label className="block text-xs font-semibold mb-1">Notes</label><input value={stopForm.notes} onChange={e => setStopForm({ ...stopForm, notes: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" placeholder="Short items and BO are excluded from the bill automatically." /></div>
  </div>
  <div className="flex justify-end gap-2"><button onClick={() => setStopForm(null)} className="px-4 py-2 border rounded text-sm">Cancel</button><button onClick={() => handleRecordStop(stop.id)} disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-semibold disabled:opacity-50">{submitting ? 'Saving…' : 'Save Delivery and Payment'}</button></div></div>}</div>)}</div>}
  </div>;
}
// â”€â”€â”€ MAIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function OrdersDelivery() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('bookings');
  return (
    <div>
      <div className="flex overflow-x-auto border-b mb-6">{subTabs.map(tab => { const Icon = tab.icon; const isActive = activeSubTab === tab.id; return (<button key={tab.id} onClick={() => setActiveSubTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition ${isActive ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Icon className="h-4 w-4" />{tab.label}</button>); })}</div>
      {activeSubTab === 'bookings' && <BookingsTab />}
      {activeSubTab === 'receiving' && <StockReceivingTab />}
      {activeSubTab === 'prepare' && <PrepareLoadTab />}
      {activeSubTab === 'delivery' && <DeliveryTab />}
    </div>
  );
}
