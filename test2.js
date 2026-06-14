import { ZipArchive } from 'archiver';
const archive = new ZipArchive({ zlib: { level: 4 } });
console.log('ZipArchive instantiated:', typeof archive.file, typeof archive.finalize);
