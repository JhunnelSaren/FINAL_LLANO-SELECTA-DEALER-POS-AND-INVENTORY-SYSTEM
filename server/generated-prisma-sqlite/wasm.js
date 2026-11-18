
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/wasm.js')


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

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

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
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "D:\\JHUNNEL SAREN\\ACLC COLLEGE\\2_LLANO POS AND INVENTORY SYSTEM\\server\\generated-prisma-sqlite",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "windows",
        "native": true
      }
    ],
    "previewFeatures": [
      "driverAdapters"
    ],
    "sourceFilePath": "D:\\JHUNNEL SAREN\\ACLC COLLEGE\\2_LLANO POS AND INVENTORY SYSTEM\\server\\prisma\\schema.sqlite.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null,
    "schemaEnvPath": "../.env"
  },
  "relativePath": "../prisma",
  "clientVersion": "5.22.0",
  "engineVersion": "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "sqlite",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": null,
        "value": "file:./pos_local.db"
      }
    }
  },
  "inlineSchema": "generator client {\n  provider        = \"prisma-client-js\"\n  output          = \"../generated-prisma-sqlite\"\n  previewFeatures = [\"driverAdapters\"]\n}\n\ndatasource db {\n  provider = \"sqlite\"\n  url      = \"file:./pos_local.db\"\n}\n\nmodel User {\n  id              String    @id @default(cuid())\n  username        String    @unique\n  name            String\n  email           String    @unique\n  role            String // \"Admin\" | \"Staff\"\n  accessKey       String?   @unique\n  passwordHash    String\n  phone           String?\n  status          String    @default(\"Active\") // \"Active\" | \"Inactive\"\n  permissions     String?\n  resetCode       String?\n  resetCodeExpiry DateTime?\n  lastLogin       DateTime?\n  createdAt       DateTime  @default(now())\n  updatedAt       DateTime  @updatedAt\n\n  @@map(\"user\")\n}\n\nmodel Product {\n  id              String   @id // e.g. \"COR-001\"\n  sku             String?  @unique\n  name            String\n  category        String // \"CORNETTO\", \"MAGNUM\", \"STICKS\", \"SUPREME 1.3L\"\n  flavor          String?\n  unit            String   @default(\"Piece\") // \"Piece\", \"Pack\", \"Tub\"\n  dealerPrice     Decimal? @default(0.0)\n  sellingPrice    Decimal  @default(0.0)\n  srp             Decimal? @default(0.0)\n  stock           Int      @default(0) // Saleable physical inventory\n  quarantineStock Int      @default(0) // Damaged/BO/quarantined inventory\n  reservedStock   Int      @default(0) // Allocated/picked for delivery\n  minStock        Int      @default(15) // Safety re-order threshold\n  barcode         String?\n  isActive        Boolean  @default(true)\n  createdAt       DateTime @default(now())\n  updatedAt       DateTime @updatedAt\n\n  @@map(\"product\")\n}\n\nmodel Customer {\n  id             String         @id // e.g. \"CUST-001\"\n  storeName      String\n  ownerName      String?\n  contact        String?\n  area           String // \"Valencia\", \"Cabanglasan\", \"San Fernando\"\n  subArea        String? // \"Batangan\", \"San Isidro\", \"Poblacion\", \"Halapitan\", etc.\n  purok          String?\n  route          String?\n  address        String?\n  freezerSerial  String?\n  barcodeNo      String?\n  status         String         @default(\"Active\") // \"Active\" | \"Inactive\"\n  notes          String?\n  currentBalance Decimal        @default(0.0) // Outstanding unpaid customer balance\n  dateAdded      DateTime       @default(now()) @map(\"createdAt\")\n  lastOrderAt    DateTime?\n  storePhotoPath String?\n  updatedAt      DateTime       @updatedAt\n  bookings       Booking[]\n  freezers       Freezer[]\n  deliveryStops  DeliveryStop[]\n\n  @@map(\"customer\")\n}\n\nmodel Freezer {\n  id                String                @id // e.g. \"FRZ-001\"\n  serialNumber      String                @unique // e.g. \"SEL-FRZ-8821\"\n  barcode           String                @unique // e.g. \"BC-8821-VAL\"\n  model             String // e.g. \"Selecta Glass Top 300L\"\n  assignedStoreId   String?\n  assignedStoreName String?\n  assignedOwner     String?\n  area              String                @default(\"Valencia\")\n  status            String                @default(\"Active\") // \"Active\", \"Under Maintenance\", \"Returned\", \"Unassigned\"\n  custodyDate       DateTime?\n  totalFee          Decimal               @default(10000.00)\n  productAllocation Decimal               @default(9000.00)\n  processingFee     Decimal               @default(1000.00)\n  feePaymentStatus  String                @default(\"Paid\") // \"Paid\", \"Partial\", \"Unpaid\"\n  feePaymentRef     String?\n  condition         String                @default(\"Good\")\n  lastVerifiedAt    DateTime?\n  nextDueAt         DateTime?\n  notes             String?\n  createdAt         DateTime              @default(now())\n  updatedAt         DateTime              @updatedAt\n  customer          Customer?             @relation(fields: [assignedStoreId], references: [id])\n  verifications     FreezerVerification[]\n  transactions      FreezerTransaction[]\n}\n\nmodel FreezerTransaction {\n  id             String   @id @default(cuid())\n  freezerId      String\n  action         String\n  fromCustomerId String?\n  fromStoreName  String?\n  fromArea       String?\n  toCustomerId   String?\n  toStoreName    String?\n  toArea         String?\n  reason         String\n  performedBy    String\n  createdAt      DateTime @default(now())\n  freezer        Freezer  @relation(fields: [freezerId], references: [id], onDelete: Restrict)\n\n  @@index([freezerId, createdAt])\n}\n\nmodel FreezerVerification {\n  id                String   @id @default(cuid())\n  freezerId         String\n  verificationMonth String // \"YYYY-MM\" e.g. \"2026-10\"\n  scannedAt         DateTime\n  barcodeScanned    String\n  staffName         String\n  photoPath         String?\n  photoUrl          String?\n  status            String   @default(\"Verified\") // \"Verified\", \"Rejected\", \"Pending Review\"\n  notes             String?\n  verifiedBy        String?\n  createdAt         DateTime @default(now())\n  freezer           Freezer  @relation(fields: [freezerId], references: [id])\n}\n\nmodel Booking {\n  id                    String        @id // e.g. \"BK-2026-1001\"\n  bookingNumber         String        @unique\n  customerId            String\n  storeName             String\n  route                 String\n  area                  String\n  bookingDate           DateTime\n  requestedDeliveryDate DateTime?\n  bookerName            String\n  status                String        @default(\"Booked\") // \"Booked\", \"Ordered to Bodega\", \"Prepared\", \"In Transit\", \"Delivered\", \"Cancelled\"\n  subtotal              Decimal       @default(0.0)\n  notes                 String?\n  createdAt             DateTime      @default(now())\n  updatedAt             DateTime      @updatedAt\n  customer              Customer      @relation(fields: [customerId], references: [id])\n  items                 BookingItem[]\n}\n\nmodel BookingItem {\n  id          String  @id @default(cuid())\n  bookingId   String\n  productId   String\n  productName String\n  category    String\n  unitPrice   Decimal\n  quantity    Int\n  lineTotal   Decimal\n  booking     Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)\n}\n\nmodel BodegaOrder {\n  id                  String            @id @default(cuid())\n  orderNumber         String            @unique // e.g. \"ORD-BOD-2026-001\"\n  selectaPosRef       String? // External Unilever Selecta POS reference (e.g. \"POS-CDO-7719\")\n  orderDate           DateTime\n  expectedArrivalDate DateTime\n  staffResponsible    String\n  status              String            @default(\"Entered in POS\") // \"Pending Entry\", \"Entered in POS\", \"Partially Received\", \"Received\", \"Cancelled\"\n  totalItemsNeeded    Int               @default(0)\n  totalAmount         Decimal           @default(0.0)\n  notes               String?\n  createdAt           DateTime          @default(now())\n  updatedAt           DateTime          @updatedAt\n  items               BodegaOrderItem[]\n}\n\nmodel BodegaOrderItem {\n  id            String      @id @default(cuid())\n  bodegaOrderId String\n  productId     String\n  productName   String\n  orderedQty    Int\n  receivedQty   Int         @default(0)\n  unitPrice     Decimal\n  bodegaOrder   BodegaOrder @relation(fields: [bodegaOrderId], references: [id], onDelete: Cascade)\n}\n\nmodel StockReceiving {\n  id                 String               @id // e.g. \"RCV-2026-001\"\n  poNumber           String // Supplier PO / Bodega order reference\n  bodegaOrderId      String?\n  truckPlate         String\n  driverInfo         String?\n  receiverName       String\n  checkerName        String\n  arrivalDate        DateTime\n  status             String               @default(\"Completed\") // \"Completed\", \"Discrepancy Found\"\n  totalReceivedValue Decimal              @default(0.0)\n  receiptPhotoPath   String?\n  remarks            String?\n  createdAt          DateTime             @default(now())\n  items              StockReceivingItem[]\n}\n\nmodel StockReceivingItem {\n  id               String         @id @default(cuid())\n  receivingId      String\n  productId        String\n  productName      String\n  category         String?\n  expectedQty      Int\n  receivedGoodQty  Int // Enters saleable stock\n  damagedMeltedQty Int            @default(0) // Enters non-saleable quarantine\n  missingQty       Int            @default(0) // Shortage from supplier truck\n  unitPrice        Decimal\n  notes            String?\n  receiving        StockReceiving @relation(fields: [receivingId], references: [id], onDelete: Cascade)\n}\n\nmodel DeliveryRun {\n  id             String               @id // e.g. \"RUN-2026-1024\"\n  runNumber      String               @unique\n  route          String\n  area           String               @default(\"Valencia\")\n  deliveryDate   DateTime\n  vehicle        String               @default(\"Bongo Refrigerated Van\")\n  driver         String\n  loader1        String\n  loader2        String\n  helper         String?\n  collector      String\n  status         String               @default(\"Prepared\") // \"Draft\", \"Prepared\", \"In Transit\", \"Delivered\", \"Reconciled\"\n  dispatchedAt   DateTime?\n  completedAt    DateTime?\n  reconciledAt   DateTime?\n  notes          String?\n  createdAt      DateTime             @default(now())\n  stops          DeliveryStop[]\n  reconciliation RouteReconciliation?\n}\n\nmodel DeliveryStop {\n  id            String           @id @default(cuid())\n  deliveryRunId String\n  bookingId     String\n  customerId    String\n  storeName     String\n  stopOrder     Int              @default(1)\n  status        String           @default(\"Pending\") // \"Pending\", \"In Progress\", \"Delivered\", \"Rescheduled\", \"Failed\"\n  recipientName String?\n  deliveredAt   DateTime?\n  notes         String?\n  deliveryRun   DeliveryRun      @relation(fields: [deliveryRunId], references: [id], onDelete: Cascade)\n  customer      Customer         @relation(fields: [customerId], references: [id])\n  items         DeliveryItem[]\n  invoice       CustomerInvoice?\n}\n\nmodel DeliveryItem {\n  id                String       @id @default(cuid())\n  deliveryStopId    String\n  productId         String\n  productName       String\n  category          String?\n  orderedQty        Int\n  loadedQty         Int\n  acceptedQty       Int // Saleable accepted by store (basis for billing)\n  missingQty        Int          @default(0) // Not delivered / short\n  boRefusedQty      Int          @default(0) // Melted/damaged refused and returned\n  intactReturnedQty Int          @default(0) // Undelivered intact units returned\n  unitPrice         Decimal\n  notes             String?\n  deliveryStop      DeliveryStop @relation(fields: [deliveryStopId], references: [id], onDelete: Cascade)\n}\n\nmodel CustomerInvoice {\n  id                          String               @id @default(cuid())\n  invoiceNumber               String               @unique // e.g. \"OR-VAL-8821\" or \"INV-2026-1001\"\n  deliveryStopId              String               @unique\n  customerId                  String\n  storeName                   String\n  invoiceDate                 DateTime\n  grossDeliveryAmount         Decimal              @default(0.0)\n  billableProductAmount       Decimal // Accepted Qty * Unit Price\n  boDeductionAmount           Decimal              @default(0.0)\n  shortDeductionAmount        Decimal              @default(0.0)\n  intactReturnDeductionAmount Decimal              @default(0.0)\n  otherCharges                Decimal              @default(0.0)\n  approvedDiscounts           Decimal              @default(0.0)\n  priorBalance                Decimal              @default(0.0)\n  netAmountDue                Decimal // Billable + other - discount + priorBalance\n  totalPaid                   Decimal              @default(0.0)\n  balanceRemaining            Decimal              @default(0.0)\n  paymentStatus               String               @default(\"Unpaid\") // \"Paid\", \"Partial\", \"Unpaid\"\n  collectorName               String?\n  customerSignature           String?\n  notes                       String?\n  createdAt                   DateTime             @default(now())\n  deliveryStop                DeliveryStop         @relation(fields: [deliveryStopId], references: [id], onDelete: Cascade)\n  payments                    PaymentTransaction[]\n}\n\nmodel PaymentTransaction {\n  id              String          @id @default(cuid())\n  invoiceId       String\n  customerId      String\n  amount          Decimal\n  paymentMethod   String // \"Cash\", \"GCash\", \"Bank Transfer\", \"Check\"\n  referenceNumber String?\n  bankName        String?\n  checkDate       DateTime?\n  checkStatus     String? // \"Pending\", \"Cleared\", \"Bounced\"\n  collectedBy     String\n  recordedAt      DateTime        @default(now())\n  notes           String?\n  invoice         CustomerInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)\n}\n\nmodel RouteReconciliation {\n  id                      String      @id @default(cuid())\n  deliveryRunId           String      @unique\n  reconciliationDate      DateTime\n  totalLoadedUnits        Int\n  totalDeliveredAccepted  Int\n  totalIntactReturned     Int\n  totalBoReturned         Int\n  totalMissingUnaccounted Int\n  expectedCash            Decimal\n  actualCashCounted       Decimal\n  cashVariance            Decimal // actual - expected (negative = shortage)\n  totalGcash              Decimal     @default(0.0)\n  totalBankTransfer       Decimal     @default(0.0)\n  totalChecks             Decimal     @default(0.0)\n  totalClearedFunds       Decimal     @default(0.0)\n  outstandingCredit       Decimal     @default(0.0)\n  discrepancyReason       String?\n  status                  String      @default(\"Pending Approval\") // \"Pending Approval\", \"Approved\", \"Exception Closed\"\n  approvedBy              String?\n  approvedAt              DateTime?\n  createdAt               DateTime    @default(now())\n  deliveryRun             DeliveryRun @relation(fields: [deliveryRunId], references: [id], onDelete: Cascade)\n}\n\nmodel UserNotificationState {\n  id             String   @id @default(cuid())\n  userId         String\n  notificationId String\n  isRead         Boolean  @default(false)\n  isDeleted      Boolean  @default(false)\n  createdAt      DateTime @default(now())\n  updatedAt      DateTime @updatedAt\n\n  @@unique([userId, notificationId])\n  @@index([userId, isDeleted])\n  @@map(\"usernotificationstate\")\n}\n\nmodel InventoryLedger {\n  id                String   @id @default(cuid())\n  productId         String?\n  productName       String\n  category          String?\n  movementType      String // \"Supplier Receiving\", \"Picking\", \"Dispatch\", \"Sale Delivered\", \"Intact Return\", \"BO Quarantine\", \"BO Disposition\", \"Physical Adjustment\"\n  changeQty         Int // + or -\n  runningSaleable   Int      @default(100)\n  runningQuarantine Int      @default(0)\n  reference         String? // Reference ID (PO, Run, Invoice, Adj)\n  staffName         String?\n  notes             String?\n  createdAt         DateTime @default(now())\n\n  @@map(\"inventoryledger\")\n}\n\nmodel BoDiscrepancy {\n  id             String    @id // e.g. \"BO-2026-001\"\n  customerId     String?\n  deliveryRef    String?\n  storeName      String?\n  productId      String\n  productName    String\n  category       String?\n  quantity       Int\n  unitPrice      Decimal\n  totalDeduction Decimal\n  reason         String\n  reportedBy     String\n  disposition    String    @default(\"Pending\") // \"Pending\" | \"Refunded\"\n  dispositionBy  String?\n  dispositionAt  DateTime?\n  notes          String?\n  createdAt      DateTime  @default(now())\n}\n\nmodel SelectaPosQuota {\n  id            String                 @id @default(cuid())\n  monthYear     String                 @unique // e.g. \"2026-10\"\n  targetAmount  Decimal                @default(1000000.00)\n  recordedSales Decimal                @default(0.0) // Confirmed Selecta POS external sales entries\n  notes         String?\n  updatedAt     DateTime               @updatedAt\n  entries       SelectaPosQuotaEntry[]\n}\n\nmodel SelectaPosQuotaEntry {\n  id            String          @id @default(cuid())\n  quotaId       String\n  entryDate     DateTime\n  selectaPosRef String // e.g. \"POS-CDO-7719\", \"Z-Read 10/24\"\n  amount        Decimal\n  enteredBy     String\n  remarks       String?\n  createdAt     DateTime        @default(now())\n  quota         SelectaPosQuota @relation(fields: [quotaId], references: [id], onDelete: Cascade)\n}\n\nmodel AuditLog {\n  id        String   @id @default(cuid())\n  action    String\n  module    String\n  user      String\n  details   String // JSON string\n  timestamp DateTime @default(now())\n}\n\nmodel SystemSetting {\n  id                       String   @id @default(\"SYSTEM_SETTINGS\")\n  dealerName               String   @default(\"Llano Selecta Dealer\")\n  address                  String   @default(\"Sayre Highway, Valencia City, Bukidnon\")\n  contactNumber            String   @default(\"0917-123-4567\")\n  receiptHeader            String   @default(\"Llano Selecta Authorized Dealer - Cold Chain Ice Cream Distribution\")\n  headerSubtitle           String?\n  defaultQuotaTarget       Decimal  @default(1000000.00)\n  freezerTotalFee          Decimal  @default(10000.00)\n  freezerProductAllocation Decimal  @default(9000.00)\n  freezerProcessingFee     Decimal  @default(1000.00)\n  mondayRoute              String   @default(\"Valencia – San Fernando Route\")\n  tuesdayRoute             String   @default(\"Cabanglasan Delivery Route\")\n  wednesdayActivity        String   @default(\"Selecta Bodega Stock Arrival & Verification\")\n  thursdayRoute            String   @default(\"Cabanglasan Bongo Delivery Run\")\n  fridayRoute              String   @default(\"Valencia – San Fernando Bongo Delivery Run\")\n  allowNegativeStock       Boolean  @default(false)\n  loginPageConfig          String?\n  updatedAt                DateTime @updatedAt\n}\n\nmodel StockAdjustmentRequest {\n  id              String    @id @default(cuid())\n  productId       String\n  productName     String\n  currentStock    Int\n  requestedChange Int\n  proposedStock   Int\n  reason          String\n  notes           String?\n  staffId         String\n  staffName       String\n  status          String    @default(\"Pending\") // \"Pending\", \"Approved\", \"Rejected\"\n  adminId         String?\n  adminName       String?\n  adminNotes      String?\n  reviewedAt      DateTime?\n  createdAt       DateTime  @default(now())\n  updatedAt       DateTime  @updatedAt\n\n  @@index([status, createdAt])\n  @@map(\"stockadjustmentrequest\")\n}\n",
  "inlineSchemaHash": "34f658b65a584f2f2db897a13cf0bbaea698de92ac2db65333b23032f0b9eacb",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"username\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"accessKey\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"passwordHash\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"phone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"permissions\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"resetCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"resetCodeExpiry\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"lastLogin\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":\"user\"},\"Product\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sku\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"flavor\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"unit\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"dealerPrice\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"sellingPrice\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"srp\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"stock\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"quarantineStock\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"reservedStock\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"minStock\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"barcode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":\"product\"},\"Customer\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"storeName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ownerName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"contact\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"area\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subArea\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"purok\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"route\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"address\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"freezerSerial\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"barcodeNo\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"currentBalance\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"dateAdded\",\"kind\":\"scalar\",\"type\":\"DateTime\",\"dbName\":\"createdAt\"},{\"name\":\"lastOrderAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"storePhotoPath\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"bookings\",\"kind\":\"object\",\"type\":\"Booking\",\"relationName\":\"BookingToCustomer\"},{\"name\":\"freezers\",\"kind\":\"object\",\"type\":\"Freezer\",\"relationName\":\"CustomerToFreezer\"},{\"name\":\"deliveryStops\",\"kind\":\"object\",\"type\":\"DeliveryStop\",\"relationName\":\"CustomerToDeliveryStop\"}],\"dbName\":\"customer\"},\"Freezer\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"serialNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"barcode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"model\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"assignedStoreId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"assignedStoreName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"assignedOwner\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"area\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"custodyDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"totalFee\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"productAllocation\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"processingFee\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"feePaymentStatus\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"feePaymentRef\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"condition\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"lastVerifiedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"nextDueAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"customer\",\"kind\":\"object\",\"type\":\"Customer\",\"relationName\":\"CustomerToFreezer\"},{\"name\":\"verifications\",\"kind\":\"object\",\"type\":\"FreezerVerification\",\"relationName\":\"FreezerToFreezerVerification\"},{\"name\":\"transactions\",\"kind\":\"object\",\"type\":\"FreezerTransaction\",\"relationName\":\"FreezerToFreezerTransaction\"}],\"dbName\":null},\"FreezerTransaction\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"freezerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"action\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fromCustomerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fromStoreName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fromArea\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"toCustomerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"toStoreName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"toArea\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"reason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"performedBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"freezer\",\"kind\":\"object\",\"type\":\"Freezer\",\"relationName\":\"FreezerToFreezerTransaction\"}],\"dbName\":null},\"FreezerVerification\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"freezerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"verificationMonth\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"scannedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"barcodeScanned\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"staffName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"photoPath\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"photoUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"verifiedBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"freezer\",\"kind\":\"object\",\"type\":\"Freezer\",\"relationName\":\"FreezerToFreezerVerification\"}],\"dbName\":null},\"Booking\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bookingNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"storeName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"route\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"area\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bookingDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"requestedDeliveryDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"bookerName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subtotal\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"customer\",\"kind\":\"object\",\"type\":\"Customer\",\"relationName\":\"BookingToCustomer\"},{\"name\":\"items\",\"kind\":\"object\",\"type\":\"BookingItem\",\"relationName\":\"BookingToBookingItem\"}],\"dbName\":null},\"BookingItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bookingId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"unitPrice\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"quantity\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"lineTotal\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"booking\",\"kind\":\"object\",\"type\":\"Booking\",\"relationName\":\"BookingToBookingItem\"}],\"dbName\":null},\"BodegaOrder\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"selectaPosRef\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"expectedArrivalDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"staffResponsible\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"totalItemsNeeded\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"totalAmount\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"items\",\"kind\":\"object\",\"type\":\"BodegaOrderItem\",\"relationName\":\"BodegaOrderToBodegaOrderItem\"}],\"dbName\":null},\"BodegaOrderItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bodegaOrderId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderedQty\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"receivedQty\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"unitPrice\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"bodegaOrder\",\"kind\":\"object\",\"type\":\"BodegaOrder\",\"relationName\":\"BodegaOrderToBodegaOrderItem\"}],\"dbName\":null},\"StockReceiving\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"poNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bodegaOrderId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"truckPlate\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"driverInfo\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"receiverName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"checkerName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"arrivalDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"totalReceivedValue\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"receiptPhotoPath\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"remarks\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"items\",\"kind\":\"object\",\"type\":\"StockReceivingItem\",\"relationName\":\"StockReceivingToStockReceivingItem\"}],\"dbName\":null},\"StockReceivingItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"receivingId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"expectedQty\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"receivedGoodQty\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"damagedMeltedQty\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"missingQty\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"unitPrice\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"receiving\",\"kind\":\"object\",\"type\":\"StockReceiving\",\"relationName\":\"StockReceivingToStockReceivingItem\"}],\"dbName\":null},\"DeliveryRun\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"runNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"route\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"area\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"deliveryDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"vehicle\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"driver\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"loader1\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"loader2\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"helper\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"collector\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"dispatchedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"completedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"reconciledAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"stops\",\"kind\":\"object\",\"type\":\"DeliveryStop\",\"relationName\":\"DeliveryRunToDeliveryStop\"},{\"name\":\"reconciliation\",\"kind\":\"object\",\"type\":\"RouteReconciliation\",\"relationName\":\"DeliveryRunToRouteReconciliation\"}],\"dbName\":null},\"DeliveryStop\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"deliveryRunId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bookingId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"storeName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"stopOrder\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"recipientName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"deliveredAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"deliveryRun\",\"kind\":\"object\",\"type\":\"DeliveryRun\",\"relationName\":\"DeliveryRunToDeliveryStop\"},{\"name\":\"customer\",\"kind\":\"object\",\"type\":\"Customer\",\"relationName\":\"CustomerToDeliveryStop\"},{\"name\":\"items\",\"kind\":\"object\",\"type\":\"DeliveryItem\",\"relationName\":\"DeliveryItemToDeliveryStop\"},{\"name\":\"invoice\",\"kind\":\"object\",\"type\":\"CustomerInvoice\",\"relationName\":\"CustomerInvoiceToDeliveryStop\"}],\"dbName\":null},\"DeliveryItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"deliveryStopId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderedQty\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"loadedQty\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"acceptedQty\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"missingQty\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"boRefusedQty\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"intactReturnedQty\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"unitPrice\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"deliveryStop\",\"kind\":\"object\",\"type\":\"DeliveryStop\",\"relationName\":\"DeliveryItemToDeliveryStop\"}],\"dbName\":null},\"CustomerInvoice\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoiceNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"deliveryStopId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"storeName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoiceDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"grossDeliveryAmount\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"billableProductAmount\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"boDeductionAmount\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"shortDeductionAmount\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"intactReturnDeductionAmount\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"otherCharges\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"approvedDiscounts\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"priorBalance\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"netAmountDue\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"totalPaid\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"balanceRemaining\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"paymentStatus\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"collectorName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerSignature\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"deliveryStop\",\"kind\":\"object\",\"type\":\"DeliveryStop\",\"relationName\":\"CustomerInvoiceToDeliveryStop\"},{\"name\":\"payments\",\"kind\":\"object\",\"type\":\"PaymentTransaction\",\"relationName\":\"CustomerInvoiceToPaymentTransaction\"}],\"dbName\":null},\"PaymentTransaction\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoiceId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"amount\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"paymentMethod\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"referenceNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bankName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"checkDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"checkStatus\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"collectedBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"recordedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoice\",\"kind\":\"object\",\"type\":\"CustomerInvoice\",\"relationName\":\"CustomerInvoiceToPaymentTransaction\"}],\"dbName\":null},\"RouteReconciliation\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"deliveryRunId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"reconciliationDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"totalLoadedUnits\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"totalDeliveredAccepted\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"totalIntactReturned\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"totalBoReturned\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"totalMissingUnaccounted\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"expectedCash\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"actualCashCounted\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"cashVariance\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"totalGcash\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"totalBankTransfer\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"totalChecks\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"totalClearedFunds\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"outstandingCredit\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"discrepancyReason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"approvedBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"approvedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"deliveryRun\",\"kind\":\"object\",\"type\":\"DeliveryRun\",\"relationName\":\"DeliveryRunToRouteReconciliation\"}],\"dbName\":null},\"UserNotificationState\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notificationId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isRead\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"isDeleted\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":\"usernotificationstate\"},\"InventoryLedger\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"movementType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"changeQty\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"runningSaleable\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"runningQuarantine\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"reference\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"staffName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":\"inventoryledger\"},\"BoDiscrepancy\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"deliveryRef\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"storeName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quantity\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"unitPrice\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"totalDeduction\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"reason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"reportedBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"disposition\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"dispositionBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"dispositionAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"SelectaPosQuota\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"monthYear\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"targetAmount\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"recordedSales\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"entries\",\"kind\":\"object\",\"type\":\"SelectaPosQuotaEntry\",\"relationName\":\"SelectaPosQuotaToSelectaPosQuotaEntry\"}],\"dbName\":null},\"SelectaPosQuotaEntry\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quotaId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"entryDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"selectaPosRef\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"amount\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"enteredBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"remarks\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"quota\",\"kind\":\"object\",\"type\":\"SelectaPosQuota\",\"relationName\":\"SelectaPosQuotaToSelectaPosQuotaEntry\"}],\"dbName\":null},\"AuditLog\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"action\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"module\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"details\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"timestamp\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"SystemSetting\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"dealerName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"address\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"contactNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"receiptHeader\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"headerSubtitle\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"defaultQuotaTarget\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"freezerTotalFee\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"freezerProductAllocation\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"freezerProcessingFee\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"mondayRoute\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"tuesdayRoute\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"wednesdayActivity\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"thursdayRoute\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fridayRoute\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"allowNegativeStock\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"loginPageConfig\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"StockAdjustmentRequest\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"currentStock\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"requestedChange\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"proposedStock\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"reason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"staffId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"staffName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"adminId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"adminName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"adminNotes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"reviewedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":\"stockadjustmentrequest\"}},\"enums\":{},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = {
  getRuntime: () => require('./query_engine_bg.js'),
  getQueryEngineWasmModule: async () => {
    const loader = (await import('#wasm-engine-loader')).default
    const engine = (await loader).default
    return engine
  }
}

config.injectableEdgeEnv = () => ({
  parsed: {}
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)
