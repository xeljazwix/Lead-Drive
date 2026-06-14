import { useState } from 'react';
import { getExtension } from '../../utils/mime.js';
import { formatBytes, formatDate } from '../../utils/format.js';
import { ContextMenu } from '../ui/ContextMenu.jsx';
import { useDriveStore } from '../../store/drive.store.js';
import { Download, Star, Share2, History, Trash2, RotateCcw, Archive, Package } from 'lucide-react';
import { FileThumbnail } from './FileThumbnail.jsx';
import { FileTypeIcon, getFileColor } from './FileTypeIcon.jsx';
import { useTranslation } from 'react-i18next';
import styles from './FileCard.module.css';

export function FileCard({ file, onStar, onTrash, onShare, onVersions, onDownload, onPreview, onRestore, onHardDelete, onCompress, onExtract, isTrash, view, itemsList }) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState(null);
  const { selected, selectItem, clipboard } = useDriveStore();
  const isSelected = selected.has(file.id);
  const isCut = clipboard.action === 'cut' && clipboard.items.some(i => i.id === file.id);
  const ext        = getExtension(file.name);
  const color      = getFileColor(file.mimeType, file.name);
  const isZip      = file.mimeType === 'application/zip' || ext === 'zip';

  const menuItems = isTrash ? [
    { icon: <RotateCcw size={14} />, label: t('drive.restore'),        onClick: () => onRestore(file) },
    { divider: true },
    { icon: <Trash2 size={14} />,    label: t('admin.deleteWarning').split('.')[0], onClick: () => onHardDelete(file), danger: true }, // rough translation for delete forever
  ] : [
    { label: isSelected ? t('drive.clearSelection') : t('drive.selectAll'), onClick: () => selectItem(file.id, itemsList, true, false) },
    { divider: true },
    { icon: <Download size={14} />, label: t('modals.download'),        onClick: () => onDownload(file) },
    ...(isZip ? [{ icon: <Package size={14} />, label: t('drive.extract', 'Extract'), onClick: () => onExtract(file) }] : []),
    { icon: <Archive size={14} />,  label: t('drive.compress', 'Compress'), onClick: () => onCompress(file) },
    { icon: <Star size={14} />,     label: file.isStarred ? t('drive.removeStar') : t('drive.star'), onClick: () => onStar(file) },
    { icon: <Share2 size={14} />,   label: t('drive.share'),           onClick: () => onShare(file) },
    { icon: <History size={14} />,  label: t('modals.versionHistory'), onClick: () => onVersions(file) },
    { divider: true },
    { icon: <Trash2 size={14} />,   label: t('drive.delete'),   onClick: () => onTrash(file), danger: true },
  ];

  function handleContext(e) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }

  const handleDoubleClick = () => {
    if (isTrash) return; // Disable double-click actions in trash
    if (onPreview) onPreview(file);
    else if (onDownload) onDownload(file);
  };

  const handleClick = (e) => {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      if (selected.size > 0) {
        // In selection mode: toggle selection
        selectItem(file.id, itemsList, true, false);
      } else {
        // Not in selection mode: open
        handleDoubleClick();
      }
    } else {
      // PC: click to select, ctrl/shift for multi
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      selectItem(file.id, itemsList, isCtrl, isShift);
    }
  };

  const handleDragStart = (e) => {
    const draggedItems = selected.has(file.id)
      ? itemsList.filter(i => selected.has(i.id)).map(i => ({ id: i.id, type: i.size !== undefined ? 'file' : 'folder' }))
      : [{ id: file.id, type: 'file' }];
      
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
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      <span>${draggedItems.length > 1 ? `Moving ${draggedItems.length} items` : `Moving ${file.name}`}</span>
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

  /* ── List row ─────────────────────────────────────────────────────── */
  if (view === 'list') {
    return (
      <>
        <div
          className={`${styles.row} ${isSelected ? styles.selected : ''}`}
          style={{ opacity: isCut ? 0.5 : 1 }}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContext}
          draggable
          onDragStart={handleDragStart}
          data-id={file.id}
        >
          <span className={styles.rowIcon}>
            <FileTypeIcon mimeType={file.mimeType} filename={file.name} size={20} />
          </span>
          <span className={styles.rowName}>{file.name}</span>
          <div className={styles.rowMetaGroup}>
            <span className={styles.rowMetaSize}>{formatBytes(file.size)}</span>
            <span className={styles.metaDivider}>•</span>
            <span className={styles.rowMetaDate}>
              {file.sharedBy ? `${file.sharedBy}` : formatDate(file.updatedAt)}
            </span>
          </div>
          <span className={styles.star}>
            {file.isStarred && <Star size={14} fill="#eab308" color="#eab308" />}
          </span>
          <button className={styles.rowMenu} onClick={(e) => { e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY }); }}>⋯</button>
        </div>
        {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
      </>
    );
  }

  /* ── Grid card ────────────────────────────────────────────────────── */
  return (
    <>
      <div
        className={`${styles.card} ${isSelected ? styles.selected : ''}`}
        style={{ opacity: isCut ? 0.5 : 1 }}
        onClick={handleClick}
        onContextMenu={handleContext}
        onDoubleClick={handleDoubleClick}
        draggable
        onDragStart={handleDragStart}
        title={file.name}
        data-id={file.id}
      >
        <div className={styles.preview}>
          <FileThumbnail file={file} />
          {ext && <span className={styles.ext} style={{ background: color }}>{ext}</span>}
        </div>
        <div className={styles.footer}>
          <p className={styles.name}>{file.name}</p>
          <p className={styles.meta}>
            {file.sharedBy ? `${file.sharedBy}` : `${formatBytes(file.size)} · ${formatDate(file.updatedAt)}`}
          </p>
        </div>
        {file.isStarred && (
          <span className={styles.starBadge}>
            <Star size={14} fill="#eab308" color="#eab308" />
          </span>
        )}
        <button
          className={styles.menuBtn}
          onClick={(e) => { e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY }); }}
          aria-label="File options"
        >⋯</button>
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
    </>
  );
}
