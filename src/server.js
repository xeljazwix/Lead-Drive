import './preboot.js';

// Dynamically import the real server implementation AFTER preboot is finished.
// This prevents Node.js from parsing the uninitialized @prisma/client stub
// during the static module resolution phase.
import('./server-impl.js').catch(err => {
  console.error("Failed to boot server:", err);
  process.exit(1);
});
