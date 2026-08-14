const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const SUPPLIERS_JSON = path.join(__dirname, '..', '..', 'scraper', 'data', 'suppliers.json');
const DEFAULT_PASSWORD_HASH = '$2a$10$IyfWpe/v6d3OiOESKMx74eJNfiLnHx0T2oPH.isjyKrGgqXVHFRSG'; // 123456

async function run() {
  const suppliers = JSON.parse(fs.readFileSync(SUPPLIERS_JSON, 'utf8'));
  let provisioned = 0;

  for (const supplier of suppliers) {
    // Do not overwrite passwords an administrator has already changed.
    const result = await prisma.supplier.updateMany({
      where: { code: supplier.code, passwordHash: null },
      data: { passwordHash: DEFAULT_PASSWORD_HASH }
    });
    provisioned += result.count;
  }

  console.log(`Supplier accounts ready; initialized ${provisioned} account(s).`);
}

run()
  .catch((error) => {
    console.error('Unable to initialize supplier accounts:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
