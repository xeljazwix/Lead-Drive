import styles from './Button.module.css';

export function Button({ children, variant = 'primary', size = 'md', icon, loading, className = '', ...props }) {
  return (
    <button
      className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <span className={styles.spinner} />}
      {icon && !loading && <span className={styles.icon}>{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
}
