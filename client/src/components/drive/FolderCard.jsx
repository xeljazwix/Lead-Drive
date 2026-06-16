import { useState } from 'react';
import { ContextMenu } from '../ui/ContextMenu.jsx';
import { useDriveStore } from '../../store/drive.store.js';
import { formatDate } from '../../utils/format.js';
import { Folder, FolderOpen, Edit, Share2, Trash2, RotateCcw, Star, Download, Archive, Copy, Scissors } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './FolderCard.module.css';

export function FolderCard({ folder, onOpen, onRename, onTrash, onShare, onRestore, onHardDelete, onStar, onCompress, onDownload, isTrash, view, itemsList, onMoveToFolder, index = 0 }) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { selected, selectItem, clipboard, setClipboard } = useDriveStore();
  const isSelected = selected.has(folder.id);
  const isCut = clipboard.action === 'cut' && clipboard.items.some(i => i.id === folder.id);

  const menuItems = isTrash ? [
    { icon: <RotateCcw size={14} />, label: t('drive.restore'),        onClick: () => onRestore(folder) },
    { divider: true },
    { icon: <Trash2 size={14} />,    label: t('admin.deleteWarning').split('.')[0], onClick: () => onHardDelete(folder), danger: true },
  ] : [
    { label: isSelected ? t('drive.clearSelection') : t('drive.selectAll'), onClick: () => selectItem(folder.id, itemsList, true, false) },
    { divider: true },
    { icon: <FolderOpen size={14} />, label: t('nav.view'),         onClick: () => onOpen(folder) },
    { icon: <Download size={14} />,   label: t('modals.download'),  onClick: () => onDownload?.(folder) },
    { icon: <Archive size={14} />,    label: t('drive.compress', 'Compress'), onClick: () => onCompress?.(folder) },
    { icon: <Edit size={14} />,       label: t('drive.name'),       onClick: () => onRename(folder) }, // closest word for rename
    { icon: <Share2 size={14} />,     label: t('drive.share'),         onClick: () => onShare(folder) },
    { divider: true },
    { icon: <Copy size={14} />,       label: t('drive.copy', 'Copy'),  onClick: () => setClipboard('copy', [{ id: folder.id, type: 'folder' }]) },
    { icon: <Scissors size={14} />,   label: t('drive.cut', 'Cut'),    onClick: () => setClipboard('cut', [{ id: folder.id, type: 'folder' }]) },
    { divider: true },
    { icon: <Trash2 size={14} />,     label: t('drive.delete'), onClick: () => onTrash(folder), danger: true },
  ];

  function handleContext(e) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }

  const handleClick = (e) => {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      if (selected.size > 0) {
        selectItem(folder.id, itemsList, true, false);
      } else {
        onOpen(folder);
      }
    } else {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      selectItem(folder.id, itemsList, isCtrl, isShift);
    }
  };

  const handleDragStart = (e) => {
    const draggedItems = selected.has(folder.id)
      ? itemsList.filter(i => selected.has(i.id)).map(i => ({ id: i.id, type: i.size !== undefined ? 'file' : 'folder' }))
      : [{ id: folder.id, type: 'folder' }];
      
    // Custom drag image
    const dragGhost = document.createElement('div');
    dragGhost.style.position = 'absolute';
    dragGhost.style.top = '-1000px';
    dragGhost.style.background = 'var(--primary)';
    dragGhost.style.color = 'white';
    dragGhost.style.padding = '8px 16px';
    dragGhost.style.borderRadius = '8px';
    dragGhost.style.fontWeight = '600';
    dragGhost.style.fontSize = '14px';
    dragGhost.style.display = 'flex';
    dragGhost.style.alignItems = 'center';
    dragGhost.style.gap = '8px';
    dragGhost.style.boxShadow = 'var(--shadow-raised)';
    
    dragGhost.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
      </svg>
      <span>${draggedItems.length > 1 ? `Moving ${draggedItems.length} items` : `Moving ${folder.name}`}</span>
    `;
    
    document.body.appendChild(dragGhost);
    e.dataTransfer.setDragImage(dragGhost, 15, 15);
    
    setTimeout(() => {
      if (document.body.contains(dragGhost)) {
        document.body.removeChild(dragGhost);
      }
    }, 0);
      
    e.dataTransfer.setData('application/json', JSON.stringify(draggedItems));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/json')) {
      setIsDragOver(true);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const draggedData = e.dataTransfer.getData('application/json');
      if (!draggedData) return;
      const draggedItems = JSON.parse(draggedData);
      
      if (!draggedItems.length || draggedItems.some(i => i.id === folder.id)) return; 
      
      if (onMoveToFolder) onMoveToFolder(draggedItems, folder.id);
    } catch (err) {}
  };

  if (view === 'list') {
    return (
      <>
        <div
          className={`${styles.row} ${isSelected ? styles.selected : ''} ${isDragOver ? styles.dragOver : ''} animate-pop-in stagger-${(index % 10) + 1}`}
          style={{ opacity: isCut ? 0.5 : 1 }}
          onClick={handleClick}
          onDoubleClick={() => onOpen(folder)}
          onContextMenu={handleContext}
          draggable
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          data-id={folder.id}
        >
          <span className={styles.rowIcon}>
            <Folder size={18} color="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
          </span>
          <span className={styles.rowName}>{folder.name}</span>
          <div className={styles.rowMetaGroup}>
            <span className={styles.rowMetaSize} />
            <span className={styles.metaDivider}>•</span>
            <span className={styles.rowMetaDate}>
              {folder.sharedBy ? `${folder.sharedBy}` : formatDate(folder.updatedAt)}
            </span>
          </div>
          <span /> {/* Empty Star column */}
          <button className={styles.rowMenu} onClick={(e) => { e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY }); }}>⋯</button>
        </div>
        {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
      </>
    );
  }

  return (
    <>
      <div
        className={`${styles.card} ${isSelected ? styles.selected : ''} ${isDragOver ? styles.dragOver : ''} animate-pop-in stagger-${(index % 10) + 1}`}
        style={{ opacity: isCut ? 0.5 : 1 }}
        onClick={handleClick}
        onDoubleClick={() => onOpen(folder)}
        onContextMenu={handleContext}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        title={folder.name}
        data-id={folder.id}
      >
        <div className={styles.icon}>
          <Folder size={44} color="#3b82f6" fill="#3b82f6" fillOpacity={0.15} style={{ margin: '0 auto' }} />
        </div>
        <p className={styles.name}>{folder.name}</p>
        <p className={styles.meta}>
            {folder.sharedBy ? `${folder.sharedBy}` : formatDate(folder.updatedAt)}
          </p>
        <button
          className={styles.menuBtn}
          onClick={(e) => { e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY }); }}
          aria-label="Folder options"
        >⋯</button>
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
    </>
  );
}
