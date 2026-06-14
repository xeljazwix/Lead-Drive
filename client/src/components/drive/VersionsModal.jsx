import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { filesApi } from '../../api/drive.js';
import { formatBytes, formatDate } from '../../utils/format.js';
import { toast } from '../ui/Toast.jsx';
import { useTranslation } from 'react-i18next';
import styles from './VersionsModal.module.css';

export function VersionsModal({ file, onClose }) {
  const { t } = useTranslation();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);

  useEffect(() => {
    filesApi.getVersions(file.id)
      .then(d => setVersions(d.versions))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [file.id]);

  async function handleRestore(vn) {
    setRestoring(vn);
    try {
      await filesApi.restoreVersion(file.id, vn);
      toast.success(`Restored version ${vn} as a new version`);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRestoring(null);
    }
  }

  return (
    <Modal open onClose={onClose} title={`${t('modals.versionHistory')} — ${file.name}`} width={540}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>{t('admin.loading')}</div>
      ) : (
        <div className={styles.list}>
          {versions.map((v, i) => (
            <div key={v.id} className={styles.item}>
              <div className={styles.badge}>v{v.versionNumber}</div>
              <div className={styles.info}>
                <p className={styles.date}>{formatDate(v.createdAt)}</p>
                <p className={styles.size}>{formatBytes(v.sizeBytes)}</p>
                <p className={styles.hash} title={v.checksum}>SHA-256: {v.checksum.slice(0, 16)}…</p>
              </div>
              {i > 0 && (
                <Button
                  variant="ghost" size="sm"
                  loading={restoring === v.versionNumber}
                  onClick={() => handleRestore(v.versionNumber)}
                >
                  {t('drive.restore')}
                </Button>
              )}
              {i === 0 && <span className={styles.currentBadge}>{t('drive.active')}</span>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
