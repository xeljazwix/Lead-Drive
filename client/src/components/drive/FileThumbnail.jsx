import { useState, useEffect, useRef } from 'react';
import { FileTypeIcon, getFileColor } from './FileTypeIcon.jsx';
import styles from './FileThumbnail.module.css';

/** Types we actively fetch a real preview for */
function getPreviewType(mimeType) {
  if (!mimeType) return 'icon';
  const m = mimeType.toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  return 'icon';
}

import { BASE } from '../../api/client.js';

async function fetchBlob(fileId) {
  const token = localStorage.getItem('cd_token');
  const res = await fetch(`${BASE}/files/${fileId}/thumbnail`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

export function FileThumbnail({ file }) {
  const [thumb, setThumb]   = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError]   = useState(false);
  const containerRef        = useRef(null);
  const fetchedRef          = useRef(false);

  const previewType = getPreviewType(file.mimeType);
  const accentColor = getFileColor(file.mimeType, file.name);

  // Use IntersectionObserver so we only fetch when the card scrolls into view
  useEffect(() => {
    if (previewType === 'icon' || previewType === 'audio') return;

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || fetchedRef.current) return;
        fetchedRef.current = true;

        fetchBlob(file.id)
          .then(blob => {
            setThumb(URL.createObjectURL(blob));
          })
          .catch(() => {
            setError(true);
          });
      },
      { rootMargin: '100px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [file.id, previewType]);

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (thumb && thumb.startsWith('blob:')) URL.revokeObjectURL(thumb);
    };
  }, [thumb]);

  /* ── Audio waveform visual ──────────────────────────────────────── */
  if (previewType === 'audio') {
    return (
      <div className={styles.audioThumb} style={{ background: `${accentColor}18` }} ref={containerRef}>
        <div className={styles.waveform}>
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className={styles.bar}
              style={{
                background: accentColor,
                height: `${20 + Math.abs(Math.sin(i * 1.3)) * 44}%`,
                animationDelay: `${(i * 0.07).toFixed(2)}s`,
              }}
            />
          ))}
        </div>
        <span className={styles.iconOverlay}>
          <FileTypeIcon mimeType={file.mimeType} filename={file.name} size={22} />
        </span>
      </div>
    );
  }

  /* ── Fallback Icon (Error or Document) ──────────────────────────── */
  if (error || previewType === 'icon') {
    return (
      <div className={styles.audioThumb} style={{ background: `${accentColor}10` }} ref={containerRef}>
        <FileTypeIcon mimeType={file.mimeType} filename={file.name} size={36} />
      </div>
    );
  }

  /* ── Image / Video thumbnail ────────────────────────────────────── */
  if (previewType === 'image' || previewType === 'video') {
    return (
      <div className={styles.mediaThumb} ref={containerRef}>
        {thumb ? (
          <>
            <img
              src={thumb}
              alt=""
              className={`${styles.thumbImg} ${loaded ? styles.visible : ''}`}
              onLoad={() => setLoaded(true)}
            />
            {!loaded && <div className={styles.shimmer} />}
          </>
        ) : (
          <div className={styles.shimmer} />
        )}
        {previewType === 'video' && (
          <span className={styles.playBadge}>▶</span>
        )}
      </div>
    );
  }

  /* ── Icon / badge fallback ──────────────────────────────────────── */
  return (
    <div
      className={styles.iconThumb}
      style={{ background: `${accentColor}14` }}
      ref={containerRef}
    >
      <FileTypeIcon mimeType={file.mimeType} filename={file.name} size={48} />
    </div>
  );
}
