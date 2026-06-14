import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Toast.module.css';

import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

let _addToast = null;
export function toast(message, type = 'info', duration = 4000) {
  _addToast?.({ id: Date.now(), message, type, duration });
}
toast.success = (msg) => toast(msg, 'success');
toast.error   = (msg) => toast(msg, 'error');
toast.warn    = (msg) => toast(msg, 'warn');

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  _addToast = (t) => {
    setToasts(prev => [...prev, t]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), t.duration);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} />;
      case 'error':   return <XCircle size={16} />;
      case 'warn':    return <AlertTriangle size={16} />;
      default:        return <Info size={16} />;
    }
  };

  return createPortal(
    <div className={styles.container}>
      {toasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
          <span className={styles.icon}>
            {getIcon(t.type)}
          </span>
          <span className={styles.message}>{t.message}</span>
          <button className={styles.dismiss} onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
