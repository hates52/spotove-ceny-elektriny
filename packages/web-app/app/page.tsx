'use client';

import { useState } from 'react';
import PriceChart from '@/components/PriceChart';
import EnergyFlow from '@/components/EnergyFlow';
import DailyCalendarAndChart from '@/components/DailyCalendarAndChart';
import AuthButton from '@/components/AuthButton';

type Tab = 'spot' | 'energy';

export default function Home() {
  const [tab, setTab] = useState<Tab>('spot');
  const [lastLevel, setLastLevel] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('spot')}
              className={`px-4 py-2 rounded ${
                tab === 'spot' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Spot ceny
            </button>
            <button
              onClick={() => setTab('energy')}
              className={`px-4 py-2 rounded ${
                tab === 'energy' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Síť a energie
            </button>
          </div>
          <AuthButton />
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
  );
}
