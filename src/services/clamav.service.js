import NodeClam from 'clamscan';
import { logger } from '../utils/logger.js';
import { ThreatDetectedError } from '../utils/errors.js';

// ─── ClamAV Service ───────────────────────────────────────────────────────────
// Connects to the ClamAV daemon via TCP socket.
// In production (or when CLAMAV_ENABLED=true), a failed connection is a hard error.
// In development (or when CLAMAV_ENABLED=false), unavailability is logged as a
// warning and uploads proceed — never silently skip in production.

const CLAMAV_ENABLED = process.env.CLAMAV_ENABLED !== 'false';
const IS_PRODUCTION  = process.env.NODE_ENV === 'production';

// When running in dev without Docker, ClamAV is usually not available.
// We log a warning once so the developer is aware.
let warnedAboutMissingClamAV = false;

let clamscanInstance = null;

async function getClamAV() {
  if (clamscanInstance) return clamscanInstance;

  const host = process.env.CLAMAV_HOST ?? '127.0.0.1';
  const port = parseInt(process.env.CLAMAV_PORT ?? '3310', 10);

  logger.info('Initializing ClamAV connection', { host, port });

  try {
    const clamAV = await new NodeClam().init({
      removeInfected: false,
      quarantineInfected: false,
      scanLog: null,
      debugMode: false,
      clamdscan: {
        host,
        port,
        timeout: 10000,       // 10 s — fail fast in dev
        localFallback: false,
        active: true,
      },
      preference: 'clamdscan',
    });

    clamscanInstance = clamAV;
    logger.info('ClamAV initialized successfully');
    return clamAV;
  } catch (err) {
    // Reset so the next request retries instead of reusing a broken instance
    clamscanInstance = null;
    throw err;
  }
}

/**
 * Scan a file at the given filesystem path.
 * @param {string} filePath  Absolute path to the temp file.
 * @throws {ThreatDetectedError} if a threat is found.
 * @throws {Error}               if ClamAV is required but unavailable.
 */
export async function scanFile(filePath) {
  // ── Hard-disabled via env var ──────────────────────────────────────────────
  if (!CLAMAV_ENABLED) {
    logger.warn('ClamAV scanning is DISABLED (CLAMAV_ENABLED=false). File NOT scanned.', { filePath });
    return;
  }

  let clamAV;
  try {
    clamAV = await getClamAV();
  } catch (connErr) {
    if (IS_PRODUCTION) {
      // In production, a missing AV daemon is a hard error — never skip scanning
      throw new Error(`ClamAV daemon unavailable: ${connErr.message}`);
    }

    // In development, warn once and allow the upload to proceed
    if (!warnedAboutMissingClamAV) {
      logger.warn(
        'ClamAV daemon is NOT reachable — virus scanning is SKIPPED in development. ' +
        'Start the ClamAV container (docker-compose up clamav) to enable scanning.',
        { host: process.env.CLAMAV_HOST, port: process.env.CLAMAV_PORT }
      );
      warnedAboutMissingClamAV = true;
    }
    return; // Skip scan in dev
  }

  logger.info('Scanning file', { filePath });
  const { isInfected, viruses } = await clamAV.scanFile(filePath);

  if (isInfected) {
    const threatName = viruses?.[0] ?? 'Unknown';
    logger.security('VIRUS_DETECTED', { filePath, threatName });
    throw new ThreatDetectedError(threatName);
  }

  logger.info('Scan clean', { filePath });
}

/**
 * Probe the ClamAV daemon health (used in startup readiness check).
 * @returns {Promise<boolean>}
 */
export async function isClamAVReady() {
  try {
    await getClamAV();
    return true;
  } catch {
    return false;
  }
}

