import { useDriveStore } from '../../store/drive.store.js';
import { FolderOpen, ChevronRight, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './BreadCrumb.module.css';

export function BreadCrumb({ onNavigateRoot, onNavigateBack, onNavigateTo, showBackButton }) {
  const { t } = useTranslation();
  const { breadcrumb } = useDriveStore();

  return (
    <nav className={styles.crumb} aria-label="Breadcrumb">
      {showBackButton && (
        <button className={`${styles.item} ${styles.backBtn}`} onClick={onNavigateBack} title={t('drive.back', 'Back')} type="button">
          <ArrowLeft size={16} /> {t('drive.back', 'Back')}
        </button>
      )}
      <button className={styles.item} onClick={onNavigateRoot} type="button">
        <FolderOpen size={16} /> {t('nav.myDrive')}
      </button>
      {breadcrumb.map((folder, i) => (
        <span key={folder.id} className={styles.crumbPart}>
          <span className={styles.sep}><ChevronRight size={14} /></span>
          <button
            className={`${styles.item} ${i === breadcrumb.length - 1 ? styles.active : ''}`}
            onClick={() => onNavigateTo(folder, i)}
          >
            {folder.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
