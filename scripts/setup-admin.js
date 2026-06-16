#!/usr/bin/env node
import '../src/preboot.js';

// Dynamically import the real setup script AFTER preboot is finished.
import('./setup-admin-impl.js').catch(err => {
  console.error("Failed to run setup:", err);
  process.exit(1);
});
