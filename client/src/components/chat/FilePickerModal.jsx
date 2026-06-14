import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { filesApi } from '../../api/drive.js';
import { toast } from '../ui/Toast.jsx';
import { Modal } from '../ui/Modal.jsx';
import { FileText, Image as ImageIcon, Film, Music, Archive, File } from 'lucide-react';
import styles from './FilePickerModal.module.css';

const getIcon = (mime) => {
  if (mime.startsWith('image/')) return <ImageIcon size={24} color="var(--accent)" />;
  if (mime.startsWith('video/')) return <Film size={24} color="#f59e0b" />;
  if (mime.startsWith('audio/')) return <Music size={24} color="#ec4899" />;
  if (mime.includes('pdf') || mime.includes('document') || mime.includes('msword')) return <FileText size={24} color="#3b82f6" />;
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('gzip')) return <Archive size={24} color="#8b5cf6" />;
  return <File size={24} color="#6b7280" />;
};

export default function FilePickerModal({ onClose, onSelect }) {
  const { t } = useTranslation();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    filesApi.getRecent()
      .then(d => setFiles(d.files)) 
      .catch(err => toast.error('Failed to load files'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Modal open={true} title={t('chat.selectFile') || "Select File to Attach"} onClose={onClose}>
      <div className={styles.container}>
        {loading ? (
          <p className={styles.msg}>{t('admin.loading') || 'Loading...'}</p>
        ) : files.length === 0 ? (
          <p className={styles.msg}>{t('chat.noFiles') || "No files available."}</p>
        ) : (
          <div className={styles.fileList}>
            {files.map(f => (
              <div key={f.id} className={styles.fileItem} onClick={() => onSelect(f)}>
                {getIcon(f.mimeType)}
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{f.name}</span>
                  <span className={styles.fileSize}>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
