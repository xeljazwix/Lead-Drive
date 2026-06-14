import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { FileThumbnail } from '../components/drive/FileThumbnail.jsx';
import { formatBytes } from '../utils/format.js';
import { Download, Folder, ChevronRight, Home, CheckSquare, Square, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './PublicPage.module.css';

const BASE = '/api';

async function fetchPublic(token) {
  const r = await fetch(`${BASE}/p/${token}`);
  if (!r.ok) throw new Error((await r.json()).message ?? 'Not found');
  return r.json();
}

async function fetchSubfolder(token, id) {
  const r = await fetch(`${BASE}/p/${token}/folder/${id}`);
  if (!r.ok) throw new Error((await r.json()).message ?? 'Not found');
  return r.json();
}

function downloadFile(token, fileId, name) {
  const a = document.createElement('a');
  a.href = `${BASE}/p/${token}/download/${fileId}`;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadZip(token, fileIds, folderIds) {
  const params = new URLSearchParams();
  if (fileIds?.length) params.append('fileIds', fileIds.join(','));
  if (folderIds?.length) params.append('folderIds', folderIds.join(','));
  const a = document.createElement('a');
  a.href = `${BASE}/p/${token}/download-zip?${params.toString()}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function PublicPage() {
  const { token } = useParams();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [folderContents, setFolderContents] = useState(null);
  const [navLoading, setNavLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    fetchPublic(token)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const openSubfolder = useCallback(async (folder) => {
    setNavLoading(true);
    try {
      const d = await fetchSubfolder(token, folder.id);
      setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }]);
      setFolderContents({ subFolders: d.subFolders, files: d.files });
      setSelected(new Set());
    } catch (e) { alert(e.message); }
    finally { setNavLoading(false); }
  }, [token]);

  const navTo = useCallback(async (index) => {
    if (index < 0) {
      setBreadcrumb([]);
      setFolderContents(null);
      setSelected(new Set());
      return;
    }
    const crumb = breadcrumb[index];
    setNavLoading(true);
    try {
      const d = await fetchSubfolder(token, crumb.id);
      setBreadcrumb(prev => prev.slice(0, index + 1));
      setFolderContents({ subFolders: d.subFolders, files: d.files });
      setSelected(new Set());
    } catch (e) { alert(e.message); }
    finally { setNavLoading(false); }
  }, [token, breadcrumb]);

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll(ids) {
    setSelected(ids.every(id => selected.has(id)) ? new Set() : new Set(ids));
  }

  function downloadSelected(currentFiles, currentFolders) {
    const fileIds = currentFiles.filter(f => selected.has(f.id)).map(f => f.id);
    const folderIds = currentFolders.filter(f => selected.has(f.id)).map(f => f.id);
    
    if (fileIds.length === 0 && folderIds.length === 0) return;
    
    if (fileIds.length === 1 && folderIds.length === 0) {
      const file = currentFiles.find(f => f.id === fileIds[0]);
      downloadFile(token, file.id, file.name);
    } else {
      downloadZip(token, fileIds, folderIds);
    }
    setSelected(new Set());
  }

  if (loading) return (
    <PublicShell t={t}>
      <div className={styles.center}><div className={styles.spinner} /></div>
    </PublicShell>
  );

  if (error) return (
    <PublicShell t={t}>
      <div className={styles.center}>
        <div className={styles.errorBox}>
          <span className={styles.errorIcon}>🔒</span>
          <h2>{t('publicPage.notFound', 'Link not found')}</h2>
          <p>{error}</p>
        </div>
      </div>
    </PublicShell>
  );

  // ── Single file ──
  if (data.type === 'file') {
    const { file } = data;
    return (
      <PublicShell label={data.label ?? file.name} t={t}>
        <div className={styles.singleFile}>
          <div className={styles.fileBig}><FileThumbnail file={file} /></div>
          <h1 className={styles.fileName}>{file.name}</h1>
          <p className={styles.fileMeta}>{formatBytes(Number(file.size))} · {file.mimeType}</p>
          <button className={styles.dlBtn} onClick={() => downloadFile(token, file.id, file.name)}>
            <Download size={18} /> {t('publicPage.download', 'Download')}
          </button>
        </div>
      </PublicShell>
    );
  }

  // ── Folder ──
  const rootFolder = data.folder;
  const currentFolders = folderContents ? folderContents.subFolders : data.subFolders;
  const currentFiles   = folderContents ? folderContents.files      : data.files;
  const allItemIds     = [...currentFolders.map(f => f.id), ...currentFiles.map(f => f.id)];
  const allSelected    = allItemIds.length > 0 && allItemIds.every(id => selected.has(id));
  const anySelected    = selected.size > 0;
  const totalItems     = currentFolders.length + currentFiles.length;

  return (
    <PublicShell label={data.label ?? rootFolder.name} t={t}>
      {/* Breadcrumb */}
      {(breadcrumb.length > 0) && (
        <div className={styles.breadcrumb}>
          <button className={styles.crumbBtn} onClick={() => navTo(-1)}>
            <Home size={13} /> {rootFolder.name}
          </button>
          {breadcrumb.map((c, i) => (
            <span key={c.id} className={styles.crumbSep}>
              <ChevronRight size={13} />
              <button
                className={`${styles.crumbBtn} ${i === breadcrumb.length - 1 ? styles.crumbActive : ''}`}
                onClick={() => navTo(i)}
              >
                {c.name}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.count}>
          {t('publicPage.items', '{{count}} items', { count: totalItems })}
        </span>
        {anySelected && (
          <button className={styles.dlBtn} onClick={() => downloadSelected(currentFiles, currentFolders)}>
            <Download size={14} />
            {t('publicPage.downloadSelected', 'Download {{count}} selected', { count: selected.size })}
          </button>
        )}
        {allItemIds.length > 0 && (
          <button className={styles.selectAllBtn} onClick={() => toggleAll(allItemIds)}>
            {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
            {allSelected
              ? t('publicPage.deselectAll', 'Deselect all')
              : t('publicPage.selectAll', 'Select all')}
          </button>
        )}
      </div>

      {navLoading && <div className={styles.center}><div className={styles.spinner} /></div>}

      {!navLoading && totalItems === 0 && (
        <div className={styles.center}>
          <p className={styles.empty}>{t('publicPage.empty', 'This folder is empty.')}</p>
        </div>
      )}

      {/* Folders */}
      {!navLoading && currentFolders.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('publicPage.folders', 'Folders')}</h3>
          <div className={styles.grid}>
            {currentFolders.map(f => {
              const isSel = selected.has(f.id);
              return (
                <div key={f.id} className={`${styles.folderCard} ${isSel ? styles.selected : ''}`}>
                  <div className={styles.selCheck} onClick={(e) => { e.stopPropagation(); toggleSelect(f.id); }}>
                    {isSel ? <CheckSquare size={16} /> : <Square size={16} />}
                  </div>
                  <div className={styles.folderContent} onClick={() => openSubfolder(f)}>
                    <div className={styles.folderIcon}><Folder size={32} fill="currentColor" /></div>
                    <span className={styles.itemName}>{f.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Files */}
      {!navLoading && currentFiles.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('publicPage.files', 'Files')}</h3>
          <div className={styles.grid}>
            {currentFiles.map(f => {
              const isSel = selected.has(f.id);
              return (
                <div key={f.id} className={`${styles.fileCard} ${isSel ? styles.selected : ''}`}>
                  {/* Select checkbox */}
                  <div className={styles.selCheck} onClick={() => toggleSelect(f.id)}>
                    {isSel ? <CheckSquare size={16} /> : <Square size={16} />}
                  </div>
                  {/* Thumbnail */}
                  <div className={styles.thumb}>
                    <FileThumbnail file={f} />
                  </div>
                  {/* Name + download */}
                  <div className={styles.fileBottom}>
                    <div className={styles.fileInfo}>
                      <span className={styles.itemName}>{f.name}</span>
                      <span className={styles.itemMeta}>{formatBytes(Number(f.size))}</span>
                    </div>
                    <button
                      className={styles.cardDlBtn}
                      onClick={() => downloadFile(token, f.id, f.name)}
                      title={t('publicPage.download', 'Download')}
                    >
                      <Download size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </PublicShell>
  );
}

function PublicShell({ label, children, t }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <div style={{
              width: 90, 
              height: 32, 
              backgroundColor: 'currentColor',
              WebkitMask: 'url("/lead-logo.svg") no-repeat left center / contain',
              mask: 'url("/lead-logo.svg") no-repeat left center / contain'
            }} />
            <span>{t ? t('publicPage.sharedWithYou', 'Shared with you') : 'Shared with you'}</span>
          </div>
          {label && <span className={styles.headerLabel}>{label}</span>}
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
