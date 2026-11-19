export function formatAuditSentence(
  action: string,
  module: string,
  user: string,
  rawDetails: any
): string {
  if (!rawDetails && rawDetails !== 0) {
    return `Action "${action}" was performed in the ${module || 'General'} module by ${user || 'System'}.`;
  }

  let details: Record<string, any> = {};

  if (typeof rawDetails === 'string') {
    const trimmed = rawDetails.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        details = JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) {
          return `Processed batch of ${arr.length} item(s) in ${module || 'System'}.`;
        }
      } catch {
        return trimmed;
      }
    } else {
      // Already plain words or sentences
      return trimmed;
    }
  } else if (typeof rawDetails === 'object' && rawDetails !== null) {
    details = rawDetails;
  } else {
    return String(rawDetails);
  }

  const formatPeso = (val: any) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return '0.00';
    return num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const act = (action || '').trim();

  switch (act) {
    case 'Login':
      return `User "${details.username || user || 'Staff'}" signed in to the system successfully.`;

    case 'Create Booking':
      return `Created customer booking #${details.bookingNumber || details.id || 'N/A'} for store "${details.storeName || 'Store'}" (${details.area || 'Valencia route'}) with ${details.itemCount ?? details.items ?? 'multiple'} item(s) totaling ₱${formatPeso(details.totalAmount || details.subtotal)}.`;

    case 'Update Booking':
      return `Updated booking record #${details.bookingNumber || details.bookingId || details.id || 'N/A'}${details.status ? ` (Status set to "${details.status}")` : ''}.`;

    case 'Excel Import Bookings':
      return `Successfully imported and processed ${details.count || 0} order booking(s) into the system from an external Excel file.`;

    case 'Create Store':
      return `Registered new customer partner store "${details.storeName || 'Store'}" (Store ID: ${details.id || 'N/A'}).`;

    case 'Update Store':
      return `Updated store account information and location details for "${details.storeName || 'Store'}" (Store ID: ${details.id || 'N/A'}).`;

    case 'Prepare Delivery Run':
      return `Prepared delivery run #${details.runNumber || details.id || 'N/A'} for ${details.area || 'Valencia Route'} with ${details.stopsCount || 0} store drop(s) assigned to driver ${details.driver || 'assigned driver'} in ${details.vehicle || 'delivery van'}.`;

    case 'Dispatch Delivery Run':
      return `Dispatched delivery run #${details.runNumber || details.id || 'N/A'} to ${details.area || 'assigned route'} carrying ${details.totalLoadedQty || 0} total saleable ice cream units.`;

    case 'Delivery Failed / Backload':
      return `Recorded delivery exception / backload at stop #${details.stopId || 'N/A'}. Reason noted: "${details.reason || 'Store closed or delivery refused'}".`;

    case 'Deliver Stop':
      return `Completed delivery to store "${details.storeName || 'Customer Store'}" on invoice #${details.invoiceNumber || details.id || 'N/A'}. Collected payment of ₱${formatPeso(details.amountPaid || details.amount)} via ${details.paymentMethod || 'Cash'}.`;

    case 'Register Freezer':
      return `Registered cold-chain freezer asset unit with serial number "${details.serialNumber || details.id || 'N/A'}"${details.barcode ? ` and barcode ${details.barcode}` : ''}.`;

    case 'Update Freezer':
      return `Updated freezer asset specifications or assignment status for unit serial #${details.serial || details.serialNumber || details.id || 'N/A'}.`;

    case 'Transfer Freezer':
      return `Transferred freezer unit #${details.serialNumber || details.freezerId || 'N/A'} from "${details.fromStore || 'Current Location'}" to "${details.toStore || 'Destination Store'}". Stated reason: "${details.reason || 'Operational transfer'}".`;

    case 'Pull Out Freezer':
      return `Pulled out freezer unit #${details.serialNumber || details.freezerId || 'N/A'} from store "${details.fromStore || 'Store'}". Reason: "${details.reason || 'Store pulled out or closed'}".`;

    case 'Report Freezer Damage':
      return `Filed damage and repair report for freezer unit #${details.serialNumber || details.freezerId || 'N/A'} stationed at "${details.store || 'Store'}". Issue: "${details.reason || 'Cooling or mechanical issue'}".`;

    case 'Verify Freezer Barcode':
      return `Completed routine barcode verification scan (${details.barcode || 'N/A'}) on freezer unit. Verification status: "${details.status || 'Verified'}".`;

    case 'Review Freezer Verification':
      return `Admin reviewed and confirmed freezer audit verification #${details.verificationId || 'N/A'}. Status finalized as "${details.status || 'Verified'}".`;

    case 'Record Bodega Order':
      return `Created Selecta Bodega restocking purchase order #${details.orderNumber || details.id || 'N/A'}${details.selectaPosRef ? ` (Selecta POS Ref: ${details.selectaPosRef})` : ''} amounting to ₱${formatPeso(details.totalAmount)}.`;

    case 'Update Bodega Order':
      return `Updated Selecta Bodega replenishment order #${details.orderNumber || details.id || 'N/A'} status to "${details.status || 'Updated'}".`;

    case 'Receive Stock':
      return `Received inbound freezer delivery truck (Plate: ${details.truckPlate || 'N/A'}) under PO #${details.poNumber || details.receivingId || 'N/A'} with ${details.products || 0} product line(s) valued at ₱${formatPeso(details.totalReceivedValue)}.`;

    case 'Stock Adjustment':
      return `Adjusted physical stock on hand for product ID ${details.productId || 'N/A'} from ${details.oldStock ?? 'previous'} to ${details.newStock ?? 'new'} units (${Number(details.changeQty) >= 0 ? '+' : ''}${details.changeQty ?? 0} units). Reason: "${details.reason || 'Physical count audit'}".`;

    case 'Request Stock Adjustment':
      return `Staff "${details.staffName || user || 'Staff'}" requested Admin permission to edit stock on hand for "${details.productName || details.productId || 'Product'}" by ${Number(details.requestedChange) >= 0 ? '+' : ''}${details.requestedChange} unit(s) (from ${details.currentStock} to ${details.proposedStock} units). Reason: "${details.reason || 'Count audit'}".`;

    case 'Approve Stock Adjustment':
      return `Admin approved stock adjustment request #${details.requestId || 'N/A'} for "${details.productName || 'Product'}". Stock was successfully updated by ${Number(details.changeQty) >= 0 ? '+' : ''}${details.changeQty} unit(s) to ${details.newStock} units.`;

    case 'Reject Stock Adjustment':
      return `Admin rejected stock adjustment request #${details.requestId || 'N/A'} for "${details.productName || 'Product'}". Feedback: "${details.reason || details.adminNotes || 'Declined by Admin'}".`;

    case 'Record Customer BO':
      return `Recorded customer Bad Order (BO) for store "${details.storeName || 'Customer'}": ${details.quantity || 0} unit(s) of "${details.productName || 'Product'}" totaling ₱${formatPeso(details.totalDeduction)}. Cause: "${details.reason || 'BO claim'}".`;

    case 'Update BO Disposition':
      return `Updated disposition status of Bad Order claim #${details.id || 'N/A'} to "${details.disposition || 'Refunded'}"${details.dispositionBy ? ` by ${details.dispositionBy}` : ''}.`;

    case 'Record Payment':
      return `Recorded customer collection payment of ₱${formatPeso(details.amount)} for invoice #${details.invoiceNumber || details.invoiceId || 'N/A'} (Store: "${details.storeName || 'Store'}") via ${details.paymentMethod || 'Cash'}.`;

    case 'Update Check Status':
      return `Updated clearing status for bank check on payment #${details.paymentId || 'N/A'} to "${details.status || 'Cleared'}".`;

    case 'Create Product':
      return `Added new Selecta product SKU "${details.name || details.id || 'Product'}" (Item ID: ${details.id || 'N/A'}) to active catalog.`;

    case 'Update Product':
      return `Updated product details, price, or safety stock threshold for "${details.name || details.id || 'Product'}".`;

    case 'Update Quota Target':
      return `Updated dealership monthly sales quota target for ${details.monthYear || 'the period'} to ₱${formatPeso(details.target)}.`;

    case 'Record Selecta POS Sales':
      return `Recorded official Selecta external POS sales slip #${details.selectaPosRef || 'POS Receipt'} of ₱${formatPeso(details.amount)} towards ${details.monthYear || 'monthly quota'}.`;

    case 'Route Reconciliation':
      return `Submitted end-of-day route collection reconciliation for run #${details.runNumber || details.id || 'N/A'}. Actual cash counted: ₱${formatPeso(details.actualCash)} (Discrepancy Variance: ₱${formatPeso(details.cashVariance)}).`;

    case 'Approve Reconciliation':
      return `Admin ${details.approvedBy || user || 'Admin'} approved and finalized the route collection reconciliation for run #${details.runNumber || details.id || 'N/A'}.`;

    case 'Update Login Page':
      return `Updated login portal layout, welcome greeting, branding descriptions, and carousel slides.`;

    case 'Upload Login Page Image':
      return `Uploaded new login portal branding image asset "${details.filename || 'asset.jpg'}".`;

    case 'Update Settings':
      return `Updated dealership general settings: ${details.headerSubtitle ? `Header coverage set to "${details.headerSubtitle}". ` : ''}${details.dealerName ? `Dealer name set to "${details.dealerName}".` : 'System parameters updated.'}`;

    case 'Create User':
      return `Created new user staff account for "${details.username || 'staff'}".`;

    case 'Update User':
      return `Updated user account settings for "${details.username || details.userId || 'User'}" (Account Status: ${details.status || 'Active'}).`;

    case 'Delete User':
      return `Deactivated and archived user account "${details.username || details.userId || 'User'}".`;

    default: {
      const keys = Object.keys(details).filter((k) => !['id', '_id', 'token'].includes(k));
      if (keys.length === 0) {
        return `Successfully performed "${act}" in ${module || 'General'} module.`;
      }
      const parts = keys
        .slice(0, 5)
        .map((k) => {
          const readableKey = k.replace(/([A-Z])/g, ' $1').toLowerCase();
          return `${readableKey}: "${details[k]}"`;
        })
        .join(', ');
      return `Performed "${act}" in ${module || 'System'}: ${parts}.`;
    }
  }
}
