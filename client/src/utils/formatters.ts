export function formatPeso(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₱0.00';
  }
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateString;
  }
}

export function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'delivered':
    case 'completed':
    case 'approved':
    case 'paid':
    case 'cleared':
    case 'compliant':
    case 'up to date':
    case 'received':
    case 'verified':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';

    case 'in transit':
    case 'in progress':
    case 'prepared':
    case 'entered in pos':
    case 'partial':
    case 'ready for deliver':
      return 'bg-blue-100 text-blue-800 border-blue-300';

    case 'booked':
    case 'draft':
    case 'pending':
    case 'pending entry':
    case 'pending approval':
    case 'pending review':
    case 'due':
    case 'due soon':
      return 'bg-amber-100 text-amber-800 border-amber-300';

    case 'overdue':
    case 'bounced':
    case 'shortage':
    case 'cancelled':
    case 'rejected':
    case 'failed':
    case 'unpaid':
      return 'bg-rose-100 text-rose-800 border-rose-300';

    case 'quarantined':
    case 'under maintenance':
    case 'unassigned':
    case 'inactive':
      return 'bg-slate-100 text-slate-800 border-slate-300';

    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}
