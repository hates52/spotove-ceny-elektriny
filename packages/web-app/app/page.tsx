'use client';

import { useState } from 'react';
import PriceChart from '@/components/PriceChart';
import EnergyFlow from '@/components/EnergyFlow';
import DailyCalendarAndChart from '@/components/DailyCalendarAndChart';
import AuthButton from '@/components/AuthButton';
import RequireAuth from '@/components/RequireAuth';
import Image from 'next/image';

type Tab = 'spot' | 'energy';

export default function Home() {
  const [tab, setTab] = useState<Tab>('spot');
  const [lastLevel, setLastLevel] = useState<string | null>(null);

  return (
    <RequireAuth>
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="px-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/assets/logo.svg" alt="Spotové ceny elektřiny" width={40} height={40} />
              <h1 className="text-2xl font-bold text-gray-800">Spotové ceny elektřiny</h1>
            </div>
            <AuthButton />
          </div>
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setTab('spot')}
              className={`px-4 py-2 rounded ${
                tab === 'spot' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Spot ceny
            </button>
            <button
              onClick={() => setTab('energy')}
              className={`px-4 py-2 rounded ${
                tab === 'energy' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Síť a energie
            </button>
          </div>

          {tab === 'spot' && (
            <>
              <PriceChart lastLevel={lastLevel} onLevelChange={setLastLevel} />
              <DailyCalendarAndChart />
            </>
          )}
          {tab === 'energy' && <EnergyFlow />}
        </div>
      </main>
    </RequireAuth>
  );
}
