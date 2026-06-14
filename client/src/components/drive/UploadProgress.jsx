import { useDriveStore } from '../../store/drive.store.js';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import styles from './UploadProgress.module.css';

export function UploadProgress() {
  const { t } = useTranslation();
  const { uploads, removeUpload } = useDriveStore();

  if (uploads.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('drive.uploads', 'Uploads')} ({uploads.length})</h3>
      </div>
      <div className={styles.list}>
        {uploads.map(upload => (
          <div key={upload.id} className={styles.item}>
            <div className={styles.itemInfo}>
              <span className={styles.itemName} title={upload.name}>{upload.name}</span>
              <span className={styles.itemStatus}>
                {upload.status === 'uploading' && `${upload.progress}%`}
                {upload.status === 'scanning' && t('drive.scanning', 'Scanning for viruses...')}
                {upload.status === 'done' && <CheckCircle2 size={14} className={styles.iconSuccess} />}
                {upload.status === 'error' && <AlertCircle size={14} className={styles.iconError} title={upload.error} />}
              </span>
            </div>
            
            {upload.status === 'uploading' && (
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${upload.progress}%` }} />
              </div>
            )}
            
            {upload.status === 'scanning' && (
              <div className={styles.progressBar}>
                <div className={`${styles.progressFill} ${styles.progressIndeterminate}`} style={{ width: '100%' }} />
              </div>
            )}
            
            {upload.status === 'error' && (
              <div className={styles.errorText}>
                {upload.error || t('drive.uploadFailed', 'Upload failed')}
              </div>
            )}
            
            <button className={styles.closeBtn} onClick={() => removeUpload(upload.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
