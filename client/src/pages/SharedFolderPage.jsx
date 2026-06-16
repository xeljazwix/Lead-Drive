import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { foldersApi, filesApi } from '../api/drive.js';
import { Header } from '../components/layout/Header.jsx';
import { FileCard } from '../components/drive/FileCard.jsx';
import { FolderCard } from '../components/drive/FolderCard.jsx';
import { FileViewerModal } from '../components/drive/FileViewerModal.jsx';
import { previewFile } from '../utils/previewFile.js';
import { useModals } from '../hooks/useModals.js';
import { toast } from '../components/ui/Toast.jsx';
import { useDriveStore } from '../store/drive.store.js';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './SimpleListPage.module.css';
import crumbStyles from './SharedFolderPage.module.css';

export function SharedFolderPage() {
  const { id: rootId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { view } = useDriveStore();
  const { modal, openModal, closeModal } = useModals();

  // breadcrumb: [{ id, name }, ...]  — index 0 is the root shared folder
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // current folder id — starts at rootId, changes as user navigates deeper
  const currentId = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].id : rootId;

  const load = useCallback(() => {
    setLoading(true);
    foldersApi.getContents(currentId)
      .then(d => {
        // On first load, seed the breadcrumb with the root folder
        if (breadcrumb.length === 0) {
          setBreadcrumb([{ id: d.folder.id, name: d.folder.name }]);
        }
        setFolders(d.subFolders ?? []);
        setFiles(d.files ?? []);
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  function handleFolderOpen(folder) {
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }]);
  }

  function handleBreadcrumbNav(index) {
    setBreadcrumb(prev => prev.slice(0, index + 1));
  }

  return (
    <>
      <Header title={breadcrumb[0]?.name ?? t('nav.sharedWithMe')} />

      {/* Breadcrumb */}
      <div className={crumbStyles.breadcrumb}>
        <button className={crumbStyles.crumbBtn} onClick={() => navigate('/drive/shared')}>
          <Home size={14} /> {t('nav.sharedWithMe')}
        </button>
        {breadcrumb.map((crumb, i) => (
          <span key={crumb.id} className={crumbStyles.crumbPart}>
            <ChevronRight size={14} className={crumbStyles.chevron} />
            <button
              className={`${crumbStyles.crumbBtn} ${i === breadcrumb.length - 1 ? crumbStyles.active : ''}`}
              onClick={() => handleBreadcrumbNav(i)}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      <div className={styles.container}>
        {loading && <Loader fullScreen={false} text={t('admin.loading')} />}

        {!loading && folders.length === 0 && files.length === 0 && (
          <p className={styles.msg}>{t('drive.empty') || 'This folder is empty.'}</p>
        )}

        {folders.length > 0 && (
          <>
            <h2 className={styles.section}>{t('drive.folders') || 'Folders'} ({folders.length})</h2>
            <div className={`${styles.grid} ${view === 'list' ? styles.list : ''}`}>
              {folders.map(f => (
                <FolderCard
                  key={f.id} folder={f} view={view} itemsList={[...folders, ...files]}
                  onOpen={handleFolderOpen}
                  onRename={() => {}} onTrash={() => {}} onShare={() => {}}
                />
              ))}
            </div>
          </>
        )}

        {files.length > 0 && (
          <>
            <h2 className={styles.section} style={{ marginTop: folders.length > 0 ? 24 : 0 }}>
              {t('drive.files') || 'Files'} ({files.length})
            </h2>
            <div className={`${styles.grid} ${view === 'list' ? styles.list : ''}`}>
              {files.map(f => (
                <FileCard
                  key={f.id} file={f} view={view} itemsList={[...folders, ...files]}
                  onStar={() => {}} onTrash={() => {}} onShare={() => {}} onVersions={() => {}}
                  onDownload={f => filesApi.download(f.id, f.name, toast)}
                  onPreview={f => previewFile(f, openModal).catch(err => toast.error(err.message))}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {modal.type === 'viewer' && (
        <FileViewerModal file={modal.data} onClose={closeModal} onShare={f => openModal('share', f, 'file')} />
      )}
    </>
  );
}
