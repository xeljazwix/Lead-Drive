import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.js';
import { useAuthStore } from '../store/auth.store.js';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { toast } from '../components/ui/Toast.jsx';
import styles from './AuthPage.module.css';
import { useTranslation } from 'react-i18next';
import { User, Lock } from 'lucide-react';

export function LoginPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.login(form);
      login(data.token, data.user);
      navigate('/drive');
    } catch (err) {
      toast.error(err.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <img src="/lead-logo.svg" alt="Lead Drive" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
        <h1 className={styles.title}>{t('auth.welcomeBack')}</h1>
        <p className={styles.subtitle}>{t('auth.login')}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input label={t('auth.username')} id="login-username" placeholder={t('auth.username')} icon={<User size={16} />}
            value={form.username} onChange={set('username')} autoFocus autoComplete="username" />
          <Input label={t('auth.password')} id="login-password" type="password" placeholder="••••••••" icon={<Lock size={16} />}
            value={form.password} onChange={set('password')} autoComplete="current-password" />
          <Button type="submit" loading={loading} size="lg" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            {t('auth.login')}
          </Button>
        </form>

        <p className={styles.switch}>
          {t('auth.noAccount')} <Link to="/register" className={styles.link}>{t('auth.register')}</Link>
        </p>
      </div>
    </div>
  );
}
