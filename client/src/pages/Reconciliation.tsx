import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { apiRequest } from '../utils/api';
import { formatPeso, formatDate, getStatusColor } from '../utils/formatters';
import type { DeliveryRun } from '../types';

export default function Reconciliation() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [recon, setRecon] = useState<any>(null);
  const [actualCash, setActualCash] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any>('/delivery');
      const list = Array.isArray(data) ? data : data.runs || [];
      setRuns(list.filter((run: DeliveryRun) => run.status === 'Delivered' || run.status === 'Reconciled'));
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const loadReconciliation = async (runId: string) => {
    setSelectedRunId(runId);
    setRecon(null);
    setNotes('');
    if (!runId) return;
    try {
      const data = await apiRequest<any>(`/reconciliation?runId=${runId}`);
      setRecon(data);
      if (data?.actualCashCounted !== undefined) setActualCash(data.actualCashCounted);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleSubmit = async () => {
    if (!selectedRunId) return;
    setSubmitting(true);
    try {
      await apiRequest('/reconciliation', {
        method: 'POST',
        body: JSON.stringify({ deliveryRunId: selectedRunId, actualCashCounted: actualCash, discrepancyReason: notes }),
      });
      showToast('Reconciliation saved.');
      await loadReconciliation(selectedRunId);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve?')) return;
    try {
      await apiRequest(`/reconciliation/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ adminNotes: notes }),
      });
      showToast('Reconciliation approved and inventory finalized.');
      await loadReconciliation(selectedRunId);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Reconciliation</h1>
        <p className="mt-1 text-sm text-slate-500">Review completed delivery runs, cash variances, and inventory returns.</p>
      </div>
      <div className="bg-white rounded-xl border p-4">
        <label className="block text-sm font-semibold mb-2" htmlFor="reconciliation-run">Select Delivery Run</label>
        <select id="reconciliation-run" value={selectedRunId} onChange={e => loadReconciliation(e.target.value)} className="w-full max-w-md border rounded-lg px-3 py-2 text-sm">
          <option value="">— Select —</option>
          {runs.map(run => <option key={run.id} value={run.id}>{run.runNumber} — {run.route} — {formatDate(run.deliveryDate)} ({run.status})</option>)}
        </select>
        {loading && <p className="mt-2 text-sm text-slate-500">Loading delivery runs…</p>}
        {!loading && runs.length === 0 && <p className="mt-2 text-sm text-slate-500">No completed delivery runs are ready for reconciliation.</p>}
      </div>
      {recon && <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-bold text-slate-800">Run Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-lg p-3 text-center"><div className="text-xs text-slate-500">Expected</div><div className="text-lg font-bold">{formatPeso(recon.expectedCash)}</div></div>
          <div className="bg-slate-50 rounded-lg p-3 text-center"><div className="text-xs text-slate-500">Actual</div><div className="text-lg font-bold">{formatPeso(recon.actualCashCounted)}</div></div>
          <div className={`rounded-lg p-3 text-center ${(recon.cashVariance || 0) < 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}><div className="text-xs text-slate-500">Variance</div><div className={`text-lg font-bold ${(recon.cashVariance || 0) < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{formatPeso(recon.cashVariance)}</div></div>
          <div className="bg-slate-50 rounded-lg p-3 text-center"><div className="text-xs text-slate-500">Status</div><span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(recon.status)}`}>{recon.status}</span></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>Loaded units: <strong>{recon.summary?.totalLoadedUnits ?? 0}</strong></div>
          <div>Accepted: <strong>{recon.summary?.totalDeliveredAccepted ?? 0}</strong></div>
          <div>Intact backload: <strong>{recon.summary?.totalIntactReturned ?? 0}</strong></div>
          <div>BO quarantined: <strong>{recon.summary?.totalBoReturned ?? 0}</strong></div>
          <div>GCash: <strong>{formatPeso(recon.summary?.totalGcash ?? 0)}</strong></div>
          <div>Checks: <strong>{formatPeso(recon.summary?.totalChecks ?? 0)}</strong></div>
          <div>Outstanding credit: <strong>{formatPeso(recon.summary?.totalOutstandingCredit ?? 0)}</strong></div>
        </div>
        {recon.status !== 'Approved' && <div className="border-t pt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1" htmlFor="actual-cash">Cash Counted (₱)</label>
              <input id="actual-cash" type="number" min={0} step="0.01" value={actualCash} onChange={e => setActualCash(parseFloat(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1" htmlFor="variance-notes">Variance / shortage notes</label>
              <input id="variance-notes" type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={handleSubmit} disabled={submitting} className="px-6 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
            {submitting ? 'Saving…' : recon.status === 'Pending Approval' ? 'Update Reconciliation' : 'Submit Reconciliation'}
          </button>
        </div>}
        {isAdmin && recon.status === 'Pending Approval' && recon.id && <button onClick={() => handleApprove(recon.id)} className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold">Approve and Finalize Inventory</button>}
      </div>}
    </div>
  );
}
