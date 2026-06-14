import { prepareZipItems, compressToDrive } from './src/services/archive.service.js';
import prisma from './src/utils/prisma.js';
async function run() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) return console.log('No user');
    const folder = await prisma.folder.findFirst({ where: { ownerId: user.id } });
    if (folder) {
      console.log('Compressing folder', folder.id);
      await compressToDrive([], [folder.id], null, user.id);
      console.log('Success');
    } else {
      console.log('No folder found');
    }
  } catch(e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
