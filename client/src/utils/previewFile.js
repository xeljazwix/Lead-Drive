/**
 * previewFile — decides how to open a file preview.
 *
 * - PDF and other full-screen document types are fetched as a blob
 *   (with the Authorization header) and opened in a new browser tab.
 * - Everything else triggers the in-app FileViewerModal.
 *
 * @param {object}   file      - file record (id, mimeType, name, size, …)
 * @param {function} openModal - (type, data) => void   from useModals()
 */

import { BASE } from '../api/client.js';

const FULLSCREEN_TYPES = new Set([
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

function isFullscreenType(mimeType) {
  if (!mimeType) return false;
  return FULLSCREEN_TYPES.has(mimeType.toLowerCase());
}

async function openInNewTab(fileId) {
  const token = localStorage.getItem('cd_token');
  const res = await fetch(`${BASE}/files/${fileId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);

  // Open the tab — the blob URL only lives in the tab's lifetime
  const tab = window.open(url, '_blank');

  // Revoke the URL after a short delay so the tab has time to load it
  if (tab) {
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  } else {
    // Pop-up blocked — fall back: copy URL to clipboard or revoke immediately
    URL.revokeObjectURL(url);
    throw new Error('Pop-up blocked. Please allow pop-ups for this site and try again.');
  }
}

export async function previewFile(file, openModal) {
  if (isFullscreenType(file.mimeType)) {
    await openInNewTab(file.id);
  } else {
    openModal('viewer', file);
  }
}
