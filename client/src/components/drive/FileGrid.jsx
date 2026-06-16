import { useRef } from 'react';
import { useDriveStore } from '../../store/drive.store.js';
import { FileCard } from './FileCard.jsx';
import { FolderCard } from './FolderCard.jsx';
import { FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDragSelect } from '../../hooks/useDragSelect.js';
import { Loader } from '../ui/Loader.jsx';
import styles from './FileGrid.module.css';
import { createPortal } from 'react-dom';

export function FileGrid({ folders, files, onFolderOpen, onFolderRename, onFolderTrash, onFolderShare, onFolderCompress, onFolderDownload,
  onFileStar, onFileTrash, onFileShare, onFileVersions, onFileDownload, onFilePreview, onFileCompress, onFileExtract, onMoveToFolder, loading,
  containerRef: externalContainerRef, selectionBox: externalSelectionBox }) {
  const { t } = useTranslation();
  const { view } = useDriveStore();
  const empty = folders.length === 0 && files.length === 0;
  const itemsList = [...folders, ...files];
  const internalContainerRef = useRef(null);
  const containerRef = externalContainerRef || internalContainerRef;
  const internalSelectionBox = useDragSelect(externalContainerRef ? { current: null } : containerRef, itemsList);
  const selectionBox = externalSelectionBox !== undefined ? externalSelectionBox : internalSelectionBox;

  if (loading) return <Loader fullScreen={false} text="Loading..." />;

  if (empty) return (
    <div className={styles.empty} ref={containerRef} style={{ flex: 1 }}>
      {selectionBox && createPortal(
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
        }} />,
        document.body
      )}
      <div className={styles.emptyIcon}>
        <FolderOpen size={48} color="var(--text-muted)" />
      </div>
      <p className={styles.emptyTitle}>{t('drive.noFiles')}</p>
      <p className={styles.emptySub}>{t('drive.dropToUpload')}</p>
    </div>
  );

  return (
    <div ref={containerRef} className={`${styles.container} ${view === 'list' ? styles.listContainer : ''}`} style={{ position: 'relative', minHeight: '100%', flex: 1 }}>
      {selectionBox && createPortal(
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
        }} />,
        document.body
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
            {folders.map((f, i) => (
              <FolderCard key={f.id} folder={f} view={view} itemsList={itemsList} index={i}
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
            {files.map((f, i) => (
              <FileCard key={f.id} file={f} view={view} itemsList={itemsList} index={i}
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
