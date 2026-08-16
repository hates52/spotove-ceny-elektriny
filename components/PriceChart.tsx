'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  TimeScale,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Bar } from 'react-chartjs-2';
import { format } from 'date-fns';
import 'chartjs-adapter-date-fns';
import { fetchAndStorePrice } from '../app/actions';
import { getTodayAndTomorrowData } from '../app/read-actions';
import { HourlyPriceEntry, HourlyPriceData } from '../lib/hourlyTypes';
import { getCookie, setCookie } from '../lib/cookies';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, TimeScale, annotationPlugin);

interface PriceChartProps {
  lastLevel: string | null;
  onLevelChange: (level: string) => void;
}

interface ChartPoint {
  timestamp: number;
  priceCZK: number;
  priceEur: number;
  level: string;
}

export default function PriceChart({ lastLevel, onLevelChange }: PriceChartProps) {
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [fetchIntervalMinutes, setFetchIntervalMinutes] = useState<number>(() => {
    const cookie = getCookie('spot_interval');
    const parsed = cookie ? parseInt(cookie, 10) : NaN;
    return [1, 5, 15, 30, 60].includes(parsed) ? parsed : 60;
  });
  const [nextFetchCountdown, setNextFetchCountdown] = useState<number>(() => {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ms = now.getMilliseconds();
    const interval = (() => {
      const cookie = getCookie('spot_interval');
      const parsed = cookie ? parseInt(cookie, 10) : NaN;
      return [1, 5, 15, 30, 60].includes(parsed) ? parsed : 60;
    })();

    const minutesUntilNext = interval - (minutes % interval);
    if (minutesUntilNext === interval && seconds === 0 && ms === 0) {
      return 0;
    }
    const totalSecondsUntilNext = minutesUntilNext * 60 - seconds;
    const delayMs = totalSecondsUntilNext * 1000 - ms;
    return Math.max(0, Math.ceil(delayMs / 1000));
  });
  const [currency, setCurrency] = useState<'CZK' | 'EUR'>(() => {
    const cookie = getCookie('spot_currency');
    return cookie === 'EUR' ? 'EUR' : 'CZK';
  });

  const getNextFetchDelaySeconds = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ms = now.getMilliseconds();
    const interval = fetchIntervalMinutes;

    const minutesUntilNext = interval - (minutes % interval);

    if (minutesUntilNext === interval && seconds === 0 && ms === 0) {
      return 0;
    }

    const totalSecondsUntilNext = minutesUntilNext * 60 - seconds;
    const delayMs = totalSecondsUntilNext * 1000 - ms;

    return Math.max(0, Math.ceil(delayMs / 1000));
  };

  const loadData = async () => {
    try {
      const { today, tomorrow } = await getTodayAndTomorrowData();
      const points: ChartPoint[] = [];

      const addDay = (dateStr: string, entries: HourlyPriceEntry[] | undefined) => {
        if (!entries) return;
        const [year, month, day] = dateStr.split('-').map(Number);
        entries.forEach((entry) => {
          const timestamp = new Date(year, month - 1, day, entry.hour, entry.minute, 0).getTime();
          points.push({
            timestamp,
            priceCZK: entry.priceCZK,
            priceEur: entry.priceEur,
            level: entry.level,
          });
        });
      };

      addDay(today?.date || '', today?.data);
      addDay(tomorrow?.date || '', tomorrow?.data);

      points.sort((a, b) => a.timestamp - b.timestamp);
      setChartPoints(points);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const performFetch = async () => {
      try {
        const price = await fetchAndStorePrice();
        onLevelChange(price.level);
        setLastFetch(new Date());
        setNextFetchCountdown(getNextFetchDelaySeconds());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fetch failed');
      }

      const delay = getNextFetchDelaySeconds() * 1000;
      timeoutId = setTimeout(performFetch, delay);
    };

    performFetch();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchIntervalMinutes]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNextFetchCountdown((prev) => (prev > 0 ? prev - 1 : getNextFetchDelaySeconds()));
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchIntervalMinutes]);

  useEffect(() => {
    setCookie('spot_currency', currency);
  }, [currency]);

  useEffect(() => {
    setCookie('spot_interval', String(fetchIntervalMinutes));
  }, [fetchIntervalMinutes]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'rgba(34, 197, 94, 0.7)';
      case 'medium':
        return 'rgba(234, 179, 8, 0.7)';
      case 'high':
        return 'rgba(239, 68, 68, 0.7)';
      default:
        return 'rgba(59, 130, 246, 0.6)';
    }
  };

  const getLevelBorderColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'rgba(34, 197, 94, 1)';
      case 'medium':
        return 'rgba(234, 179, 8, 1)';
      case 'high':
        return 'rgba(239, 68, 68, 1)';
      default:
        return 'rgba(59, 130, 246, 1)';
    }
  };

  const dynamicBarThickness = Math.max(1, Math.floor(900 / Math.max(1, chartPoints.length)) - 2);

  const chartData = {
    datasets: [
      {
        label: currency,
        data: chartPoints.map((d) => ({
          x: d.timestamp,
          y: currency === 'CZK' ? d.priceCZK : d.priceEur,
        })),
        backgroundColor: chartPoints.map((d) => getLevelColor(d.level)),
        borderColor: chartPoints.map((d) => getLevelBorderColor(d.level)),
        borderWidth: 1,
        barThickness: dynamicBarThickness,
      },
    ],
  };

  const now = Date.now();
  const currentPoint = chartPoints.reduce((prev, curr) =>
    Math.abs(curr.timestamp - now) < Math.abs(prev.timestamp - now) ? curr : prev
  , chartPoints[0]);
  const currentPrice = currentPoint ? (currency === 'CZK' ? currentPoint.priceCZK : currentPoint.priceEur) : null;
  const labelContent = currentPrice !== null ? `${currentPrice.toFixed(2)} ${currency}` : 'now';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `Cena silové elektřiny (${currency})`,
      },
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
      },
      annotation: {
        annotations: {
          nowLine: {
            type: 'line' as const,
            xMin: now,
            xMax: now,
            borderColor: 'rgba(0,0,0,0.6)',
            borderWidth: 1,
            borderDash: [6, 4] as [number, number],
            label: {
              display: true,
              content: labelContent,
              position: 'end' as const,
              yAdjust: -12,
            },
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'hour' as const,
          displayFormats: {
            hour: 'dd.MM HH:mm',
            day: 'dd.MM',
          },
          tooltipFormat: 'dd.MM.yyyy HH:mm',
        },
        grid: {
          display: false,
        },
        ticks: {
          display: true,
          maxRotation: 0,
          autoSkip: true,
        },
      },
      y: {
        grid: {
          display: false,
        },
        beginAtZero: false,
      },
    },
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Načítání dat...</div>;
  }

  return (
    <div className="w-full p-4">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="text-sm text-gray-600">
          {lastFetch && (
            <>
              Poslední stažení: {format(lastFetch, 'HH:mm:ss')}
              <br />
              Další stažení za: {nextFetchCountdown}s
            </>
          )}
          {!lastFetch && 'Čekání na první stažení...'}
        </div>
      </div>

      <div className="mb-4">
        <span className="text-sm text-gray-700 mr-2">Aktualizace každých:</span>
        {([1, 5, 15, 30, 60] as const).map((m) => (
          <button
            key={m}
            onClick={() => setFetchIntervalMinutes(m)}
            className={`mx-1 px-3 py-1 text-sm rounded ${
              fetchIntervalMinutes === m
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {m}m
          </button>
        ))}
      </div>

      <div className="mb-4">
        <span className="text-sm text-gray-700 mr-2">Měna:</span>
        {(['CZK', 'EUR'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={`mx-1 px-3 py-1 text-sm rounded ${
              currency === c
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {chartPoints.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          Zatím nejsou k dispozici žádná data.
        </div>
      ) : (
        <div className="h-96">
          <Bar data={chartData} options={options} />
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-50 rounded border text-sm">
        <div className="font-semibold mb-2">Legenda cenových úrovní:</div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 bg-green-500 rounded"></span>
            <span><strong>low (nízká):</strong> Elektřina je v rámci dne levná. Doporučuje se zapnout náročné spotřebiče (nabíjení auta, ohřev bojleru).</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 bg-yellow-500 rounded"></span>
            <span><strong>medium (střední):</strong> Průměrná, běžná cena v rámci dne.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 bg-red-500 rounded"></span>
            <span><strong>high (vysoká):</strong> Elektřina je drahá. Je vhodné odložit spotřebu a vypnout volitelné zátěže.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
