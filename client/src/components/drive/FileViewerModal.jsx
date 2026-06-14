import { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { filesApi } from '../../api/drive.js';
import { formatBytes, formatDate } from '../../utils/format.js';
import { Music, File, Download, Share2, Loader } from 'lucide-react';
import { toast } from '../ui/Toast.jsx';
import { useTranslation } from 'react-i18next';
import styles from './FileViewerModal.module.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getViewerType(mimeType, filename) {
  if (!mimeType) return 'generic';

  const mime = mimeType.toLowerCase();
  const name = (filename ?? '').toLowerCase();

  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  // PDF is NOT handled here — previewFile.js opens it in a new tab

  if (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/javascript' ||
    mime === 'application/xml' ||
    name.endsWith('.md') ||
    name.endsWith('.js') ||
    name.endsWith('.jsx') ||
    name.endsWith('.ts') ||
    name.endsWith('.tsx') ||
    name.endsWith('.json') ||
    name.endsWith('.css') ||
    name.endsWith('.html')
  ) {
    return 'text';
  }

  return 'generic';
}

function getModalWidth(type) {
  switch (type) {
    case 'text':  return 850;
    case 'image':
    case 'video': return 800;
    default:      return 480;
  }
}

/**
 * Fetches text file contents. Media files use streaming.
 */
async function fetchTextContent(fileId) {
  const token = localStorage.getItem('cd_token');
  const res = await fetch(`/api/files/${fileId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.text();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FileViewerModal({ file, onClose, onShare }) {
  const { t } = useTranslation();
  const [blobUrl, setBlobUrl]       = useState(null);
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const blobRef = useRef(null);

  const type = getViewerType(file.mimeType, file.name);

  // Fetch the file content on mount (or when file changes)
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setBlobUrl(null);
    setTextContent('');

    // Generic card — nothing to fetch
    if (type === 'generic') {
      setLoading(false);
      return;
    }

    // Text / code — fetch as text
    if (type === 'text') {
      if (file.size > 2 * 1024 * 1024) {
        setError('File is too large to preview as text (> 2 MB).');
        setLoading(false);
        return;
      }
      fetchTextContent(file.id)
        .then(text  => { if (!cancelled) setTextContent(text); })
        .catch(err  => { if (!cancelled) setError(err.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return;
    }

    // Image / video / audio / pdf — stream directly via query token
    const token = localStorage.getItem('cd_token');
    const streamUrl = `/api/files/${file.id}/download?token=${token}`;
    setBlobUrl(streamUrl);
    setLoading(false);

    return () => {
      cancelled = true;
    };
  }, [file.id, file.size, type]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleDownload() { filesApi.download(file.id, file.name, toast); }
  function handleShareClick() { onClose(); if (onShare) onShare(file); }

  // ─── Content ────────────────────────────────────────────────────────────────

  function renderContent() {
    // Loading / error states shared by blob-fetched types
    if (type !== 'generic' && type !== 'text') {
      if (loading) return (
        <div className={styles.spinnerWrapper}>
          <Loader size={32} style={{ animation: 'spin 1.2s linear infinite', marginBottom: 12 }} />
          <p>{t('admin.loading')}</p>
        </div>
      );
      if (error) return <div className={styles.errorWrapper}>⚠ {error}</div>;
    }

    switch (type) {
      case 'image':
        return (
          <div className={styles.imageWrapper}>
            <img src={blobUrl} alt={file.name} className={styles.image} />
          </div>
        );

      case 'video':
        return (
          <div className={styles.videoWrapper}>
            <video src={blobUrl} controls autoPlay playsInline className={styles.video} />
          </div>
        );

      case 'audio':
        return (
          <div className={styles.audioWrapper}>
            <div className={styles.audioDisc}><Music size={40} /></div>
            <audio src={blobUrl} controls autoPlay playsInline className={styles.audioPlayer} />
          </div>
        );

      case 'pdf':
        return (
          <div className={styles.pdfWrapper}>
            <iframe src={blobUrl} className={styles.pdfFrame} title={file.name} />
          </div>
        );

      case 'text':
        if (loading) return (
          <div className={styles.spinnerWrapper}>
            <Loader size={32} style={{ animation: 'spin 1.2s linear infinite', marginBottom: 12 }} />
            <p>{t('admin.loading')}</p>
          </div>
        );
        if (error) return <div className={styles.errorWrapper}>⚠ {error}</div>;
        return <pre className={styles.textWrapper}>{textContent}</pre>;

      case 'generic':
      default:
        return (
          <div className={styles.genericCard}>
            <div className={styles.genericIcon}><File size={36} /></div>
            <div className={styles.genericInfo}>
              <p className={styles.genericName}>{file.name}</p>
              <p className={styles.genericMeta}>
                {formatBytes(file.size)} · {formatDate(file.updatedAt)}
              </p>
            </div>
            <button className={styles.genericDownloadBtn} onClick={handleDownload}>
              <Download size={16} />
              <span>{t('modals.download')}</span>
            </button>
          </div>
        );
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const footerActions = (
    <>
      <Button variant="ghost" onClick={onClose}>{t('admin.cancel')}</Button>
      <Button variant="ghost" icon={<Share2 size={14} />} onClick={handleShareClick}>{t('drive.share')}</Button>
      {type !== 'generic' && (
        <Button icon={<Download size={14} />} onClick={handleDownload}>{t('modals.download')}</Button>
      )}
    </>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={type === 'generic' ? t('nav.view') : file.name}
      width={getModalWidth(type)}
      footer={footerActions}
    >
      <div className={styles.container}>
        {renderContent()}
      </div>
    </Modal>
  );
}
