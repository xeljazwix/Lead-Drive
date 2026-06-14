import { api } from './client.js';

export const foldersApi = {
  getRoot:    ()          => api.get('/folders/root/contents'),
  getContents:(id)        => api.get(`/folders/${id}/contents`),
  create:     (body)      => api.post('/folders', body),
  rename:     (id, name)  => api.patch(`/folders/${id}`, { name }),
  trash:      (id)        => api.delete(`/folders/${id}`),
  restore:    (id)        => api.post(`/folders/${id}/restore-trash`),
  share:      (id, body)  => api.post(`/folders/${id}/share`, body),
  copy:       (body)      => api.post('/folders/copy', body),
  move:       (body)      => api.patch('/folders/move', body),
};

export const filesApi = {
  upload:       (formData, onProgress) => api.upload('/files', formData, onProgress),
  scan:         (id)         => api.get(`/files/${id}/scan`),
  download:     async (id, name, toast)   => {
    try {
      if (toast) toast('Scanning for viruses...');
      await api.get(`/files/${id}/scan`);
      if (toast) toast.success('File is safe, starting download');
      
      const token = localStorage.getItem('cd_token');
      const a = document.createElement('a');
      a.href = `/api/files/${id}/download?token=${token}`;
      a.download = name;
      a.click();
    } catch (err) {
      if (toast) toast.error(`Download blocked: ${err.message}`);
      else console.error('Download blocked:', err);
    }
  },
  trash:        (id)         => api.delete(`/files/${id}`),
  restore:      (id)         => api.post(`/files/${id}/restore-trash`),
  hardDelete:   (id)         => api.delete(`/files/${id}/hard`),
  emptyTrash:   ()           => api.delete('/files/trash/empty'),
  star:         (id)         => api.patch(`/files/${id}/star`),
  share:        (id, body)   => api.post(`/files/${id}/share`, body),
  getVersions:  (id)         => api.get(`/files/${id}/versions`),
  restoreVersion:(id, vn)    => api.post(`/files/${id}/restore`, { versionNumber: vn }),
  getStarred:   ()           => api.get('/files/starred'),
  getRecent:    ()           => api.get('/files/recent'),
  getTrashed:   ()           => api.get('/files/trash'),
  getShared:    ()           => api.get('/files/shared-with-me'),
  search:       (q)          => api.get(`/search?q=${encodeURIComponent(q)}`),
  copy:         (body)       => api.post('/files/copy', body),
  move:         (body)       => api.patch('/files/move', body),
  compress:     (body)       => api.post('/files/compress', body),
  extract:      (id, body)   => api.post(`/files/${id}/extract`, body),
  downloadZip:  (fileIds, folderIds) => {
    const token = localStorage.getItem('cd_token');
    const params = new URLSearchParams({ token });
    if (fileIds?.length) params.append('fileIds', fileIds.join(','));
    if (folderIds?.length) params.append('folderIds', folderIds.join(','));
    const a = document.createElement('a');
    a.href = `/api/files/download/zip?${params.toString()}`;
    a.click();
  }
};

export const publicLinksApi = {
  create: (body) => api.post('/public-links', body),
};
