import { create } from 'zustand';

// Check local storage or system preference on load
function getInitialTheme() {
  const stored = localStorage.getItem('theme');
  if (stored) return stored;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  localStorage.setItem('theme', theme);
}

// Initial apply
const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useThemeStore = create((set) => ({
  theme: initialTheme,
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    return { theme: newTheme };
  }),
}));
