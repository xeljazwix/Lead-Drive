// Tiny nanoid-compatible ID generator — avoids importing the package in utils
export function nanoid(size = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(size)))
    .map(b => chars[b % chars.length]).join('');
}
