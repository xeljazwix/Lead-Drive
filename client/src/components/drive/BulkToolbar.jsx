import { Star, Download, Share2, Trash2, X, Archive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './BulkToolbar.module.css';

export function BulkToolbar({
  selectedCount,
  hasFiles,
  hasFolders,
  onClear,
  onStar,
  onDownload,
  onShare,
  onCompress,
  onTrash
}) {
  const { t } = useTranslation();
  const visible = selectedCount > 0;

  return (
    <div className={`${styles.toolbar} ${visible ? styles.visible : ''}`}>
      <div className={styles.info}>
        <button className={styles.btn} style={{ padding: 6, borderRadius: '50%' }} onClick={onClear} title={t('drive.clearSelection')}>
          <X size={14} />
        </button>
        <span className={styles.count}>{selectedCount} {selectedCount === 1 ? t('admin.totalFiles').split(' ')[1] || 'item' : t('admin.totalFiles').split(' ')[1] || 'items'} {t('drive.selected')}</span>
      </div>
      
      <div className={styles.actions}>
        {hasFiles && !hasFolders && (
          <button className={styles.btn} onClick={onStar} title={t('drive.star')}>
            <Star size={14} />
            <span>{t('drive.star')}</span>
          </button>
        )}
        
        <button className={styles.btn} onClick={onDownload} title={t('modals.download')}>
          <Download size={14} />
          <span>{t('modals.download')}</span>
        </button>
        
        <button className={styles.btn} onClick={onCompress} title={t('drive.compress', 'Compress')}>
          <Archive size={14} />
          <span>{t('drive.compress', 'Compress')}</span>
        </button>
        
        <button className={styles.btn} onClick={onShare} title={t('drive.share')}>
          <Share2 size={14} />
          <span>{t('drive.share')}</span>
        </button>
        
        <button className={`${styles.btn} ${styles.dangerBtn}`} onClick={onTrash} title={t('drive.delete')}>
          <Trash2 size={14} />
          <span>{t('drive.delete')}</span>
        </button>
      </div>
    </div>
  );
}
