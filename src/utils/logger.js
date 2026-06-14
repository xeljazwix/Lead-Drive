// ─── Minimal Structured Logger ────────────────────────────────────────────────
// Keeps the dependency footprint lean (no winston/pino in dev) while
// producing JSON output in production for log aggregators.

const isProd = process.env.NODE_ENV === 'production';

function formatMessage(level, message, meta = {}) {
  if (isProd) {
    return JSON.stringify({ level, message, ts: new Date().toISOString(), ...meta });
  }
  const ts = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `[${ts}] ${level.toUpperCase()} ${message}${metaStr}`;
}

export const logger = {
  info:  (msg, meta) => console.log(formatMessage('info', msg, meta)),
  warn:  (msg, meta) => console.warn(formatMessage('warn', msg, meta)),
  error: (msg, meta) => console.error(formatMessage('error', msg, meta)),
  debug: (msg, meta) => {
    if (!isProd) console.debug(formatMessage('debug', msg, meta));
  },
  // Security-specific logging — always emitted, always JSON for SIEM ingestion
  security: (event, meta) =>
    console.error(JSON.stringify({
      SECURITY: true,
      event,
      ts: new Date().toISOString(),
      ...meta,
    })),
};
