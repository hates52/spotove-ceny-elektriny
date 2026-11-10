'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-24 h-10" />;
  }

  const themes = ['light', 'dark', 'system'] as const;
  const labels: Record<string, string> = {
    light: 'Světlý',
    dark: 'Tmavý',
    system: 'Auto',
  };
  const icons: Record<string, string> = {
    light: '☀️',
    dark: '🌙',
    system: '💻',
  };

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {themes.map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
            theme === t
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title={labels[t]}
        >
          <span aria-hidden="true">{icons[t]}</span>
          <span className="hidden sm:inline">{labels[t]}</span>
        </button>
      ))}
    </div>
  );
}