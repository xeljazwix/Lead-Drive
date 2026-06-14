import { useRef } from 'react';
import { useDriveStore } from '../../store/drive.store.js';
import { FileCard } from './FileCard.jsx';
import { FolderCard } from './FolderCard.jsx';
import { FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDragSelect } from '../../hooks/useDragSelect.js';
import styles from './FileGrid.module.css';

export function FileGrid({ folders, files, onFolderOpen, onFolderRename, onFolderTrash, onFolderShare, onFolderCompress, onFolderDownload,
  onFileStar, onFileTrash, onFileShare, onFileVersions, onFileDownload, onFilePreview, onFileCompress, onFileExtract, onMoveToFolder, loading }) {
  const { t } = useTranslation();
  const { view } = useDriveStore();
  const empty = folders.length === 0 && files.length === 0;
  const itemsList = [...folders, ...files];
  const containerRef = useRef(null);
  const selectionBox = useDragSelect(containerRef, itemsList);

  if (loading) return (
    <div className={styles.center}>
      <div className={styles.spinner} />
      <p className="text-muted text-sm" style={{ marginTop: 12 }}>Loading…</p>
    </div>
  );

  if (empty) return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <FolderOpen size={48} color="var(--text-muted)" />
      </div>
      <p className={styles.emptyTitle}>{t('drive.noFiles')}</p>
      <p className={styles.emptySub}>{t('drive.dropToUpload')}</p>
    </div>
  );

  return (
    <div ref={containerRef} className={`${styles.container} ${view === 'list' ? styles.listContainer : ''}`} style={{ position: 'relative', minHeight: '100%' }}>
      {selectionBox && (
        <div style={{
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: 9999,
          left: selectionBox.left,
          top: selectionBox.top,
          width: selectionBox.width,
          height: selectionBox.height,
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.8)',
          borderRadius: 2
        }} />
      )}
      {/* Folders section */}
      {folders.length > 0 && (
        <section className={styles.section}>
          {view === 'list' && (
            <div className={`${styles.listHeader}`}>
              <span />
              <span>{t('drive.name')}</span>
              <span style={{ textAlign: 'right' }}>{t('drive.size')}</span>
              <span style={{ textAlign: 'right' }}>{t('drive.date')}</span>
              <span /><span />
            </div>
          )}
          <div className={view === 'list' ? styles.list : styles.grid}>
            {folders.map(f => (
              <FolderCard key={f.id} folder={f} view={view} itemsList={itemsList}
                onOpen={onFolderOpen} onRename={onFolderRename}
                onTrash={onFolderTrash} onShare={onFolderShare}
                onCompress={onFolderCompress} onDownload={onFolderDownload}
                onMoveToFolder={onMoveToFolder}
              />
            ))}
          </div>
        </section>
      )}

      {/* Files section */}
      {files.length > 0 && (
        <section className={styles.section}>
          <div className={view === 'list' ? styles.list : styles.grid}>
            {files.map(f => (
              <FileCard key={f.id} file={f} view={view} itemsList={itemsList}
                onStar={onFileStar} onTrash={onFileTrash}
                onShare={onFileShare} onVersions={onFileVersions}
                onDownload={onFileDownload} onPreview={onFilePreview}
                onCompress={onFileCompress} onExtract={onFileExtract}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
