import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './ContextMenu.module.css';

export function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    // Small delay so the triggering click doesn't immediately close
    const t = setTimeout(() => {
      document.addEventListener('mousedown', handler);
      document.addEventListener('touchstart', handler);
      document.addEventListener('contextmenu', onClose);
    }, 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('contextmenu', onClose);
    };
  }, [onClose]);

  // Adjust position if near viewport edge
  const style = { top: y, left: x };

  return createPortal(
    <ul className={styles.menu} style={style} ref={ref} role="menu">
      {items.map((item, i) =>
        item.divider
          ? <li key={i} className={styles.divider} role="separator" />
          : (
            <li key={i} role="menuitem">
              <button
                className={`${styles.item} ${item.danger ? styles.danger : ''}`}
                onClick={() => { item.onClick(); onClose(); }}
                disabled={item.disabled}
              >
                {item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            </li>
          )
      )}
    </ul>,
    document.body
  );
}
