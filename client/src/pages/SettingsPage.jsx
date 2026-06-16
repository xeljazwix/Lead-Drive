import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/auth.store.js';
import { authApi } from '../api/auth.js';
import { toast } from '../components/ui/Toast.jsx';
import { Header } from '../components/layout/Header.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { User, Lock, Upload, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getAvatarUrl } from '../utils/format.js';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const fileInputRef = useRef(null);

  // Profile State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Avatar State
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setUsername(user.username || '');
    }
  }, [user]);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await authApi.updateProfile({ fullName, username });
      updateUser(res.user);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error('New passwords do not match');
    }
    setPasswordSaving(true);
    try {
      await authApi.updatePassword({ currentPassword, newPassword });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await authApi.uploadAvatar(formData);
      updateUser(res.user);
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <>
      <Header title={t('nav.settings')} />
      <div className={styles.container}>
        <div className={styles.layout}>
          
          <div className={styles.sidebar}>
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrapper}>
                {user?.avatarUrl ? (
                  <img src={getAvatarUrl(user.avatarUrl)} alt="Avatar" className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {user?.fullName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}
                  </div>
                )}
                
                <button 
                  className={styles.avatarOverlay}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                >
                  <Camera size={24} />
                  <span>{t('admin.editQuota').split(' ')[0] || 'Change'}</span>
                </button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className={styles.hiddenInput} 
                accept="image/*"
                onChange={handleAvatarChange}
              />
              <h2 className={styles.userNameDisplay}>{user?.fullName || user?.username}</h2>
              <p className={styles.userRoleDisplay}>{user?.role}</p>
            </div>
          </div>

          <div className={styles.main}>
            {/* Profile Form */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <User size={20} className={styles.sectionIcon} />
                <h3>{t('admin.profileInfo') || 'Personal Information'}</h3>
              </div>
              <form className={styles.form} onSubmit={handleProfileSubmit}>
                <div className={styles.formGroup}>
                  <label htmlFor="fullName">{t('auth.fullName') || 'Full Name'}</label>
                  <Input 
                    id="fullName"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your actual name"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="username">{t('admin.username') || 'Username'}</label>
                  <Input 
                    id="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Your username"
                  />
                </div>
                <div className={styles.actions}>
                  <Button type="submit" variant="primary" loading={profileSaving}>
                    {t('admin.save') || 'Save Changes'}
                  </Button>
                </div>
              </form>
            </section>

            {/* Security Form */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <Lock size={20} className={styles.sectionIcon} />
                <h3>{t('admin.security') || 'Security'}</h3>
              </div>
              <form className={styles.form} onSubmit={handlePasswordSubmit}>
                <div className={styles.formGroup}>
                  <label htmlFor="currentPassword">{t('admin.currentPassword') || 'Current Password'}</label>
                  <Input 
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <div className={styles.row}>
                  <div className={styles.formGroup}>
                    <label htmlFor="newPassword">{t('admin.newPassword') || 'New Password'}</label>
                    <Input 
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="confirmPassword">{t('admin.confirmPassword') || 'Confirm Password'}</label>
                    <Input 
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                </div>
                <div className={styles.actions}>
                  <Button type="submit" variant="primary" loading={passwordSaving}>
                    {t('admin.updatePassword') || 'Update Password'}
                  </Button>
                </div>
              </form>
            </section>
          </div>

        </div>
      </div>
    </>
  );
}
