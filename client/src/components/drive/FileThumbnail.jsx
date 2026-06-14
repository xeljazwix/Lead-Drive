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

async function fetchBlob(fileId) {
  const token = localStorage.getItem('cd_token');
  const res = await fetch(`/api/files/${fileId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

/** Captures the first rendered video frame on a canvas → data URL */
async function grabVideoFrame(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    video.onloadeddata = () => { video.currentTime = 0; };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = video.videoWidth  || 320;
      canvas.height = video.videoHeight || 180;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Video load error')); };
  });
}

export function FileThumbnail({ file }) {
  const [thumb, setThumb]   = useState(null);
  const [loaded, setLoaded] = useState(false);
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
            if (previewType === 'image') {
              setThumb(URL.createObjectURL(blob));
            } else if (previewType === 'video') {
              return grabVideoFrame(blob).then(dataUrl => setThumb(dataUrl));
            }
          })
          .catch(() => {/* fall back to icon silently */});
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
