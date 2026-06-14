import { useEffect, useState, useCallback } from 'react';
import { useDriveStore } from '../store/drive.store.js';
import { foldersApi, filesApi } from '../api/drive.js';
import { toast } from '../components/ui/Toast.jsx';

export function useDriveData(currentFolder) {
  const { setContents, setLoading, setError } = useDriveStore();
  const [tick, setTick] = useState(0);
  const [localLoading, setLocalLoading] = useState(true);
  const [folders, setFolders] = useState([]);
  const [files, setFiles]   = useState([]);

  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLocalLoading(true);

    const fetchData = currentFolder
      ? foldersApi.getContents(currentFolder.id)
      : foldersApi.getRoot();

    fetchData
      .then(data => {
        if (cancelled) return;
        // getRoot returns 'folders', getContents returns 'subFolders'
        setFolders(data.folders ?? data.subFolders ?? []);
        setFiles(data.files ?? []);
      })
      .catch(err => {
        if (!cancelled) toast.error(err.message);
      })
      .finally(() => {
        if (!cancelled) setLocalLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentFolder, tick]);

  return { folders, files, loading: localLoading, reload };
}
