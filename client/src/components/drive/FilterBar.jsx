import { useState, useRef, useEffect } from 'react';
import { useDriveStore } from '../../store/drive.store.js';
import styles from './FilterBar.module.css';
import { Filter, ArrowDownUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function FilterBar() {
  const { t } = useTranslation();
  const { sortBy, filterType, setSortBy, setFilterType } = useDriveStore();
  const [openDropdown, setOpenDropdown] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterOptions = [
    { value: 'all', label: t('drive.allFiles') || 'All files' },
    { value: 'document', label: t('drive.documents') || 'Documents' },
    { value: 'image', label: t('drive.images') || 'Images' },
    { value: 'video', label: t('drive.videos') || 'Videos' },
    { value: 'audio', label: t('drive.audio') || 'Audio' },
    { value: 'archive', label: t('drive.archives') || 'Archives' },
    { value: 'other', label: t('drive.other') || 'Other' },
  ];

  const sortOptions = [
    { value: 'name-asc', label: t('drive.nameAZ') || 'Name (A-Z)' },
    { value: 'name-desc', label: t('drive.nameZA') || 'Name (Z-A)' },
    { value: 'date-desc', label: t('drive.dateNewest') || 'Modified (Newest)' },
    { value: 'date-asc', label: t('drive.dateOldest') || 'Modified (Oldest)' },
    { value: 'size-desc', label: t('drive.sizeLargest') || 'Size (Largest)' },
    { value: 'size-asc', label: t('drive.sizeSmallest') || 'Size (Smallest)' },
  ];

  return (
    <div className={styles.group} ref={ref}>
      <div 
        className={`${styles.control} ${openDropdown === 'filter' ? styles.controlActive : ''}`} 
        onClick={() => setOpenDropdown(openDropdown === 'filter' ? null : 'filter')}
      >
        <Filter size={14} className={styles.icon} />
        <div className={styles.selectBtn}>
          {filterOptions.find(o => o.value === filterType)?.label}
        </div>
        {openDropdown === 'filter' && (
          <div className={styles.dropdown}>
            {filterOptions.map(o => (
              <div 
                key={o.value} 
                className={`${styles.option} ${filterType === o.value ? styles.active : ''}`}
                onClick={(e) => { e.stopPropagation(); setFilterType(o.value); setOpenDropdown(null); }}
              >
                {o.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.divider} />

      <div 
        className={`${styles.control} ${openDropdown === 'sort' ? styles.controlActive : ''}`} 
        onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
      >
        <ArrowDownUp size={14} className={styles.icon} />
        <div className={styles.selectBtn}>
          {sortOptions.find(o => o.value === sortBy)?.label}
        </div>
        {openDropdown === 'sort' && (
          <div className={styles.dropdown}>
            {sortOptions.map(o => (
              <div 
                key={o.value} 
                className={`${styles.option} ${sortBy === o.value ? styles.active : ''}`}
                onClick={(e) => { e.stopPropagation(); setSortBy(o.value); setOpenDropdown(null); }}
              >
                {o.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
