'use client';

import { useEffect } from 'react';
import { fetchAndStoreHourlyPrices } from '@/app/lib/api';
import { useAuth } from 'react-oidc-context';

export default function HourlyPriceScheduler() {
  const auth = useAuth();
  const token = auth?.user?.access_token;
  useEffect(() => {
    const getDelayToNextHour = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const ms = now.getMilliseconds();
      const minutesUntilNextHour = 60 - minutes;
      const totalSeconds = minutesUntilNextHour * 60 - seconds;
      const delayMs = totalSeconds * 1000 - ms;
      return Math.max(0, delayMs);
    };

    const runFetch = async () => {
      if (!token) return;
      try {
        await fetchAndStoreHourlyPrices(token);
      } catch (err) {
        console.error('[HourlyPriceScheduler] fetch failed', err);
      }
    };

    runFetch();

    const scheduleNext = () => {
      const delay = getDelayToNextHour();
      return setTimeout(async () => {
        await runFetch();
        return scheduleNext();
      }, delay);
    };

    let timeoutId = scheduleNext();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [token]);

  return null;
}
