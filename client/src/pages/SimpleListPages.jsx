import { useEffect, useState } from 'react';
import { filesApi } from '../api/drive.js';
import { Header } from '../components/layout/Header.jsx';
import { FileCard } from '../components/drive/FileCard.jsx';
import { ShareModal } from '../components/drive/ShareModal.jsx';
import { VersionsModal } from '../components/drive/VersionsModal.jsx';
import { FileViewerModal } from '../components/drive/FileViewerModal.jsx';
import { previewFile } from '../utils/previewFile.js';
import { useModals } from '../hooks/useModals.js';
import { toast } from '../components/ui/Toast.jsx';
import { useDriveStore } from '../store/drive.store.js';
import { useNavigate } from 'react-router-dom';
import styles from './SimpleListPage.module.css';

import { useMemo } from 'react';
import { processDriveItems } from '../utils/sortAndFilter.js';
import { FilterBar } from '../components/drive/FilterBar.jsx';
import { FolderCard } from '../components/drive/FolderCard.jsx';
import { Info, RotateCcw, Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRef } from 'react';
import { useDragSelect } from '../hooks/useDragSelect.js';

export function SharedPage() {
  const { t } = useTranslation();
  const [rawFiles, setFiles] = useState([]);
  const [rawFolders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { view, filterType, sortBy, selected, setClipboard, clearSelection, navigateTo } = useDriveStore();
  const { folders, files } = useMemo(() => processDriveItems(rawFolders, rawFiles, filterType, sortBy), [rawFolders, rawFiles, filterType, sortBy]);
  const { modal, openModal, closeModal } = useModals();
  const navigate = useNavigate();

  const containerRef = useRef(null);
  const itemsList = [...folders, ...files];
  const selectionBox = useDragSelect(containerRef, itemsList);

  function load() {
    setLoading(true);
    filesApi.getShared()
      .then(d => {
        setFiles(d.files || []);
        setFolders(d.folders || []);
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  useEffect(load, []);
  useEffect(() => clearSelection(), [clearSelection]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'x')) {
        const selectedIds = Array.from(selected);
        if (selectedIds.length === 0) return;
        const selectedItems = itemsList.filter(i => selected.has(i.id)).map(i => ({ id: i.id, type: folders.some(f=>f.id===i.id)?'folder':'file' }));
        setClipboard(e.key === 'c' ? 'copy' : 'cut', selectedItems);
        toast.success(`${e.key === 'c' ? 'Copied' : 'Cut'} ${selectedItems.length} items to clipboard`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, itemsList, setClipboard]);

  return (
    <>
      <Header title={t('nav.sharedWithMe')} />
      <div ref={containerRef} className={styles.container} style={{ position: 'relative', minHeight: '100%' }}>
        {selectionBox && (
          <div style={{
            position: 'fixed', pointerEvents: 'none', zIndex: 9999,
            left: selectionBox.left, top: selectionBox.top, width: selectionBox.width, height: selectionBox.height,
            backgroundColor: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.8)', borderRadius: 2
          }} />
        )}
        {loading && <p className={styles.msg}>{t('admin.loading')}</p>}
        {!loading && files.length === 0 && folders.length === 0 && (
          <p className={styles.msg}>{t('drive.noShared') || 'No files or folders have been shared with you.'}</p>
        )}
        
        {folders.length > 0 && <h2 className={styles.section}>{t('drive.folders') || 'Folders'} ({folders.length})</h2>}
        <div className={`${styles.grid} ${view === 'list' ? styles.list : ''}`}>
          {folders.map(f => (
            <FolderCard key={f.id} folder={f} view={view} itemsList={itemsList}
              onOpen={(folder) => navigate(`/drive/shared-folder/${folder.id}`)}
              onRename={() => {}} onTrash={() => {}} onShare={() => {}}
            />
          ))}
        </div>

        {files.length > 0 && <h2 className={styles.section} style={{ marginTop: folders.length > 0 ? 24 : 0 }}>{t('drive.files') || 'Files'} ({files.length})</h2>}
        <div className={`${styles.grid} ${view === 'list' ? styles.list : ''}`}>
          {files.map(f => (
            <FileCard key={f.id} file={f} view={view} itemsList={itemsList}
              onStar={() => {}} onTrash={() => {}} onShare={() => {}} onVersions={() => {}}
              onDownload={f => filesApi.download(f.id, f.name, toast)}
              onPreview={f => previewFile(f, openModal).catch(err => toast.error(err.message))}
            />
          ))}
        </div>
      </div>
      {modal.type === 'share' && <ShareModal item={modal.data} type="file" onClose={closeModal} />}
      {modal.type === 'viewer' && <FileViewerModal file={modal.data} onClose={closeModal} onShare={f => openModal('share', f, 'file')} />}
    </>
  );
}

export function StarredPage() {
  const { t } = useTranslation();
  const [rawFiles, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { view, filterType, sortBy, selected, setClipboard, clearSelection } = useDriveStore();
  const { files } = useMemo(() => processDriveItems([], rawFiles, filterType, sortBy), [rawFiles, filterType, sortBy]);
  const { modal, openModal, closeModal } = useModals();

  const containerRef = useRef(null);
  const itemsList = [...files];
  const selectionBox = useDragSelect(containerRef, itemsList);

  function load() {
    setLoading(true);
    filesApi.getStarred()
      .then(d => setFiles(d.files))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);
  useEffect(() => clearSelection(), [clearSelection]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'x')) {
        const selectedIds = Array.from(selected);
        if (selectedIds.length === 0) return;
        const selectedItems = itemsList.filter(i => selected.has(i.id)).map(i => ({ id: i.id, type: 'file' }));
        setClipboard(e.key === 'c' ? 'copy' : 'cut', selectedItems);
        toast.success(`${e.key === 'c' ? 'Copied' : 'Cut'} ${selectedItems.length} items to clipboard`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, itemsList, setClipboard]);

  async function handleStar(file) {
    await filesApi.star(file.id);
    load();
  }
  async function handleTrash(file) {
    await filesApi.trash(file.id);
    toast.success('Moved to trash');
    load();
  }

  return (
    <>
      <Header title={t('nav.starred')} />
      <div ref={containerRef} className={styles.container} style={{ position: 'relative', minHeight: '100%' }}>
        {selectionBox && (
          <div style={{
            position: 'fixed', pointerEvents: 'none', zIndex: 9999,
            left: selectionBox.left, top: selectionBox.top, width: selectionBox.width, height: selectionBox.height,
            backgroundColor: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.8)', borderRadius: 2
          }} />
        )}
        {loading && <p className={styles.msg}>{t('admin.loading')}</p>}
        {!loading && files.length === 0 && <p className={styles.msg}>{t('drive.noStarred') || 'No starred files yet.'}</p>}
        <div className={`${styles.grid} ${view === 'list' ? styles.list : ''}`}>
          {files.map(f => (
            <FileCard key={f.id} file={f} view={view} itemsList={itemsList}
              onStar={handleStar} onTrash={handleTrash}
              onShare={f => openModal('share', f, 'file')}
              onVersions={f => openModal('versions', f)}
              onDownload={f => filesApi.download(f.id, f.name, toast)}
              onPreview={f => previewFile(f, openModal).catch(err => toast.error(err.message))}
            />
          ))}
        </div>
      </div>
      {modal.type === 'share' && <ShareModal item={modal.data} type="file" onClose={closeModal} />}
      {modal.type === 'versions' && <VersionsModal file={modal.data} onClose={closeModal} />}
      {modal.type === 'viewer' && <FileViewerModal file={modal.data} onClose={closeModal} onShare={f => openModal('share', f, 'file')} />}
    </>
  );
}

export function RecentPage() {
  const { t } = useTranslation();
  const [rawFiles, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { view, filterType, sortBy, selected, setClipboard, clearSelection } = useDriveStore();
  const { files } = useMemo(() => processDriveItems([], rawFiles, filterType, sortBy), [rawFiles, filterType, sortBy]);
  const { modal, openModal, closeModal } = useModals();

  const containerRef = useRef(null);
  const itemsList = [...files];
  const selectionBox = useDragSelect(containerRef, itemsList);

  function load() {
    setLoading(true);
    filesApi.getRecent()
      .then(d => setFiles(d.files))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);
  useEffect(() => clearSelection(), [clearSelection]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'x')) {
        const selectedIds = Array.from(selected);
        if (selectedIds.length === 0) return;
        const selectedItems = itemsList.filter(i => selected.has(i.id)).map(i => ({ id: i.id, type: 'file' }));
        setClipboard(e.key === 'c' ? 'copy' : 'cut', selectedItems);
        toast.success(`${e.key === 'c' ? 'Copied' : 'Cut'} ${selectedItems.length} items to clipboard`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, itemsList, setClipboard]);

  return (
    <>
      <Header title={t('nav.recent')} />
      <div ref={containerRef} className={styles.container} style={{ position: 'relative', minHeight: '100%' }}>
        {selectionBox && (
          <div style={{
            position: 'fixed', pointerEvents: 'none', zIndex: 9999,
            left: selectionBox.left, top: selectionBox.top, width: selectionBox.width, height: selectionBox.height,
            backgroundColor: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.8)', borderRadius: 2
          }} />
        )}
        {loading && <p className={styles.msg}>{t('admin.loading')}</p>}
        {!loading && files.length === 0 && <p className={styles.msg}>{t('drive.noRecent') || 'No recently accessed files.'}</p>}
        <div className={`${styles.grid} ${view === 'list' ? styles.list : ''}`}>
          {files.map(f => (
            <FileCard key={f.id} file={f} view={view} itemsList={itemsList}
              onStar={() => {}} onTrash={() => {}}
              onShare={f => openModal('share', f, 'file')}
              onVersions={f => openModal('versions', f)}
              onDownload={f => filesApi.download(f.id, f.name, toast)}
              onPreview={f => previewFile(f, openModal).catch(err => toast.error(err.message))}
            />
          ))}
        </div>
      </div>
      {modal.type === 'share' && <ShareModal item={modal.data} type="file" onClose={closeModal} />}
      {modal.type === 'versions' && <VersionsModal file={modal.data} onClose={closeModal} />}
      {modal.type === 'viewer' && <FileViewerModal file={modal.data} onClose={closeModal} onShare={f => openModal('share', f, 'file')} />}
    </>
  );
}

export function TrashPage() {
  const { t } = useTranslation();
  const [rawFiles, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { view, filterType, sortBy, clearSelection } = useDriveStore();
  const { files } = useMemo(() => processDriveItems([], rawFiles, filterType, sortBy), [rawFiles, filterType, sortBy]);

  const containerRef = useRef(null);
  const itemsList = [...files];
  const selectionBox = useDragSelect(containerRef, itemsList);

  function load() {
    setLoading(true);
    filesApi.getTrashed()
      .then(d => setFiles(d.files))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);
  useEffect(() => clearSelection(), [clearSelection]);

  async function handleRestore(file) {
    try {
      await filesApi.restore(file.id);
      toast.success(`${file.name} restored`);
      load();
    } catch (err) { toast.error(err.message); }
  }

  async function handleHardDelete(file) {
    if (!window.confirm(`Permanently delete "${file.name}"? This cannot be undone.`)) return;
    try {
      await filesApi.hardDelete(file.id);
      toast.success(`${file.name} permanently deleted`);
      load();
    } catch (err) { toast.error(err.message); }
  }

  async function handleEmptyTrash() {
    if (!window.confirm('Are you sure you want to permanently delete all items in the trash? This cannot be undone.')) return;
    try {
      await filesApi.emptyTrash();
      toast.success('Trash emptied');
      load();
    } catch (err) { toast.error(err.message); }
  }

  return (
    <>
      <Header title={t('nav.trash')} />
      <div ref={containerRef} className={styles.container} style={{ position: 'relative', minHeight: '100%' }}>
        {selectionBox && (
          <div style={{
            position: 'fixed', pointerEvents: 'none', zIndex: 9999,
            left: selectionBox.left, top: selectionBox.top, width: selectionBox.width, height: selectionBox.height,
            backgroundColor: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.8)', borderRadius: 2
          }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p className={styles.notice} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0 }}>
            <Info size={14} />
            <span>{t('drive.trashNotice') || 'Files in trash are permanently deleted after 30 days.'}</span>
          </p>
          {files.length > 0 && (
            <button onClick={handleEmptyTrash} className={styles.emptyTrashBtn}>
              {t('drive.emptyTrash') || 'Empty Trash'}
            </button>
          )}
        </div>
        {loading && <p className={styles.msg}>{t('admin.loading')}</p>}
        {!loading && files.length === 0 && <p className={styles.msg}>{t('drive.noTrash') || 'Trash is empty.'}</p>}
        <div className={`${styles.grid} ${view === 'list' ? styles.list : ''}`}>
          {files.map(f => (
            <FileCard 
              key={f.id} 
              file={f} 
              view={view} 
              itemsList={files} 
              isTrash={true} 
              onRestore={handleRestore} 
              onHardDelete={handleHardDelete} 
            />
          ))}
        </div>
      </div>
    </>
  );
}

export function SearchPage() {
  const { t } = useTranslation();
  const [rawFiles, setFiles] = useState([]);
  const [rawFolders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const { view, filterType, sortBy, selected, setClipboard, clearSelection } = useDriveStore();
  const { folders, files } = useMemo(() => processDriveItems(rawFolders, rawFiles, filterType, sortBy), [rawFolders, rawFiles, filterType, sortBy]);
  const { modal, openModal, closeModal } = useModals();

  const containerRef = useRef(null);
  const itemsList = [...folders, ...files];
  const selectionBox = useDragSelect(containerRef, itemsList);

  const params = new URLSearchParams(window.location.search);
  const q = params.get('q') ?? '';

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    filesApi.search(q)
      .then(d => { setFiles(d.results.files); setFolders(d.results.folders); })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [q]);
  useEffect(() => clearSelection(), [clearSelection]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'x')) {
        const selectedIds = Array.from(selected);
        if (selectedIds.length === 0) return;
        const selectedItems = itemsList.filter(i => selected.has(i.id)).map(i => ({ id: i.id, type: folders.some(f=>f.id===i.id)?'folder':'file' }));
        setClipboard(e.key === 'c' ? 'copy' : 'cut', selectedItems);
        toast.success(`${e.key === 'c' ? 'Copied' : 'Cut'} ${selectedItems.length} items to clipboard`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, itemsList, setClipboard]);

  return (
    <>
      <Header title={`${t('nav.search') || 'Search'}: "${q}"`} />
      <div ref={containerRef} className={styles.container} style={{ position: 'relative', minHeight: '100%' }}>
        {selectionBox && (
          <div style={{
            position: 'fixed', pointerEvents: 'none', zIndex: 9999,
            left: selectionBox.left, top: selectionBox.top, width: selectionBox.width, height: selectionBox.height,
            backgroundColor: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.8)', borderRadius: 2
          }} />
        )}
        {loading && <p className={styles.msg}>{t('admin.loading')}</p>}
        {!loading && files.length === 0 && folders.length === 0 && q && <p className={styles.msg}>{t('drive.noSearchResults') || 'No results for'} "{q}".</p>}
        {folders.length > 0 && <h2 className={styles.section}>{t('drive.folders') || 'Folders'} ({folders.length})</h2>}
        <div className={`${styles.grid} ${view === 'list' ? styles.list : ''}`}>
          {folders.map(f => (
            <div key={f.id} className={styles.result} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Folder size={16} color="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
              <span>{f.name}</span>
            </div>
          ))}
        </div>
        {files.length > 0 && <h2 className={styles.section}>{t('drive.files') || 'Files'} ({files.length})</h2>}
        <div className={`${styles.grid} ${view === 'list' ? styles.list : ''}`}>
          {files.map(f => (
            <FileCard key={f.id} file={f} view={view} itemsList={itemsList}
              onStar={() => {}} onTrash={() => {}} onShare={() => {}} onVersions={() => {}}
              onDownload={f => filesApi.download(f.id, f.name, toast)}
              onPreview={f => previewFile(f, openModal).catch(err => toast.error(err.message))}
            />
          ))}
        </div>
      </div>
      {modal.type === 'share' && <ShareModal item={modal.data} type="file" onClose={closeModal} />}
      {modal.type === 'viewer' && <FileViewerModal file={modal.data} onClose={closeModal} onShare={f => openModal('share', f, 'file')} />}
    </>
  );
}
