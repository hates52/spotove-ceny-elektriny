'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Currency = 'CZK' | 'EUR';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('currency') as Currency) || 'CZK';
    }
    return 'CZK';
  });

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  const currencies = ['CZK', 'EUR'] as const;
  const labels: Record<string, string> = {
    CZK: 'České koruny',
    EUR: 'Eura',
  };

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {currencies.map((c) => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          className={`flex items-center px-3 py-1.5 text-sm rounded-md transition-colors ${
            currency === c
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title={labels[c]}
        >
          {c}
        </button>
      ))}
    </div>
  );
}