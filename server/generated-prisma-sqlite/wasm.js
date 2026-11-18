
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  username: 'username',
  name: 'name',
  email: 'email',
  role: 'role',
  accessKey: 'accessKey',
  passwordHash: 'passwordHash',
  phone: 'phone',
  status: 'status',
  permissions: 'permissions',
  resetCode: 'resetCode',
  resetCodeExpiry: 'resetCodeExpiry',
  lastLogin: 'lastLogin',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  sku: 'sku',
  name: 'name',
  category: 'category',
  flavor: 'flavor',
  unit: 'unit',
  dealerPrice: 'dealerPrice',
  sellingPrice: 'sellingPrice',
  srp: 'srp',
  stock: 'stock',
  quarantineStock: 'quarantineStock',
  reservedStock: 'reservedStock',
  minStock: 'minStock',
  barcode: 'barcode',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CustomerScalarFieldEnum = {
  id: 'id',
  storeName: 'storeName',
  ownerName: 'ownerName',
  contact: 'contact',
  area: 'area',
  subArea: 'subArea',
  purok: 'purok',
  route: 'route',
  address: 'address',
  freezerSerial: 'freezerSerial',
  barcodeNo: 'barcodeNo',
  status: 'status',
  notes: 'notes',
  currentBalance: 'currentBalance',
  dateAdded: 'dateAdded',
  lastOrderAt: 'lastOrderAt',
  storePhotoPath: 'storePhotoPath',
  updatedAt: 'updatedAt'
};

exports.Prisma.FreezerScalarFieldEnum = {
  id: 'id',
  serialNumber: 'serialNumber',
  barcode: 'barcode',
  model: 'model',
  assignedStoreId: 'assignedStoreId',
  assignedStoreName: 'assignedStoreName',
  assignedOwner: 'assignedOwner',
  area: 'area',
  status: 'status',
  custodyDate: 'custodyDate',
  totalFee: 'totalFee',
  productAllocation: 'productAllocation',
  processingFee: 'processingFee',
  feePaymentStatus: 'feePaymentStatus',
  feePaymentRef: 'feePaymentRef',
  condition: 'condition',
  lastVerifiedAt: 'lastVerifiedAt',
  nextDueAt: 'nextDueAt',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FreezerTransactionScalarFieldEnum = {
  id: 'id',
  freezerId: 'freezerId',
  action: 'action',
  fromCustomerId: 'fromCustomerId',
  fromStoreName: 'fromStoreName',
  fromArea: 'fromArea',
  toCustomerId: 'toCustomerId',
  toStoreName: 'toStoreName',
  toArea: 'toArea',
  reason: 'reason',
  performedBy: 'performedBy',
  createdAt: 'createdAt'
};

exports.Prisma.FreezerVerificationScalarFieldEnum = {
  id: 'id',
  freezerId: 'freezerId',
  verificationMonth: 'verificationMonth',
  scannedAt: 'scannedAt',
  barcodeScanned: 'barcodeScanned',
  staffName: 'staffName',
  photoPath: 'photoPath',
  photoUrl: 'photoUrl',
  status: 'status',
  notes: 'notes',
  verifiedBy: 'verifiedBy',
  createdAt: 'createdAt'
};

exports.Prisma.BookingScalarFieldEnum = {
  id: 'id',
  bookingNumber: 'bookingNumber',
  customerId: 'customerId',
  storeName: 'storeName',
  route: 'route',
  area: 'area',
  bookingDate: 'bookingDate',
  requestedDeliveryDate: 'requestedDeliveryDate',
  bookerName: 'bookerName',
  status: 'status',
  subtotal: 'subtotal',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BookingItemScalarFieldEnum = {
  id: 'id',
  bookingId: 'bookingId',
  productId: 'productId',
  productName: 'productName',
  category: 'category',
  unitPrice: 'unitPrice',
  quantity: 'quantity',
  lineTotal: 'lineTotal'
};

exports.Prisma.BodegaOrderScalarFieldEnum = {
  id: 'id',
  orderNumber: 'orderNumber',
  selectaPosRef: 'selectaPosRef',
  orderDate: 'orderDate',
  expectedArrivalDate: 'expectedArrivalDate',
  staffResponsible: 'staffResponsible',
  status: 'status',
  totalItemsNeeded: 'totalItemsNeeded',
  totalAmount: 'totalAmount',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BodegaOrderItemScalarFieldEnum = {
  id: 'id',
  bodegaOrderId: 'bodegaOrderId',
  productId: 'productId',
  productName: 'productName',
  orderedQty: 'orderedQty',
  receivedQty: 'receivedQty',
  unitPrice: 'unitPrice'
};

exports.Prisma.StockReceivingScalarFieldEnum = {
  id: 'id',
  poNumber: 'poNumber',
  bodegaOrderId: 'bodegaOrderId',
  truckPlate: 'truckPlate',
  driverInfo: 'driverInfo',
  receiverName: 'receiverName',
  checkerName: 'checkerName',
  arrivalDate: 'arrivalDate',
  status: 'status',
  totalReceivedValue: 'totalReceivedValue',
  receiptPhotoPath: 'receiptPhotoPath',
  remarks: 'remarks',
  createdAt: 'createdAt'
};

exports.Prisma.StockReceivingItemScalarFieldEnum = {
  id: 'id',
  receivingId: 'receivingId',
  productId: 'productId',
  productName: 'productName',
  category: 'category',
  expectedQty: 'expectedQty',
  receivedGoodQty: 'receivedGoodQty',
  damagedMeltedQty: 'damagedMeltedQty',
  missingQty: 'missingQty',
  unitPrice: 'unitPrice',
  notes: 'notes'
};

exports.Prisma.DeliveryRunScalarFieldEnum = {
  id: 'id',
  runNumber: 'runNumber',
  route: 'route',
  area: 'area',
  deliveryDate: 'deliveryDate',
  vehicle: 'vehicle',
  driver: 'driver',
  loader1: 'loader1',
  loader2: 'loader2',
  helper: 'helper',
  collector: 'collector',
  status: 'status',
  dispatchedAt: 'dispatchedAt',
  completedAt: 'completedAt',
  reconciledAt: 'reconciledAt',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.DeliveryStopScalarFieldEnum = {
  id: 'id',
  deliveryRunId: 'deliveryRunId',
  bookingId: 'bookingId',
  customerId: 'customerId',
  storeName: 'storeName',
  stopOrder: 'stopOrder',
  status: 'status',
  recipientName: 'recipientName',
  deliveredAt: 'deliveredAt',
  notes: 'notes'
};

exports.Prisma.DeliveryItemScalarFieldEnum = {
  id: 'id',
  deliveryStopId: 'deliveryStopId',
  productId: 'productId',
  productName: 'productName',
  category: 'category',
  orderedQty: 'orderedQty',
  loadedQty: 'loadedQty',
  acceptedQty: 'acceptedQty',
  missingQty: 'missingQty',
  boRefusedQty: 'boRefusedQty',
  intactReturnedQty: 'intactReturnedQty',
  unitPrice: 'unitPrice',
  notes: 'notes'
};

exports.Prisma.CustomerInvoiceScalarFieldEnum = {
  id: 'id',
  invoiceNumber: 'invoiceNumber',
  deliveryStopId: 'deliveryStopId',
  customerId: 'customerId',
  storeName: 'storeName',
  invoiceDate: 'invoiceDate',
  grossDeliveryAmount: 'grossDeliveryAmount',
  billableProductAmount: 'billableProductAmount',
  boDeductionAmount: 'boDeductionAmount',
  shortDeductionAmount: 'shortDeductionAmount',
  intactReturnDeductionAmount: 'intactReturnDeductionAmount',
  otherCharges: 'otherCharges',
  approvedDiscounts: 'approvedDiscounts',
  priorBalance: 'priorBalance',
  netAmountDue: 'netAmountDue',
  totalPaid: 'totalPaid',
  balanceRemaining: 'balanceRemaining',
  paymentStatus: 'paymentStatus',
  collectorName: 'collectorName',
  customerSignature: 'customerSignature',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.PaymentTransactionScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  customerId: 'customerId',
  amount: 'amount',
  paymentMethod: 'paymentMethod',
  referenceNumber: 'referenceNumber',
  bankName: 'bankName',
  checkDate: 'checkDate',
  checkStatus: 'checkStatus',
  collectedBy: 'collectedBy',
  recordedAt: 'recordedAt',
  notes: 'notes'
};

exports.Prisma.RouteReconciliationScalarFieldEnum = {
  id: 'id',
  deliveryRunId: 'deliveryRunId',
  reconciliationDate: 'reconciliationDate',
  totalLoadedUnits: 'totalLoadedUnits',
  totalDeliveredAccepted: 'totalDeliveredAccepted',
  totalIntactReturned: 'totalIntactReturned',
  totalBoReturned: 'totalBoReturned',
  totalMissingUnaccounted: 'totalMissingUnaccounted',
  expectedCash: 'expectedCash',
  actualCashCounted: 'actualCashCounted',
  cashVariance: 'cashVariance',
  totalGcash: 'totalGcash',
  totalBankTransfer: 'totalBankTransfer',
  totalChecks: 'totalChecks',
  totalClearedFunds: 'totalClearedFunds',
  outstandingCredit: 'outstandingCredit',
  discrepancyReason: 'discrepancyReason',
  status: 'status',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  createdAt: 'createdAt'
};

exports.Prisma.UserNotificationStateScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  notificationId: 'notificationId',
  isRead: 'isRead',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryLedgerScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  productName: 'productName',
  category: 'category',
  movementType: 'movementType',
  changeQty: 'changeQty',
  runningSaleable: 'runningSaleable',
  runningQuarantine: 'runningQuarantine',
  reference: 'reference',
  staffName: 'staffName',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.BoDiscrepancyScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  deliveryRef: 'deliveryRef',
  storeName: 'storeName',
  productId: 'productId',
  productName: 'productName',
  category: 'category',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  totalDeduction: 'totalDeduction',
  reason: 'reason',
  reportedBy: 'reportedBy',
  disposition: 'disposition',
  dispositionBy: 'dispositionBy',
  dispositionAt: 'dispositionAt',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.SelectaPosQuotaScalarFieldEnum = {
  id: 'id',
  monthYear: 'monthYear',
  targetAmount: 'targetAmount',
  recordedSales: 'recordedSales',
  notes: 'notes',
  updatedAt: 'updatedAt'
};

exports.Prisma.SelectaPosQuotaEntryScalarFieldEnum = {
  id: 'id',
  quotaId: 'quotaId',
  entryDate: 'entryDate',
  selectaPosRef: 'selectaPosRef',
  amount: 'amount',
  enteredBy: 'enteredBy',
  remarks: 'remarks',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  action: 'action',
  module: 'module',
  user: 'user',
  details: 'details',
  timestamp: 'timestamp'
};

exports.Prisma.SystemSettingScalarFieldEnum = {
  id: 'id',
  dealerName: 'dealerName',
  address: 'address',
  contactNumber: 'contactNumber',
  receiptHeader: 'receiptHeader',
  headerSubtitle: 'headerSubtitle',
  defaultQuotaTarget: 'defaultQuotaTarget',
  freezerTotalFee: 'freezerTotalFee',
  freezerProductAllocation: 'freezerProductAllocation',
  freezerProcessingFee: 'freezerProcessingFee',
  mondayRoute: 'mondayRoute',
  tuesdayRoute: 'tuesdayRoute',
  wednesdayActivity: 'wednesdayActivity',
  thursdayRoute: 'thursdayRoute',
  fridayRoute: 'fridayRoute',
  allowNegativeStock: 'allowNegativeStock',
  loginPageConfig: 'loginPageConfig',
  updatedAt: 'updatedAt'
};

exports.Prisma.StockAdjustmentRequestScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  productName: 'productName',
  currentStock: 'currentStock',
  requestedChange: 'requestedChange',
  proposedStock: 'proposedStock',
  reason: 'reason',
  notes: 'notes',
  staffId: 'staffId',
  staffName: 'staffName',
  status: 'status',
  adminId: 'adminId',
  adminName: 'adminName',
  adminNotes: 'adminNotes',
  reviewedAt: 'reviewedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  User: 'User',
  Product: 'Product',
  Customer: 'Customer',
  Freezer: 'Freezer',
  FreezerTransaction: 'FreezerTransaction',
  FreezerVerification: 'FreezerVerification',
  Booking: 'Booking',
  BookingItem: 'BookingItem',
  BodegaOrder: 'BodegaOrder',
  BodegaOrderItem: 'BodegaOrderItem',
  StockReceiving: 'StockReceiving',
  StockReceivingItem: 'StockReceivingItem',
  DeliveryRun: 'DeliveryRun',
  DeliveryStop: 'DeliveryStop',
  DeliveryItem: 'DeliveryItem',
  CustomerInvoice: 'CustomerInvoice',
  PaymentTransaction: 'PaymentTransaction',
  RouteReconciliation: 'RouteReconciliation',
  UserNotificationState: 'UserNotificationState',
  InventoryLedger: 'InventoryLedger',
  BoDiscrepancy: 'BoDiscrepancy',
  SelectaPosQuota: 'SelectaPosQuota',
  SelectaPosQuotaEntry: 'SelectaPosQuotaEntry',
  AuditLog: 'AuditLog',
  SystemSetting: 'SystemSetting',
  StockAdjustmentRequest: 'StockAdjustmentRequest'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
