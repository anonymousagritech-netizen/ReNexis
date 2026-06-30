import { PrismaClient } from '@prisma/client';
import { seedDemoData } from '../src/lib/seedData';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ReNexis demo data...');
  const result = await seedDemoData(prisma);

  if (result.alreadySeeded) {
    console.log('Demo business data already present — only users/entity were upserted.');
  } else {
    console.log('Seed complete.');
  }
  console.log('Demo login credentials (password for all: Demo@12345):');
  result.demoAccounts.forEach((r) => console.log(`  ${r.role.padEnd(20)} ${r.email}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
