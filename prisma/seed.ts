import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = 'abdiqani4321'; // Change this to your desired password
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: {},
    create: {
      name: 'Abdiqani',
      email: 'abdiqani@admin.com',
      password: hashedPassword,
      role: 'superAdmin', // must match enum in schema.prisma
    },
  });

  console.log('Superadmin created!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
