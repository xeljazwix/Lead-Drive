import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store.js';
import { useDriveStore } from '../store/drive.store.js';
import { foldersApi, filesApi } from '../api/drive.js';
import { Header } from '../components/layout/Header.jsx';
import { FileGrid } from '../components/drive/FileGrid.jsx';
import { DropZone } from '../components/drive/DropZone.jsx';
import { BreadCrumb } from '../components/drive/BreadCrumb.jsx';
import { ShareModal } from '../components/drive/ShareModal.jsx';
import { RenameModal } from '../components/drive/RenameModal.jsx';
import { VersionsModal } from '../components/drive/VersionsModal.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { toast } from '../components/ui/Toast.jsx';
import { nanoid } from '../utils/nanoid.js';
import { useDriveData } from '../hooks/useDriveData.js';
import { useModals } from '../hooks/useModals.js';
import { ArrowLeft, FolderPlus, Upload } from 'lucide-react';
import { BulkToolbar } from '../components/drive/BulkToolbar.jsx';
import { FileViewerModal } from '../components/drive/FileViewerModal.jsx';
import { previewFile } from '../utils/previewFile.js';
import { FilterBar } from '../components/drive/FilterBar.jsx';
import { processDriveItems } from '../utils/sortAndFilter.js';
import { useDragSelect } from '../hooks/useDragSelect.js';
import { useTranslation } from 'react-i18next';
import styles from './DrivePage.module.css';

export function DrivePage() {
  const { t } = useTranslation();
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const {
    currentFolder, navigateToRoot, navigateTo, navigateUp, addUpload, updateUpload, removeUpload,
    selected, selectAll, clearSelection, clipboard, setClipboard, clearClipboard,
    filterType, sortBy, breadcrumb
  } = useDriveStore();
  const { folders: rawFolders, files: rawFiles, loading, reload } = useDriveData(currentFolder);
  const { folders, files } = useMemo(() => processDriveItems(rawFolders, rawFiles, filterType, sortBy), [rawFolders, rawFiles, filterType, sortBy]);
  const { modal, openModal, closeModal } = useModals();
  const fileInputRef = useRef(null);
  const driveContainerRef = useRef(null);
  const itemsList = useMemo(() => [...folders, ...files], [folders, files]);
  const selectionBox = useDragSelect(driveContainerRef, itemsList);

  function handleFolderOpen(folder) { clearSelection(); navigateTo(folder); }
  function handleNavigateRoot()     { clearSelection(); navigateToRoot(); }
  function handleNavigateBack() {
    clearSelection();
    if (breadcrumb.length <= 1) {
      navigateToRoot();
      return;
    }
    navigateUp(breadcrumb.length - 2);
  }
  function handleBreadcrumbNav(folder) { clearSelection(); navigateTo(folder); }

  async function handleFolderTrash(folder) {
    try { await foldersApi.trash(folder.id); toast.success(t('toast.folderMovedToTrash', 'Folder moved to trash')); reload(); refreshUser(); }
    catch (err) { toast.error(err.message); }
  }

  async function handleFileTrash(file) {
    try { await filesApi.trash(file.id); toast.success(t('toast.movedToTrash', 'Moved to trash')); reload(); refreshUser(); }
    catch (err) { toast.error(err.message); }
  }

  async function handleFileStar(file) {
    try { await filesApi.star(file.id); reload(); refreshUser(); }
    catch (err) { toast.error(err.message); }
  }

  async function uploadFiles(fileList) {
    for (const file of fileList) {
      const id = nanoid();
      addUpload({ id, name: file.name, progress: 0, status: 'uploading' });
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (currentFolder) formData.append('folderId', currentFolder.id);
        await filesApi.upload(formData, (percent) => {
          if (percent === 100) {
            updateUpload(id, { progress: 100, status: 'scanning' });
          } else {
            updateUpload(id, { progress: percent });
          }
        });
        updateUpload(id, { progress: 100, status: 'done' });
        toast.success(`${file.name} uploaded`);
        reload(); refreshUser();
      } catch (err) {
        updateUpload(id, { status: 'error', error: err.message });
        toast.error(`${file.name}: ${err.message}`);
      } finally {
        setTimeout(() => removeUpload(id), 5000);
      }
    }
  }

  // ─── Clipboard Handlers ─────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const selectedIds = Array.from(selected);
        if (selectedIds.length === 0) return;
        const selectedItemsList = [
          ...folders.filter(f => selected.has(f.id)).map(f => ({ id: f.id, type: 'folder' })),
          ...files.filter(f => selected.has(f.id)).map(f => ({ id: f.id, type: 'file' }))
        ];
        setClipboard('copy', selectedItemsList);
        toast.success(`Copied ${selectedItemsList.length} items to clipboard`);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        const selectedIds = Array.from(selected);
        if (selectedIds.length === 0) return;
        const selectedItemsList = [
          ...folders.filter(f => selected.has(f.id)).map(f => ({ id: f.id, type: 'folder' })),
          ...files.filter(f => selected.has(f.id)).map(f => ({ id: f.id, type: 'file' }))
        ];
        setClipboard('cut', selectedItemsList);
        toast.success(`Cut ${selectedItemsList.length} items to clipboard`);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (!clipboard.action || clipboard.items.length === 0) return;
        
        const fileIds = clipboard.items.filter(i => i.type === 'file').map(i => i.id);
        const folderIds = clipboard.items.filter(i => i.type === 'folder').map(i => i.id);
        
        try {
          if (clipboard.action === 'copy') {
            if (fileIds.length > 0) await filesApi.copy({ fileIds, targetFolderId: currentFolder?.id });
            if (folderIds.length > 0) await foldersApi.copy({ folderIds, targetFolderId: currentFolder?.id });
            toast.success(`Pasted ${clipboard.items.length} items`);
          } else if (clipboard.action === 'cut') {
            if (fileIds.length > 0) await filesApi.move({ fileIds, targetFolderId: currentFolder?.id });
            if (folderIds.length > 0) await foldersApi.move({ folderIds, targetFolderId: currentFolder?.id });
            toast.success(`Moved ${clipboard.items.length} items`);
            clearClipboard();
          }
          reload(); refreshUser();
        } catch (err) {
          toast.error(`Paste failed: ${err.message}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, clipboard, folders, files, currentFolder, setClipboard, clearClipboard, reload]);

  // ─── Bulk Handlers ──────────────────────────────────────────────────────────

  const allIdsInView = [...folders.map(f => f.id), ...files.map(f => f.id)];
  const allSelected = allIdsInView.length > 0 && allIdsInView.every(id => selected.has(id));

  function handleSelectAllToggle() {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(allIdsInView);
    }
  }

  async function handleCompress(fileIds = [], folderIds = []) {
    toast('Compressing items...');
    try {
      await filesApi.compress({ fileIds, folderIds, destFolderId: currentFolder?.id });
      toast.success('Archive created successfully');
      reload(); refreshUser();
    } catch (err) {
      toast.error(`Compression failed: ${err.message}`);
    }
  }

  async function handleExtract(file) {
    toast('Extracting archive...');
    try {
      await filesApi.extract(file.id, { destFolderId: currentFolder?.id });
      toast.success('Archive extracted successfully');
      reload(); refreshUser();
    } catch (err) {
      toast.error(`Extraction failed: ${err.message}`);
    }
  }

  async function handleBulkTrash() {
    const selectedIds = Array.from(selected);
    if (selectedIds.length === 0) return;
    if (!confirm(`Move ${selectedIds.length} items to trash?`)) return;

    let successCount = 0;
    let errorCount = 0;
    for (const id of selectedIds) {
      const isFolder = folders.some(f => f.id === id);
      try {
        if (isFolder) {
          await foldersApi.trash(id);
        } else {
          await filesApi.trash(id);
        }
        successCount++;
      } catch (err) {
        errorCount++;
      }
    }
    if (successCount > 0) toast.success(`Moved ${successCount} items to trash`);
    if (errorCount > 0) toast.error(`Failed to move ${errorCount} items`);
    clearSelection();
    reload(); refreshUser();
  }

  async function handleBulkStar() {
    const selectedFiles = files.filter(f => selected.has(f.id));
    if (selectedFiles.length === 0) return;

    let successCount = 0;
    for (const file of selectedFiles) {
      try {
        await filesApi.star(file.id);
        successCount++;
      } catch (err) {
        // ignore
      }
    }
    toast.success(`Updated star status for ${successCount} files`);
    clearSelection();
    reload(); refreshUser();
  }

  function handleBulkDownload() {
    const selectedFileIds = files.filter(f => selected.has(f.id)).map(f => f.id);
    const selectedFolderIds = folders.filter(f => selected.has(f.id)).map(f => f.id);
    
    if (selectedFileIds.length === 0 && selectedFolderIds.length === 0) return;
    
    // If exactly one file and no folders, use standard download
    if (selectedFileIds.length === 1 && selectedFolderIds.length === 0) {
      const file = files.find(f => f.id === selectedFileIds[0]);
      filesApi.download(file.id, file.name, toast);
    } else {
      // Multiple items or a folder - use Zip Download
      toast('Preparing ZIP archive...');
      filesApi.downloadZip(selectedFileIds, selectedFolderIds);
    }
    clearSelection();
  }

  function handleBulkShare() {
    const selectedItemsList = [
      ...folders.filter(f => selected.has(f.id)).map(f => ({ id: f.id, type: 'folder' })),
      ...files.filter(f => selected.has(f.id)).map(f => ({ id: f.id, type: 'file' }))
    ];
    if (selectedItemsList.length === 0) return;
    openModal('share', selectedItemsList);
  }

  async function handleMoveToFolder(draggedItems, targetFolderId) {
    if (!draggedItems || draggedItems.length === 0) return;
    const fileIds = draggedItems.filter(i => i.type === 'file').map(i => i.id);
    const folderIds = draggedItems.filter(i => i.type === 'folder').map(i => i.id);

    try {
      if (fileIds.length > 0) await filesApi.move({ fileIds, targetFolderId });
      if (folderIds.length > 0) await foldersApi.move({ folderIds, targetFolderId });
      toast.success(`Moved ${draggedItems.length} items`);
      clearSelection();
      reload(); refreshUser();
    } catch (err) {
      toast.error(`Move failed: ${err.message}`);
    }
  }

  function handleCopy() {
    const selectedItemsList = [
      ...folders.filter(f => selected.has(f.id)).map(f => ({ id: f.id, type: 'folder' })),
      ...files.filter(f => selected.has(f.id)).map(f => ({ id: f.id, type: 'file' }))
    ];
    if (selectedItemsList.length === 0) return;
    setClipboard('copy', selectedItemsList);
    toast.success(`Copied ${selectedItemsList.length} items to clipboard`);
    clearSelection();
  }

  function handleCut() {
    const selectedItemsList = [
      ...folders.filter(f => selected.has(f.id)).map(f => ({ id: f.id, type: 'folder' })),
      ...files.filter(f => selected.has(f.id)).map(f => ({ id: f.id, type: 'file' }))
    ];
    if (selectedItemsList.length === 0) return;
    setClipboard('cut', selectedItemsList);
    toast.success(`Cut ${selectedItemsList.length} items to clipboard`);
    clearSelection();
  }

  async function handlePaste() {
    if (!clipboard.action || clipboard.items.length === 0) return;
    const fileIds = clipboard.items.filter(i => i.type === 'file').map(i => i.id);
    const folderIds = clipboard.items.filter(i => i.type === 'folder').map(i => i.id);
    try {
      if (clipboard.action === 'copy') {
        if (fileIds.length > 0) await filesApi.copy({ fileIds, targetFolderId: currentFolder?.id });
        if (folderIds.length > 0) await foldersApi.copy({ folderIds, targetFolderId: currentFolder?.id });
        toast.success(`Pasted ${clipboard.items.length} items`);
      } else if (clipboard.action === 'cut') {
        if (fileIds.length > 0) await filesApi.move({ fileIds, targetFolderId: currentFolder?.id });
        if (folderIds.length > 0) await foldersApi.move({ folderIds, targetFolderId: currentFolder?.id });
        toast.success(`Moved ${clipboard.items.length} items`);
        clearClipboard();
      }
      reload(); refreshUser();
    } catch (err) {
      toast.error(`Paste failed: ${err.message}`);
    }
  }

  function handleBulkCompress() {
    const selectedFileIds = files.filter(f => selected.has(f.id)).map(f => f.id);
    const selectedFolderIds = folders.filter(f => selected.has(f.id)).map(f => f.id);
    if (selectedFileIds.length === 0 && selectedFolderIds.length === 0) return;
    handleCompress(selectedFileIds, selectedFolderIds);
    clearSelection();
  }

  const selectedFoldersCount = folders.filter(f => selected.has(f.id)).length;
  const selectedFilesCount = files.filter(f => selected.has(f.id)).length;
  const totalSelectedCount = selected.size;

  const showBackButton = Boolean(currentFolder);
  const headerActions = (
    <div className={styles.desktopActions}>
      {allIdsInView.length > 0 && (
        <Button variant="ghost" size="sm" onClick={handleSelectAllToggle}>
          {allSelected ? t('drive.clearSelection') : t('drive.selectAll')}
        </Button>
      )}
      {clipboard.items.length > 0 && (
        <Button variant="secondary" size="sm" onClick={handlePaste} title={t('drive.paste', 'Paste')}>
          {t('drive.paste', 'Paste')} ({clipboard.items.length})
        </Button>
      )}
      <Button variant="ghost" icon={<FolderPlus size={16} />} size="sm" onClick={() => openModal('newFolder')}>{t('drive.newFolder')}</Button>
      <Button icon={<Upload size={16} />} size="sm" onClick={() => fileInputRef.current?.click()}>{t('drive.upload')}</Button>
      <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
        onChange={e => uploadFiles(Array.from(e.target.files))} id="file-upload-input" />
    </div>
  );

  const fabActions = (
    <div className={styles.fabContainer}>
      {clipboard.items.length > 0 && (
        <button className={styles.fabSecondary} onClick={handlePaste} aria-label={t('drive.paste', 'Paste')} title={t('drive.paste', 'Paste')}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{t('drive.paste', 'Paste')}</span>
        </button>
      )}
      <button className={styles.fabSecondary} onClick={() => openModal('newFolder')} aria-label="New folder">
        <FolderPlus size={20} />
      </button>
      <button className={styles.fab} onClick={() => fileInputRef.current?.click()} aria-label="Upload file">
        <Upload size={24} />
      </button>
    </div>
  );

  return (
    <>
      <Header title={t('nav.myDrive')} actions={headerActions} />
      <BreadCrumb
        showBackButton={showBackButton}
        onNavigateRoot={handleNavigateRoot}
        onNavigateBack={handleNavigateBack}
        onNavigateTo={handleBreadcrumbNav}
      />
      <div ref={driveContainerRef} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
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
        <DropZone onFiles={uploadFiles}>
          <FileGrid
            folders={folders} files={files} loading={loading}
            containerRef={driveContainerRef}
            selectionBox={selectionBox}
            onFolderOpen={handleFolderOpen}
            onFolderRename={(f) => openModal('rename', f)}
            onFolderTrash={handleFolderTrash}
            onFolderShare={(f) => openModal('share', f, 'folder')}
            onFolderCompress={(f) => handleCompress([], [f.id])}
            onFolderDownload={(f) => { toast('Preparing folder download...'); filesApi.downloadZip([], [f.id]); }}
            onFileStar={handleFileStar}
            onFileTrash={handleFileTrash}
            onFileShare={(f) => openModal('share', f, 'file')}
            onFileVersions={(f) => openModal('versions', f)}
            onFileDownload={(f) => filesApi.download(f.id, f.name, toast)}
            onFilePreview={(f) => previewFile(f, openModal).catch(err => toast.error(err.message))}
            onFileCompress={(f) => handleCompress([f.id], [])}
            onFileExtract={handleExtract}
            onMoveToFolder={handleMoveToFolder}
          />
        </DropZone>
      </div>

      {createPortal(fabActions, document.body)}

      <BulkToolbar
        selectedCount={totalSelectedCount}
        hasFiles={selectedFilesCount > 0}
        hasFolders={selectedFoldersCount > 0}
        onClear={clearSelection}
        onStar={handleBulkStar}
        onDownload={handleBulkDownload}
        onShare={handleBulkShare}
        onCompress={handleBulkCompress}
        onCopy={handleCopy}
        onCut={handleCut}
        onTrash={handleBulkTrash}
      />

      {modal.type === 'newFolder' && (
        <NewFolderModal currentFolder={currentFolder} onClose={closeModal} onCreated={reload} />
      )}
      {modal.type === 'rename' && (
        <RenameModal folder={modal.data} onClose={closeModal} onRenamed={reload} />
      )}
      {modal.type === 'share' && (
        <ShareModal 
          item={Array.isArray(modal.data) ? null : modal.data} 
          items={Array.isArray(modal.data) ? modal.data : null}
          type={modal.meta} 
          onClose={() => {
            closeModal();
            if (Array.isArray(modal.data)) {
              clearSelection();
            }
          }} 
        />
      )}
      {modal.type === 'versions' && (
        <VersionsModal file={modal.data} onClose={closeModal} />
      )}
      {modal.type === 'viewer' && (
        <FileViewerModal file={modal.data} onClose={closeModal} onShare={f => openModal('share', f, 'file')} />
      )}
    </>
  );
}

function NewFolderModal({ currentFolder, onClose, onCreated }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await foldersApi.create({ name: name.trim(), parentFolderId: currentFolder?.id });
      toast.success(t('toast.folderCreated', 'Folder created'));
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={t('modals.createFolder')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('admin.cancel')}</Button><Button onClick={handleCreate} loading={loading}>{t('admin.create')}</Button></>}
    >
      <Input label={t('modals.folderName')} placeholder="" value={name}
        onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
    </Modal>
  );
}
