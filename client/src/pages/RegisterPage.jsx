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

export function RegisterPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  function validate() {
    const e = {};
    if (!form.username) e.username = 'Required';
    if (form.password.length < 8) e.password = 'At least 8 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await authApi.register({ username: form.username, password: form.password });
      login(data.token, data.user);
      navigate('/drive');
    } catch (err) {
      toast.error(err.message ?? 'Registration failed');
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
        <h1 className={styles.title}>{t('auth.createAccount')}</h1>
        <p className={styles.subtitle}>{t('auth.register')}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input label={t('auth.username')} id="reg-username" placeholder={t('auth.username')} icon={<User size={16} />}
            value={form.username} onChange={set('username')} error={errors.username} autoFocus />
          <Input label={t('auth.password')} id="reg-password" type="password" placeholder="••••••••" icon={<Lock size={16} />}
            value={form.password} onChange={set('password')} error={errors.password} />
          <Input label="Confirm Password" id="reg-confirm" type="password" placeholder="••••••••" icon={<Lock size={16} />}
            value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
          <Button type="submit" loading={loading} size="lg" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            {t('auth.createAccount')}
          </Button>
        </form>

        <p className={styles.switch}>
          {t('auth.hasAccount')} <Link to="/login" className={styles.link}>{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  );
}
