// ─── Base API Client ─────────────────────────────────────────────────────────
// All requests go through here. Attaches JWT, handles 401 globally.

export const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('cd_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  headers['Bypass-Tunnel-Reminder'] = 'true';
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Token expired — clear and redirect to login
    localStorage.removeItem('cd_token');
    localStorage.removeItem('cd_user');
    window.location.href = '/login';
    return;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message ?? 'Request failed');
    err.status = res.status;
    throw err;
  }

  return data;
}

export const api = {
  get:    (path, opts)   => request(path, { method: 'GET', ...opts }),
  post:   (path, body, opts) => request(path, { method: 'POST',  body: body instanceof FormData ? body : JSON.stringify(body), ...opts }),
  put:    (path, body, opts) => request(path, { method: 'PUT',   body: body instanceof FormData ? body : JSON.stringify(body), ...opts }),
  patch:  (path, body)   => request(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path)         => request(path, { method: 'DELETE' }),
  upload: (path, formData, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}${path}`);
      
      const token = getToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Bypass-Tunnel-Reminder', 'true');
      
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }
      
      xhr.onload = () => {
        if (xhr.status === 401) {
          localStorage.removeItem('cd_token');
          localStorage.removeItem('cd_user');
          window.location.href = '/login';
          return reject(new Error('Unauthorized'));
        }
        let data;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = {};
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          const err = new Error(data.message ?? 'Upload failed');
          err.status = xhr.status;
          reject(err);
        }
      };
      
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  }
};
