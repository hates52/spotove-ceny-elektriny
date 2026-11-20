'use client';

import { useState } from 'react';
import PriceChart from '@/components/PriceChart';
import DailyCalendarAndChart from '@/components/DailyCalendarAndChart';
import AuthButton from '@/components/AuthButton';
import RequireAuth from '@/components/RequireAuth';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CurrencyProvider, CurrencyToggle } from '@/components/CurrencyContext';

export default function Home() {
  const [lastLevel, setLastLevel] = useState<string | null>(null);

  return (
    <CurrencyProvider>
      <RequireAuth>
        <main className="min-h-screen bg-background py-4 sm:py-8">
          <div className="px-3 sm:px-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Image src="/assets/logo.svg" alt="Spotové ceny elektřiny" width={40} height={40} />
                <h1 className="text-2xl font-bold text-foreground">Spotové ceny elektřiny</h1>
              </div>
              <div className="flex items-center gap-3">
                <CurrencyToggle />
                <ThemeToggle />
                <AuthButton />
              </div>
            </div>

            <PriceChart lastLevel={lastLevel} onLevelChange={setLastLevel} />
            <DailyCalendarAndChart />
          </div>
        </main>
      </RequireAuth>
    </CurrencyProvider>
  );
}