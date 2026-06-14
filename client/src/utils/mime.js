import { 
  FileImage, FileVideo, FileAudio, FileText, FileArchive, 
  FileSpreadsheet, Presentation, FileCode, Globe, File,
  Layers, Pen, Box, Camera
} from 'lucide-react';

const mimeMap = [
  // ── Media ─────────────────────────────────────────────────────────────────
  { match: /^image\//,                             icon: FileImage,       color: '#7c3aed', label: 'Image'      },
  { match: /^video\//,                             icon: FileVideo,       color: '#dc2626', label: 'Video'      },
  { match: /^audio\//,                             icon: FileAudio,       color: '#059669', label: 'Audio'      },

  // ── Documents ─────────────────────────────────────────────────────────────
  { match: /pdf/,                                  icon: FileText,        color: '#dc2626', label: 'PDF'        },
  { match: /word|docx?/,                           icon: FileText,        color: '#2563eb', label: 'Document'   },
  { match: /excel|xlsx?|csv/,                      icon: FileSpreadsheet, color: '#059669', label: 'Sheet'      },
  { match: /powerpoint|pptx?/,                     icon: Presentation,    color: '#d97706', label: 'Slides'     },

  // ── Code ──────────────────────────────────────────────────────────────────
  { match: /javascript|json/,                      icon: FileCode,        color: '#7c3aed', label: 'Code'       },
  { match: /html|css|xml/,                         icon: Globe,           color: '#0891b2', label: 'Web'        },
  { match: /text\//,                               icon: FileText,        color: '#374151', label: 'Text'       },

  // ── Design & Creative ─────────────────────────────────────────────────────
  // Photoshop
  { match: /photoshop|x-photoshop|psd/,            icon: Layers,          color: '#31a8ff', label: 'Photoshop'  },
  // Illustrator / AI
  { match: /illustrator|postscript|ai$/,           icon: Pen,             color: '#ff9a00', label: 'Illustrator'},
  // Figma / Sketch / XD
  { match: /figma|sketch|x-sketch|adobexd|xd/,    icon: Pen,             color: '#a259ff', label: 'Design'     },
  // Blender / 3D
  { match: /blender|x-blender|3ds|obj|fbx|gltf/,  icon: Box,             color: '#e87d0d', label: '3D'         },
  // RAW camera formats
  { match: /x-raw|x-adobe-dng|x-canon|x-nikon|x-sony|x-fuji|x-panasonic|cr[23]|nef|arw|raf|orf|rw2/, icon: Camera, color: '#6d28d9', label: 'RAW' },
  // InDesign
  { match: /indesign|x-indesign/,                  icon: Layers,          color: '#ff3366', label: 'InDesign'   },

  // ── Archives ──────────────────────────────────────────────────────────────
  { match: /zip|rar|7z|tar|gz|bz2|xz|zstd/,       icon: FileArchive,     color: '#d97706', label: 'Archive'    },
];

const fallback = { icon: File, color: '#6b7280', label: 'File' };

export function getMimeInfo(mimeType = '') {
  return mimeMap.find(m => m.match.test(mimeType)) ?? fallback;
}

export function getExtension(filename = '') {
  return filename.split('.').pop()?.toUpperCase() ?? '';
}

