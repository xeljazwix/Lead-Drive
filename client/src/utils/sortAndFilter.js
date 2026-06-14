export function getCategory(mimeType) {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('msword') ||
    mimeType.includes('excel') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('text/') ||
    mimeType.includes('csv')
  ) {
    return 'document';
  }
  if (
    mimeType.includes('zip') ||
    mimeType.includes('rar') ||
    mimeType.includes('tar') ||
    mimeType.includes('7z') ||
    mimeType.includes('gzip') ||
    mimeType.includes('bzip2')
  ) {
    return 'archive';
  }
  return 'other';
}

export function applyFilter(items, filterType) {
  if (filterType === 'all') return items;
  return items.filter((item) => {
    // Folders don't have mimeTypes, usually we shouldn't filter them out unless requested.
    // However, the standard behavior for file filters is to only show matching files and ignore folders,
    // or keep folders. Let's filter out folders if a specific file type is requested.
    if (!item.mimeType) return false; 
    return getCategory(item.mimeType) === filterType;
  });
}

export function applySort(items, sortBy) {
  const sorted = [...items];
  
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'date-desc':
        return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
      case 'date-asc':
        return new Date(a.updatedAt || a.createdAt || 0) - new Date(b.updatedAt || b.createdAt || 0);
      case 'size-desc':
        return (b.size || 0) - (a.size || 0);
      case 'size-asc':
        return (a.size || 0) - (b.size || 0);
      default:
        return 0;
    }
  });

  return sorted;
}

export function processDriveItems(folders, files, filterType, sortBy) {
  // If we have a specific filter (e.g. 'image'), we hide folders to focus purely on the filtered files.
  // If the filter is 'all', we show folders.
  const resultFolders = filterType === 'all' ? applySort(folders, sortBy) : [];
  const resultFiles = applySort(applyFilter(files, filterType), sortBy);

  return { folders: resultFolders, files: resultFiles };
}
