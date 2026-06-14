import { create } from 'zustand';

export const useDriveStore = create((set, get) => ({
  // Current view
  view: 'grid',         // 'grid' | 'list'
  sortBy: 'name-asc',   // 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc' | 'size-desc' | 'size-asc'
  filterType: 'all',    // 'all' | 'image' | 'video' | 'audio' | 'document' | 'archive'
  currentFolder: null,  // null = root
  breadcrumb: [],       // [{ id, name }]

  // Contents
  folders: [],
  files: [],
  loading: false,
  error: null,

  // Selection
  selected: new Set(),
  lastSelected: null,

  // Clipboard
  clipboard: { action: null, items: [] },

  // Upload state
  uploads: [],          // [{ id, name, progress, status }]

  setView: (view) => set({ view }),
  setSortBy: (sortBy) => set({ sortBy }),
  setFilterType: (filterType) => set({ filterType }),

  setContents: ({ folders = [], files = [], folder = null }) => {
    const crumb = folder ? buildBreadcrumb(get().breadcrumb, folder) : [];
    set({ folders, files, loading: false, error: null, currentFolder: folder, breadcrumb: crumb, selected: new Set(), lastSelected: null });
  },

  setLoading: (loading) => set({ loading }),
  setError:   (error)   => set({ error, loading: false }),

  selectItem: (id, itemsList, isCtrl, isShift) => set((s) => {
    let newSel = new Set();
    let newLast = id;

    if (isCtrl) {
      newSel = new Set(s.selected);
      newSel.has(id) ? newSel.delete(id) : newSel.add(id);
    } else if (isShift && s.lastSelected && itemsList) {
      newSel = new Set(s.selected);
      const startIdx = itemsList.findIndex(item => item.id === s.lastSelected);
      const endIdx = itemsList.findIndex(item => item.id === id);
      if (startIdx !== -1 && endIdx !== -1) {
        const min = Math.min(startIdx, endIdx);
        const max = Math.max(startIdx, endIdx);
        for (let i = min; i <= max; i++) {
          newSel.add(itemsList[i].id);
        }
      } else {
        newSel.add(id);
      }
    } else {
      newSel.add(id);
    }
    return { selected: newSel, lastSelected: newLast };
  }),

  selectAll: (ids) => set({ selected: new Set(ids) }),

  clearSelection: () => set({ selected: new Set(), lastSelected: null }),

  setClipboard: (action, items) => set({ clipboard: { action, items } }),
  clearClipboard: () => set({ clipboard: { action: null, items: [] } }),

  navigateToRoot: () => set({ breadcrumb: [], currentFolder: null }),

  navigateTo: (folder) => {
    const crumb = buildBreadcrumb(get().breadcrumb, folder);
    set({ breadcrumb: crumb, currentFolder: folder });
  },

  navigateUp: (index) => {
    const crumb = get().breadcrumb.slice(0, index + 1);
    const folder = index < 0 ? null : crumb[index];
    set({ breadcrumb: crumb, currentFolder: folder });
  },

  addUpload:    (upload) => set((s) => ({ uploads: [...s.uploads, upload] })),
  updateUpload: (id, patch) => set((s) => ({
    uploads: s.uploads.map(u => u.id === id ? { ...u, ...patch } : u),
  })),
  removeUpload: (id) => set((s) => ({ uploads: s.uploads.filter(u => u.id !== id) })),
}));

// Build linear breadcrumb — navigate into folder appends, going back trims
function buildBreadcrumb(current, folder) {
  const existing = current.findIndex(f => f.id === folder.id);
  if (existing >= 0) return current.slice(0, existing + 1);
  return [...current, { id: folder.id, name: folder.name }];
}
