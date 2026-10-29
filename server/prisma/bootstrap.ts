import bcrypt from 'bcryptjs';
import prisma from '../src/db.js';

async function main() {
  const adminPassword = await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD || 'admin123', 10);
  const staffPassword = await bcrypt.hash(process.env.INITIAL_STAFF_PASSWORD || 'staff123', 10);
  const accounts = [
    { username: 'admin', name: 'Dealer Admin', email: 'admin@selecta.com', role: 'Admin', passwordHash: adminPassword, phone: '0917-000-0001', accessKey: 'SELECTA-ADMIN-2026' },
    { username: 'staff', name: 'Dealer Staff', email: 'staff@selecta.com', role: 'Staff', passwordHash: staffPassword, phone: '0917-000-0002', accessKey: 'SELECTA-STAFF-2026' },
  ];

  for (const account of accounts) {
    await prisma.user.upsert({
      where: { username: account.username },
      update: { name: account.name, role: account.role, passwordHash: account.passwordHash, status: 'Active' },
      create: { id: account.username === 'admin' ? 'USR-ADMIN' : 'USR-STAFF', ...account, status: 'Active' },
    });
  }

  await prisma.systemSetting.upsert({
    where: { id: 'SYSTEM_SETTINGS' },
    update: {},
    create: {
      id: 'SYSTEM_SETTINGS',
      dealerName: 'Llano Selecta Dealer',
      address: 'Sayre Highway, Poblacion, Valencia City, Bukidnon',
      contactNumber: '0917-555-4321',
      receiptHeader: 'LLANO ICE CREAM DEALERSHIP - VALENCIA CITY',
      defaultQuotaTarget: 1000000,
      freezerTotalFee: 10000,
      freezerProductAllocation: 9000,
      freezerProcessingFee: 1000,
      allowNegativeStock: false,
    },
  });
  console.log('Default Admin and Staff accounts are ready. Change their passwords after the first sign-in.');
}

main()
  .catch((error) => {
    console.error('Unable to prepare the database:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
