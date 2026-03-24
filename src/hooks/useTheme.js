import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('jh_theme');
    if (savedTheme) return savedTheme;
    // Default to dark theme for premium feel
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem('jh_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return { theme, toggleTheme };
}
