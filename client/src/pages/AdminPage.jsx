import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin.js';
import { Header } from '../components/layout/Header.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Input } from '../components/ui/Input.jsx';
import { toast } from '../components/ui/Toast.jsx';
import { formatBytes } from '../utils/format.js';
import { UserPlus, HardDrive, UserX, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './AdminPage.module.css';

export function AdminPage() {
  const { t } = useTranslation();
  const [stats, setStats]   = useState(null);
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUserModal, setNewUserModal] = useState(false);
  const [quotaModal, setQuotaModal]   = useState(null);

  function loadAll() {
    setLoading(true);
    Promise.all([adminApi.getStats(), adminApi.listUsers()])
      .then(([s, u]) => { setStats(s.stats); setUsers(u.data.users); })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(loadAll, []);

  async function handleDeactivate(id) {
    if (!confirm(t('admin.deactivateWarning'))) return;
    try {
      await adminApi.deleteUser(id, false);
      loadAll();
    } catch (err) { toast.error(err.message); }
  }

  async function handleDelete(id) {
    if (!confirm(t('admin.deleteWarning'))) return;
    try {
      await adminApi.deleteUser(id, true);
      loadAll();
    } catch (err) { toast.error(err.message); }
  }

  return (
    <>
      <Header title={t('nav.adminPanel')} actions={
        <Button icon={<UserPlus size={16} />} size="sm" onClick={() => setNewUserModal(true)}>{t('admin.newUser')}</Button>
      } />

      <div className={styles.content}>
        {/* Stats */}
        {stats && (
          <div className={styles.statsGrid}>
            {[
              { label: t('admin.totalUsers'),   value: stats.totalUsers   },
              { label: t('admin.activeUsers'),  value: stats.activeUsers  },
              { label: t('admin.totalFiles'),   value: stats.totalFiles   },
              { label: t('admin.storageUsed'),  value: formatBytes(stats.totalStorageUsedBytes) },
            ].map(s => (
              <div key={s.label} className={styles.statCard}>
                <p className={styles.statValue}>{s.value}</p>
                <p className={styles.statLabel}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users Table */}
        <div className={styles.tableCard}>
          <h2 className={styles.tableTitle}>{t('admin.users')}</h2>
          {loading ? <p style={{ color: 'var(--text-muted)', padding: 20 }}>{t('admin.loading')}</p> : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('admin.username')}</th><th>{t('admin.role')}</th><th>{t('admin.storage')}</th><th>{t('admin.status')}</th><th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className={!u.isActive ? styles.inactive : ''}>
                      <td className={styles.username}>{u.username}</td>
                      <td><span className={`${styles.badge} ${u.role === 'SUPER_ADMIN' ? styles.admin : ''}`}>{u.role}</span></td>
                      <td>{formatBytes(u.storageUsed)} / {formatBytes(u.storageQuota)}</td>
                      <td><span className={`${styles.status} ${u.isActive ? styles.active : styles.inactive}`}>{u.isActive ? t('admin.active') : t('admin.inactive')}</span></td>
                      <td className={styles.actions}>
                        <button className={styles.actionBtn} onClick={() => setQuotaModal(u)} title={t('admin.editQuota')}>
                          <HardDrive size={15} />
                        </button>
                        {u.isActive && (
                          <button className={`${styles.actionBtn} ${styles.warning}`} onClick={() => handleDeactivate(u.id)} title={t('admin.deactivateWarning')}>
                            <UserX size={15} />
                          </button>
                        )}
                        <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => handleDelete(u.id)} title={t('admin.deleteWarning')}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {newUserModal && <NewUserModal onClose={() => setNewUserModal(false)} onCreated={loadAll} />}
      {quotaModal   && <QuotaModal user={quotaModal} onClose={() => setQuotaModal(null)} onUpdated={loadAll} />}
    </>
  );
}

// ─── New User Modal ────────────────────────────────────────────────────────────
function NewUserModal({ onClose, onCreated }) {
  const { t } = useTranslation();
  const [form, setForm]   = useState({ username: '', password: '', role: 'USER' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleCreate() {
    setLoading(true);
    try {
      await adminApi.createUser(form);
      toast.success('User created');
      onCreated(); onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal open onClose={onClose} title={t('admin.createUser')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('admin.cancel')}</Button><Button onClick={handleCreate} loading={loading}>{t('admin.create')}</Button></>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label={t('admin.username')} value={form.username} onChange={set('username')} autoFocus />
        <Input label={t('admin.password')} type="password" value={form.password} onChange={set('password')} />
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>{t('admin.role')}</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['USER', 'SUPER_ADMIN'].map(r => (
              <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                style={{ flex: 1, padding: '10px 0', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13, background: 'var(--surface)', color: form.role === r ? 'var(--primary)' : 'var(--text-subtle)', boxShadow: form.role === r ? 'var(--shadow-inset-sm)' : 'var(--shadow-raised-sm)', transition: 'all var(--t-base)' }}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Quota Modal ──────────────────────────────────────────────────────────────
function QuotaModal({ user, onClose, onUpdated }) {
  const { t } = useTranslation();
  const [gb, setGb] = useState(String(Math.round(Number(user.storageQuota) / 1073741824)));
  const [loading, setLoading] = useState(false);

  async function handleUpdate() {
    setLoading(true);
    try {
      const bytes = String(Math.round(parseFloat(gb) * 1073741824));
      await adminApi.updateQuota(user.id, bytes);
      toast.success('Quota updated');
      onUpdated(); onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal open onClose={onClose} title={`${t('admin.editQuota')} — ${user.username}`}
      footer={<><Button variant="ghost" onClick={onClose}>{t('admin.cancel')}</Button><Button onClick={handleUpdate} loading={loading}>{t('admin.save')}</Button></>}
    >
      <Input label={t('admin.storageQuotaGB')} type="number" min="1" max="10000" value={gb} onChange={e => setGb(e.target.value)} />
    </Modal>
  );
}
