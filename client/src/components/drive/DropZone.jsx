import { useCallback, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './DropZone.module.css';

export function DropZone({ onFiles, children }) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);

  const onDragOver  = useCallback((e) => { 
    // Only show dropzone for external OS files, ignore internal app elements
    if (!e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/json')) return;
    e.preventDefault(); 
    setDragging(true);  
  }, []);
  
  const onDragLeave = useCallback((e) => { 
    if (e.currentTarget === e.target) setDragging(false); 
  }, []);
  
  const onDrop      = useCallback((e) => {
    // If it's an internal drag, don't trigger upload
    if (!e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/json')) return;
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  }, [onFiles]);

  return (
    <div
      className={`${styles.zone} ${dragging ? styles.dragging : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
      {dragging && (
        <div className={styles.overlay}>
          <div className={styles.overlayContent}>
            <span className={styles.overlayIcon}>
              <UploadCloud size={48} color="var(--primary)" />
            </span>
            <p className={styles.overlayText}>{t('drive.dropToUpload')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
