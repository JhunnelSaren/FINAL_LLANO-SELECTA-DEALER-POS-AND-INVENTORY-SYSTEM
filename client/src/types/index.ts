export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'Admin' | 'Staff';
  phone?: string | null;
  status: string;
  permissions?: string | null;
  lastLogin?: string | null;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  flavor?: string | null;
  unit: string;
  dealerPrice: number;
  sellingPrice: number;
  srp: number;
  stock: number;
  quarantineStock: number;
  reservedStock: number;
  availableStock: number;
  minStock: number;
  barcode?: string | null;
  isActive: boolean;
  isLowStock?: boolean;
}

export interface Customer {
  id: string;
  storeName: string;
  ownerName: string;
  contact?: string | null;
  area: string;
  subArea?: string | null;
  purok?: string | null;
  route: string;
  address?: string | null;
  freezerSerial?: string | null;
  barcodeNo?: string | null;
  status: string;
  notes?: string | null;
  currentBalance: number;
  freezers?: Freezer[];
}

export interface Freezer {
  id: string;
  serialNumber: string;
  barcode: string;
  model: string;
  assignedStoreId?: string | null;
  assignedStoreName?: string | null;
  assignedOwner?: string | null;
  area: string;
  status: string;
  custodyDate?: string | null;
  totalFee: number;
  productAllocation: number;
  processingFee: number;
  feePaymentStatus: string;
  feePaymentRef?: string | null;
  condition: string;
  lastVerifiedAt?: string | null;
  nextDueAt?: string | null;
  verificationStatus?: string;
  notes?: string | null;
  verifications?: FreezerVerification[];
}

export interface FreezerVerification {
  id: string;
  freezerId: string;
  verificationMonth: string;
  scannedAt: string;
  barcodeScanned: string;
  staffName: string;
  photoPath?: string | null;
  status: string;
  notes?: string | null;
  verifiedBy?: string | null;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  storeName: string;
  route: string;
  area: string;
  bookingDate: string;
  requestedDeliveryDate?: string | null;
  bookerName: string;
  status: string;
  subtotal: number;
  notes?: string | null;
  items: BookingItem[];
  customer?: Customer;
}

export interface BookingItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface BodegaOrder {
  id: string;
  orderNumber: string;
  selectaPosRef?: string | null;
  orderDate: string;
  expectedArrivalDate: string;
  staffResponsible: string;
  status: string;
  totalItemsNeeded: number;
  totalAmount: number;
  notes?: string | null;
  items: BodegaOrderItem[];
}

export interface BodegaOrderItem {
  id: string;
  productId: string;
  productName: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
}

export interface StockReceiving {
  id: string;
  poNumber: string;
  bodegaOrderId?: string | null;
  truckPlate: string;
  driverInfo?: string | null;
  receiverName: string;
  checkerName: string;
  arrivalDate: string;
  status: string;
  totalReceivedValue: number;
  receiptPhotoPath?: string | null;
  remarks?: string | null;
  items: StockReceivingItem[];
}

export interface StockReceivingItem {
  id: string;
  productId: string;
  productName: string;
  expectedQty: number;
  receivedGoodQty: number;
  damagedMeltedQty: number;
  missingQty: number;
  unitPrice: number;
  notes?: string | null;
}

export interface DeliveryRun {
  id: string;
  runNumber: string;
  route: string;
  area?: string;
  deliveryDate: string;
  vehicle: string;
  driver: string;
  loader1: string;
  loader2: string;
  helper?: string | null;
  collector: string;
  status: string;
  dispatchedAt?: string | null;
  completedAt?: string | null;
  reconciledAt?: string | null;
  notes?: string | null;
  stops: DeliveryStop[];
  reconciliation?: RouteReconciliation | null;
}

export interface DeliveryStop {
  id: string;
  deliveryRunId: string;
  bookingId: string;
  customerId: string;
  storeName: string;
  stopOrder: number;
  status: string;
  recipientName?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
  customer?: { currentBalance: number };
  items: DeliveryItem[];
  invoice?: CustomerInvoice | null;
}

export interface DeliveryItem {
  id: string;
  productId: string;
  productName: string;
  category?: string | null;
  orderedQty: number;
  loadedQty: number;
  acceptedQty: number;
  missingQty: number;
  boRefusedQty: number;
  intactReturnedQty: number;
  unitPrice: number;
  notes?: string | null;
}

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  deliveryStopId: string;
  customerId: string;
  storeName: string;
  invoiceDate: string;
  billableProductAmount: number;
  otherCharges: number;
  approvedDiscounts: number;
  priorBalance: number;
  netAmountDue: number;
  totalPaid: number;
  balanceRemaining: number;
  paymentStatus: string;
  collectorName?: string | null;
  customerSignature?: string | null;
  notes?: string | null;
  payments: PaymentTransaction[];
}

export interface PaymentTransaction {
  id: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string | null;
  bankName?: string | null;
  checkDate?: string | null;
  checkStatus?: string | null;
  collectedBy: string;
  recordedAt: string;
  notes?: string | null;
}

export interface RouteReconciliation {
  id: string;
  deliveryRunId: string;
  reconciliationDate: string;
  totalLoadedUnits: number;
  totalDeliveredAccepted: number;
  totalIntactReturned: number;
  totalBoReturned: number;
  totalMissingUnaccounted: number;
  expectedCash: number;
  actualCashCounted: number;
  cashVariance: number;
  totalGcash: number;
  totalBankTransfer: number;
  totalChecks: number;
  totalClearedFunds: number;
  outstandingCredit: number;
  discrepancyReason?: string | null;
  status: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

export interface InventoryLedger {
  id: string;
  productId: string;
  productName: string;
  movementType: string;
  changeQty: number;
  runningSaleable: number;
  runningQuarantine: number;
  reference?: string | null;
  staffName: string;
  notes?: string | null;
  createdAt: string;
}

export interface BoDiscrepancy {
  id: string;
  deliveryRef?: string | null;
  storeName?: string | null;
  productId: string;
  productName: string;
  category?: string | null;
  quantity: number;
  unitPrice: number;
  totalDeduction: number;
  reason: string;
  reportedBy: string;
  disposition: string;
  dispositionBy?: string | null;
  dispositionAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface SelectaPosQuota {
  id: string;
  monthYear: string;
  targetAmount: number;
  recordedSales: number;
  percentage?: number;
  remaining?: number;
  notes?: string | null;
  entries: SelectaPosQuotaEntry[];
}

export interface SelectaPosQuotaEntry {
  id: string;
  entryDate: string;
  selectaPosRef: string;
  amount: number;
  enteredBy: string;
  remarks?: string | null;
}

export interface SystemSetting {
  id: string;
  dealerName: string;
  address: string;
  contactNumber: string;
  receiptHeader: string;
  defaultQuotaTarget: number;
  freezerTotalFee: number;
  freezerProductAllocation: number;
  freezerProcessingFee: number;
  mondayRoute: string;
  tuesdayRoute: string;
  wednesdayActivity: string;
  thursdayRoute: string;
  fridayRoute: string;
  allowNegativeStock: boolean;
}
