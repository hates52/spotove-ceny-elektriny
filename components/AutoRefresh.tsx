'use client';

import { useEffect, useRef } from 'react';

export default function AutoRefresh() {
  const instanceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    let mounted = true;

    const poll = async () => {
      try {
        const res = await fetch('/api/instance', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;

        if (instanceIdRef.current !== null && data.instanceId !== instanceIdRef.current) {
          window.location.reload();
          return;
        }

        instanceIdRef.current = data.instanceId;
      } catch {
        // ignore network errors during reloads
      }
    };

    poll();
    const interval = setInterval(poll, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return null;
}
