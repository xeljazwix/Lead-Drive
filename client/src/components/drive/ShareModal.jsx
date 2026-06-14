import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Input } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { filesApi, foldersApi, publicLinksApi } from '../../api/drive.js';
import { usersApi } from '../../api/auth.js';
import { toast } from '../ui/Toast.jsx';
import { Eye, Pencil, Link2, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ShareModal({ item, items, type, onClose }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [permission, setPermission] = useState('VIEWER');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [publicLink, setPublicLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!username.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await usersApi.search(username);
        setSearchResults(res.users || []);
      } catch { /* ignore */ } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [username]);

  async function handleShare() {
    if (!username.trim()) return;
    setLoading(true);
    try {
      if (items && items.length > 0) {
        let ok = 0, fail = 0;
        for (const target of items) {
          try {
            const api = target.type === 'file' ? filesApi : foldersApi;
            await api.share(target.id, { sharedWithUsername: username.trim(), permissionLevel: permission });
            ok++;
          } catch { fail++; }
        }
        if (ok > 0) toast.success(`Shared ${ok} items with ${username}`);
        if (fail > 0) toast.error(`Failed to share ${fail} items`);
      } else {
        const api = type === 'file' ? filesApi : foldersApi;
        await api.share(item.id, { sharedWithUsername: username.trim(), permissionLevel: permission });
        toast.success(`Shared with ${username}`);
      }
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  async function handleGenerateLink() {
    setGeneratingLink(true);
    try {
      // For multi-select, only generate for the first item (or let server handle single)
      let body;
      if (items && items.length > 0) {
        const first = items[0];
        body = first.type === 'file' ? { fileId: first.id } : { folderId: first.id };
      } else if (type === 'file') {
        body = { fileId: item.id, label: item.name };
      } else {
        body = { folderId: item.id, label: item.name };
      }
      const res = await publicLinksApi.create(body);
      setPublicLink(`${window.location.origin}/p/${res.token}`);
    } catch (err) { toast.error(err.message); }
    finally { setGeneratingLink(false); }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(publicLink);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  }

  const titleText = items && items.length > 0
    ? `${t('drive.share')} ${items.length} items`
    : `${t('drive.share')} "${item?.name}"`;

  return (
    <Modal open onClose={onClose} title={titleText}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('admin.cancel')}</Button>
          <Button onClick={handleShare} loading={loading}>{t('drive.share')}</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* User share */}
        <div>
          <Input
            label={`${t('drive.share')} (${t('admin.username')})`}
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleShare()}
            autoFocus
          />
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 12 }}>
              {t('admin.users')}
            </label>
            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
              {searching ? (
                <div style={{ fontSize: 13, color: 'var(--text-subtle)' }}>{t('admin.loading')}</div>
              ) : searchResults.length > 0 ? searchResults.map(u => {
                const isSelected = username.toLowerCase() === u.username.toLowerCase();
                return (
                  <button key={u.id} onClick={() => setUsername(u.username)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 4, minWidth: 70 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: isSelected ? 'var(--primary)' : 'var(--surface-container)',
                      color: isSelected ? 'white' : 'var(--text)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 600,
                      border: isSelected ? '2px solid var(--primary)' : '2px solid transparent',
                      boxShadow: isSelected ? '0 0 0 4px rgba(59,130,246,0.2)' : 'none',
                      transition: 'all 0.2s', overflow: 'hidden',
                    }}>
                      {u.avatarUrl ? <img src={u.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.username.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--text)' : 'var(--text-subtle)', maxWidth: 70, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.fullName || u.username}
                    </span>
                  </button>
                );
              }) : <div style={{ fontSize: 13, color: 'var(--text-subtle)' }}>-</div>}
            </div>
          </div>
        </div>

        {/* Permission level */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>
            {t('admin.role')}
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['VIEWER', 'EDITOR'].map(p => (
              <button key={p} onClick={() => setPermission(p)} style={{
                flex: 1, padding: '10px 0', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13, background: 'var(--surface)',
                color: permission === p ? 'var(--primary)' : 'var(--text-subtle)',
                boxShadow: permission === p ? 'var(--shadow-inset-sm)' : 'var(--shadow-raised-sm)',
                transition: 'all var(--t-base)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {p === 'VIEWER' ? <><Eye size={14} /><span>{t('nav.view')}</span></> : <><Pencil size={14} /><span>{t('admin.role')}</span></>}
              </button>
            ))}
          </div>
        </div>

        {/* Public link generator */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 10 }}>
            {t('share.publicLink', 'Public Link — Client Access')}
          </label>
          {!publicLink ? (
            <button onClick={handleGenerateLink} disabled={generatingLink} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
              border: '1.5px dashed var(--border-active)', borderRadius: 'var(--r-md)',
              background: 'none', color: 'var(--primary)', cursor: 'pointer',
              fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13, width: '100%',
              justifyContent: 'center', transition: 'background 0.15s',
            }}>
              <Link2 size={15} />
              {generatingLink ? t('share.generating', 'Generating…') : t('share.generateLink', 'Generate public link')}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{
                flex: 1, padding: '9px 12px', borderRadius: 'var(--r-sm)',
                background: 'var(--surface-container)', fontSize: 12,
                color: 'var(--text-muted)', fontFamily: 'monospace',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {publicLink}
              </div>
              <button onClick={handleCopy} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
                background: copied ? 'var(--success-bg)' : 'var(--primary)',
                color: copied ? 'var(--success)' : 'white',
                border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                flexShrink: 0,
              }}>
                {copied ? <><Check size={14} /> {t('share.copied', 'Copied!')}</> : <><Copy size={14} /> {t('share.copyLink', 'Copy')}</>}
              </button>
            </div>
          )}
          <p style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
            {t('share.linkHint', 'Anyone with this link can view and download without logging in.')}
          </p>
        </div>

      </div>
    </Modal>
  );
}
