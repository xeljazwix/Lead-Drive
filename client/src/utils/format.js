export function formatBytes(bytes) {
  if (!bytes || bytes === '0') return '0 B';
  const n = Number(bytes);
  if (n === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${parseFloat((n / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: days > 365 ? 'numeric' : undefined });
}

export function formatQuota(used, total) {
  return `${formatBytes(used)} of ${formatBytes(total)}`;
}

export function quotaPercent(used, total) {
  if (!total || total === '0') return 0;
  return Math.min(100, (Number(used) / Number(total)) * 100);
}
