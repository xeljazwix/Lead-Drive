import { forwardRef } from 'react';
import styles from './Input.module.css';

export const Input = forwardRef(function Input({ label, error, icon, className = '', ...props }, ref) {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.inputWrap}>
        {icon && <span className={styles.iconLeft}>{icon}</span>}
        <input
          ref={ref}
          className={`${styles.input} ${icon ? styles.hasIcon : ''} ${error ? styles.hasError : ''}`}
          {...props}
        />
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
});
