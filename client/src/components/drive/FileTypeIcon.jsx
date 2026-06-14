/**
 * FileTypeIcon — branded SVG badge icons for every file type.
 *
 * Design tool files (PSD, AI, INDD, etc.) get Adobe-style colored square
 * badges with letter monograms, exactly like the real application icons.
 * Standard types get lucide icons styled in accurate brand colors.
 */

import {
  FileImage, FileVideo, FileAudio, FileText, FileArchive,
  FileSpreadsheet, Presentation, FileCode, Globe, File,
  Camera, Package, Code2, FileJson, FileType,
} from 'lucide-react';
import styles from './FileTypeIcon.module.css';

// ─── Branded letter-badge (Adobe / Figma / Sketch style) ─────────────────────

function Badge({ label, bg, fg = '#fff', size = 44 }) {
  const isLong = label.length > 2;
  const fontSize = isLong ? Math.round(size * 0.28) : Math.round(size * 0.38);
  const radius   = Math.round(size * 0.18);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="44" height="44" rx={radius} fill={bg} />
      <text
        x="22"
        y={isLong ? '27' : '29'}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="'Inter', 'Segoe UI', Arial, sans-serif"
        fill={fg}
        letterSpacing={isLong ? '-0.5' : '0'}
      >
        {label}
      </text>
    </svg>
  );
}

// ─── Lucide icon wrapper ──────────────────────────────────────────────────────

function LucideIcon({ icon: Icon, color, size = 44 }) {
  return (
    <span className={styles.lucide} style={{ color }}>
      <Icon size={size} strokeWidth={1.4} />
    </span>
  );
}

// ─── Type definitions ─────────────────────────────────────────────────────────
// Each entry: { kind: 'badge'|'lucide', ...props }

const TYPE_MAP = [
  // ── Raster / photo editing ────────────────────────────────────────────────
  { match: /photoshop|x-photoshop|\.psd/,        kind: 'badge',  label: 'PSD',  bg: '#31A8FF'  },
  { match: /gimp|x-xcf/,                         kind: 'badge',  label: 'GIMP', bg: '#5C5543', fg: '#BAAD8D' },
  { match: /affinity.*photo/,                     kind: 'badge',  label: 'AP',   bg: '#7E4DD2'  },

  // ── Vector / illustration ─────────────────────────────────────────────────
  { match: /illustrator|postscript|\.ai\b/,       kind: 'badge',  label: 'Ai',   bg: '#FF9A00'  },
  { match: /affinity.*designer/,                  kind: 'badge',  label: 'AD',   bg: '#26C9FC'  },
  { match: /corel|cdr\b/,                         kind: 'badge',  label: 'CDR',  bg: '#6DBE45'  },
  { match: /inkscape|svg\+xml/,                   kind: 'lucide', icon: Globe,   color: '#FF9900' },

  // ── UI / prototyping ──────────────────────────────────────────────────────
  { match: /sketch|x-sketch/,                     kind: 'badge',  label: 'Sk',   bg: '#F7B500', fg: '#1A1A1A' },
  { match: /figma/,                               kind: 'badge',  label: 'Fg',   bg: '#0ACF83'  },
  { match: /adobexd|x-adobexd/,                   kind: 'badge',  label: 'Xd',   bg: '#FF61F6', fg: '#1A1A1A' },
  { match: /invision/,                            kind: 'badge',  label: 'Inv',  bg: '#FF3366'  },

  // ── Print / layout ────────────────────────────────────────────────────────
  { match: /indesign|x-indesign/,                 kind: 'badge',  label: 'Id',   bg: '#FF3366'  },
  { match: /quark/,                               kind: 'badge',  label: 'QXP',  bg: '#004B9B'  },

  // ── Video / motion ────────────────────────────────────────────────────────
  { match: /premiere|x-premiere/,                 kind: 'badge',  label: 'Pr',   bg: '#9999FF', fg: '#1A1A1A' },
  { match: /after.effects|x-ae/,                  kind: 'badge',  label: 'Ae',   bg: '#9999FF', fg: '#1A1A1A' },
  { match: /davinci|resolve/,                     kind: 'badge',  label: 'DV',   bg: '#E8171B'  },

  // ── 3D / CAD ─────────────────────────────────────────────────────────────
  { match: /blender|x-blender/,                   kind: 'badge',  label: 'Bl',   bg: '#E87D0D'  },
  { match: /3ds|max|maya/,                        kind: 'badge',  label: '3Ds',  bg: '#00A3E0'  },
  { match: /fbx|x-fbx/,                          kind: 'badge',  label: 'FBX',  bg: '#0073C6'  },
  { match: /gltf|glb/,                           kind: 'badge',  label: 'GL',   bg: '#5586A4'  },
  { match: /obj\b|x-obj/,                        kind: 'badge',  label: 'OBJ',  bg: '#888'     },
  { match: /autocad|dwg|dxf/,                    kind: 'badge',  label: 'DWG',  bg: '#DA291C'  },

  // ── RAW camera formats ────────────────────────────────────────────────────
  { match: /x-raw|x-adobe-dng|x-canon|x-nikon|x-sony|x-fuji|x-panasonic|cr[23]\b|\.nef|\.arw|\.raf|\.orf|\.rw2/, kind: 'lucide', icon: Camera, color: '#6D28D9' },

  // ── Documents ─────────────────────────────────────────────────────────────
  { match: /pdf/,                                 kind: 'badge',  label: 'PDF',  bg: '#FF0000'  },
  { match: /word|docx?/,                          kind: 'badge',  label: 'W',    bg: '#2B579A'  },
  { match: /excel|xlsx?/,                         kind: 'badge',  label: 'X',    bg: '#217346'  },
  { match: /csv/,                                 kind: 'badge',  label: 'CSV',  bg: '#16A34A', fg: '#fff' },
  { match: /powerpoint|pptx?/,                   kind: 'badge',  label: 'P',    bg: '#B7472A'  },

  // ── Code ─────────────────────────────────────────────────────────────────
  { match: /javascript/,                          kind: 'badge',  label: 'JS',   bg: '#F7DF1E', fg: '#1A1A1A' },
  { match: /typescript/,                          kind: 'badge',  label: 'TS',   bg: '#3178C6'  },
  { match: /json/,                                kind: 'lucide', icon: FileJson, color: '#6B7280' },
  { match: /html/,                                kind: 'badge',  label: 'HTML', bg: '#E34F26'  },
  { match: /css\b/,                               kind: 'badge',  label: 'CSS',  bg: '#1572B6'  },
  { match: /python|x-python/,                     kind: 'badge',  label: 'Py',   bg: '#3572A5'  },
  { match: /ruby/,                                kind: 'badge',  label: 'Rb',   bg: '#CC342D'  },
  { match: /rust/,                                kind: 'badge',  label: 'Rs',   bg: '#A72145'  },
  { match: /go\b|golang/,                         kind: 'badge',  label: 'Go',   bg: '#00ADD8'  },
  { match: /xml/,                                 kind: 'lucide', icon: Code2,   color: '#0891B2' },
  { match: /text\//,                              kind: 'lucide', icon: FileType, color: '#6B7280' },

  // ── Media ─────────────────────────────────────────────────────────────────
  { match: /^image\//,                            kind: 'lucide', icon: FileImage,    color: '#7C3AED' },
  { match: /^video\//,                            kind: 'lucide', icon: FileVideo,    color: '#DC2626' },
  { match: /^audio\//,                            kind: 'lucide', icon: FileAudio,    color: '#059669' },

  // ── Archives ─────────────────────────────────────────────────────────────
  { match: /zip|rar|7z|tar|gz|bz2|xz/,           kind: 'lucide', icon: FileArchive,  color: '#D97706' },

  // ── Font ─────────────────────────────────────────────────────────────────
  { match: /font|ttf|otf|woff/,                   kind: 'badge',  label: 'Aa',   bg: '#7C3AED'  },
];

// ─── Extension fallback map ───────────────────────────────────────────────────
// Browsers report many design/binary files as 'application/octet-stream'.
// When the MIME type doesn't match, we fall back to the file extension.
const EXT_MAP = {
  // Raster
  psd:  { kind: 'badge', label: 'PSD', bg: '#31A8FF' },
  psb:  { kind: 'badge', label: 'PSB', bg: '#31A8FF' },
  xcf:  { kind: 'badge', label: 'GIMP', bg: '#5C5543', fg: '#BAAD8D' },

  // Vector
  ai:   { kind: 'badge', label: 'Ai',  bg: '#FF9A00' },
  eps:  { kind: 'badge', label: 'EPS', bg: '#FF9A00' },
  svg:  { kind: 'lucide', icon: Globe, color: '#FF9900' },
  cdr:  { kind: 'badge', label: 'CDR', bg: '#6DBE45' },

  // UI / Proto
  sketch: { kind: 'badge', label: 'Sk', bg: '#F7B500', fg: '#1A1A1A' },
  fig:    { kind: 'badge', label: 'Fg', bg: '#0ACF83' },
  xd:     { kind: 'badge', label: 'Xd', bg: '#FF61F6', fg: '#1A1A1A' },

  // Print
  indd: { kind: 'badge', label: 'Id',  bg: '#FF3366' },
  indb: { kind: 'badge', label: 'Id',  bg: '#FF3366' },
  idml: { kind: 'badge', label: 'Id',  bg: '#FF3366' },
  qxp:  { kind: 'badge', label: 'QXP', bg: '#004B9B' },

  // Video motion
  prproj: { kind: 'badge', label: 'Pr', bg: '#9999FF', fg: '#1A1A1A' },
  aep:    { kind: 'badge', label: 'Ae', bg: '#9999FF', fg: '#1A1A1A' },
  drp:    { kind: 'badge', label: 'DV', bg: '#E8171B' },

  // 3D
  blend: { kind: 'badge', label: 'Bl',  bg: '#E87D0D' },
  fbx:   { kind: 'badge', label: 'FBX', bg: '#0073C6' },
  obj:   { kind: 'badge', label: 'OBJ', bg: '#888' },
  gltf:  { kind: 'badge', label: 'GL',  bg: '#5586A4' },
  glb:   { kind: 'badge', label: 'GL',  bg: '#5586A4' },
  '3ds': { kind: 'badge', label: '3Ds', bg: '#00A3E0' },
  max:   { kind: 'badge', label: '3Ds', bg: '#00A3E0' },
  ma:    { kind: 'badge', label: 'Ma',  bg: '#00A3E0' },
  mb:    { kind: 'badge', label: 'Ma',  bg: '#00A3E0' },

  // CAD
  dwg:  { kind: 'badge', label: 'DWG', bg: '#DA291C' },
  dxf:  { kind: 'badge', label: 'DXF', bg: '#DA291C' },

  // RAW camera
  raw:  { kind: 'lucide', icon: Camera, color: '#6D28D9' },
  cr2:  { kind: 'lucide', icon: Camera, color: '#6D28D9' },
  cr3:  { kind: 'lucide', icon: Camera, color: '#6D28D9' },
  nef:  { kind: 'lucide', icon: Camera, color: '#6D28D9' },
  arw:  { kind: 'lucide', icon: Camera, color: '#6D28D9' },
  raf:  { kind: 'lucide', icon: Camera, color: '#6D28D9' },
  orf:  { kind: 'lucide', icon: Camera, color: '#6D28D9' },
  rw2:  { kind: 'lucide', icon: Camera, color: '#6D28D9' },
  dng:  { kind: 'lucide', icon: Camera, color: '#6D28D9' },
  heic: { kind: 'lucide', icon: FileImage, color: '#7C3AED' },

  // Fonts
  ttf:  { kind: 'badge', label: 'Aa', bg: '#7C3AED' },
  otf:  { kind: 'badge', label: 'Aa', bg: '#7C3AED' },
  woff: { kind: 'badge', label: 'Aa', bg: '#7C3AED' },
  woff2:{ kind: 'badge', label: 'Aa', bg: '#7C3AED' },

  // Archives
  zip:  { kind: 'lucide', icon: FileArchive, color: '#D97706' },
  rar:  { kind: 'lucide', icon: FileArchive, color: '#D97706' },
  '7z': { kind: 'lucide', icon: FileArchive, color: '#D97706' },
  tar:  { kind: 'lucide', icon: FileArchive, color: '#D97706' },
  gz:   { kind: 'lucide', icon: FileArchive, color: '#D97706' },
};

const FALLBACK = { kind: 'lucide', icon: File, color: '#6B7280' };

/**
 * Resolve a type entry from MIME type first, then filename extension.
 * Browsers report exotic files (PSD, AI, SKETCH…) as 'application/octet-stream',
 * so the extension fallback is essential for correct icon display.
 */
function getTypeEntry(mimeType = '', filename = '') {
  const mime = mimeType.toLowerCase();
  const isGeneric = !mime || mime === 'application/octet-stream' || mime === 'application/binary';

  // 1. Try MIME type first (for well-known types browsers report correctly)
  if (!isGeneric) {
    const byMime = TYPE_MAP.find(t => t.match.test(mime));
    if (byMime) return byMime;
  }

  // 2. Fall back to file extension
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext && EXT_MAP[ext]) return EXT_MAP[ext];

  // 3. Last resort: try MIME even if generic (catches edge cases)
  return TYPE_MAP.find(t => t.match.test(mime)) ?? FALLBACK;
}

// ─── Public component ─────────────────────────────────────────────────────────

export function FileTypeIcon({ mimeType, filename = '', size = 44 }) {
  const entry = getTypeEntry(mimeType, filename);

  if (entry.kind === 'badge') {
    return <Badge label={entry.label} bg={entry.bg} fg={entry.fg} size={size} />;
  }
  return <LucideIcon icon={entry.icon} color={entry.color} size={size} />;
}

// ─── Also export color helper (used by FileThumbnail audio waveform) ──────────

export function getFileColor(mimeType = '', filename = '') {
  const entry = getTypeEntry(mimeType, filename);
  return entry.kind === 'badge' ? entry.bg : entry.color;
}
