'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { fetchCurrentPrice } from '@/app/lib/api';
import { fetchTodayAndTomorrowData } from '@/app/lib/api';
import { HourlyPriceEntry, HourlyPriceData } from '@/lib/hourlyTypes';
import { getCookie, setCookie } from '@/lib/cookies';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, TimeScale, annotationPlugin);

const datasetTitlePlugin = {
  id: 'datasetTitle',
  afterDraw(chart: any) {
    const { ctx, chartArea, scales } = chart;
    const todayData = chart.data.datasets[0]?.data || [];
    const tomorrowData = chart.data.datasets[1]?.data || [];

    if (todayData.length === 0 && tomorrowData.length === 0) return;

    ctx.save();
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.textAlign = 'center';

    if (todayData.length > 0) {
      const first = todayData[0].x;
      const last = tomorrowData.length > 0 ? tomorrowData[0].x - 1 : chartArea.right;
      const midX = (scales.x.getPixelForValue(first) + scales.x.getPixelForValue(last)) / 2;
      const y = chartArea.top - 8;
      const today = new Date(first);
      const dateStr = `${today.getDate()}.${today.getMonth() + 1}.${today.getFullYear()}`;
      ctx.fillText(`Spotové ceny silové elektřiny ke dni ${dateStr}`, midX, y);
    }

    if (tomorrowData.length > 0) {
      const first = tomorrowData[0].x;
      const last = tomorrowData[tomorrowData.length - 1].x;
      const midX = (scales.x.getPixelForValue(first) + scales.x.getPixelForValue(last)) / 2;
      const y = chartArea.top - 8;
      const tomorrow = new Date(first);
      const dateStr = `${tomorrow.getDate()}.${tomorrow.getMonth() + 1}.${tomorrow.getFullYear()}`;
      ctx.fillText(`Spotové ceny silové elektřiny ke dni ${dateStr}`, midX, y);
    }

    ctx.restore();
  },
};

ChartJS.register(datasetTitlePlugin);

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

interface CurrentPrice {
  priceCZK: number;
  priceEUR: number;
  level: string;
}

export default function PriceChart({ lastLevel, onLevelChange }: PriceChartProps) {
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<CurrentPrice | null>(null);
  const [currency, setCurrency] = useState<'CZK' | 'EUR'>(() => {
    const cookie = getCookie('spot_currency');
    return cookie === 'EUR' ? 'EUR' : 'CZK';
  });
  const [highTariff, setHighTariff] = useState<string>(() => {
    return getCookie('spot_high_tariff') || '';
  });
  const [lowTariff, setLowTariff] = useState<string>(() => {
    return getCookie('spot_low_tariff') || '';
  });
  const [dataHash, setDataHash] = useState<string>('');

  const loadData = async () => {
    try {
      const { today, tomorrow } = await fetchTodayAndTomorrowData();
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
      const newHash = JSON.stringify({ today, tomorrow });
      if (newHash !== dataHash) {
        setDataHash(newHash);
        setChartPoints(points);
      }
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
    const fetchCurrent = async () => {
      try {
        const price = await fetchCurrentPrice();
        setCurrentPrice({
          priceCZK: price.priceCZK,
          priceEUR: price.priceEUR,
          level: price.level,
        });
        onLevelChange(price.level);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fetch failed');
      }
    };

    fetchCurrent();
    const intervalId = setInterval(fetchCurrent, 10000);
    return () => clearInterval(intervalId);
  }, [onLevelChange]);

  useEffect(() => {
    setCookie('spot_currency', currency);
  }, [currency]);

  useEffect(() => {
    setCookie('spot_high_tariff', highTariff);
  }, [highTariff]);

  useEffect(() => {
    setCookie('spot_low_tariff', lowTariff);
  }, [lowTariff]);

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

  const dynamicBarThickness = Math.max(1, Math.floor(900 / Math.max(1, chartPoints.length) - 0.5));

  const tomorrowDate = chartPoints.length > 0 ? new Date(chartPoints[chartPoints.length - 1].timestamp) : new Date();
  const tomorrowStart = new Date(tomorrowDate.getFullYear(), tomorrowDate.getMonth(), tomorrowDate.getDate()).getTime();

  const todayData = chartPoints.filter((d) => d.timestamp < tomorrowStart);
  const tomorrowData = chartPoints.filter((d) => d.timestamp >= tomorrowStart);

  const chartData = useMemo(() => ({
    datasets: [
      {
        label: currency,
        data: todayData.map((d) => ({
          x: d.timestamp,
          y: currency === 'CZK' ? d.priceCZK : d.priceEur,
        })),
        backgroundColor: todayData.map((d) => getLevelColor(d.level)),
        borderColor: todayData.map((d) => getLevelBorderColor(d.level)),
        borderWidth: 0,
        barThickness: dynamicBarThickness,
      },
      {
        label: currency,
        data: tomorrowData.map((d) => ({
          x: d.timestamp,
          y: currency === 'CZK' ? d.priceCZK : d.priceEur,
        })),
        backgroundColor: tomorrowData.map((d) => getLevelColor(d.level).replace('0.7', '0.25').replace('0.6', '0.2')),
        borderColor: tomorrowData.map((d) => getLevelBorderColor(d.level).replace('1', '0.4')),
        borderWidth: 0,
        barThickness: dynamicBarThickness,
      },
    ],
  }), [currency, todayData, tomorrowData, dynamicBarThickness]);

  const now = Date.now();
  const currentPoint = chartPoints.reduce((prev, curr) =>
    Math.abs(curr.timestamp - now) < Math.abs(prev.timestamp - now) ? curr : prev
  , chartPoints[0]);
  const chartCurrentPrice = currentPoint ? (currency === 'CZK' ? currentPoint.priceCZK : currentPoint.priceEur) : null;
  const labelContent = 'now';

  const annotations: Record<string, any> = {
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
  };

  if (chartPoints.length > 0 && tomorrowStart > chartPoints[0].timestamp) {
    annotations.daySeparator = {
      type: 'line' as const,
      xMin: tomorrowStart,
      xMax: tomorrowStart,
      borderColor: 'rgba(0,0,0,0.35)',
      borderWidth: 1,
      borderDash: [2, 2] as [number, number],
    };

    const todayStart = new Date(chartPoints[0].timestamp).setHours(0, 0, 0, 0);
    annotations.todayBackground = {
      type: 'box' as const,
      xMin: todayStart,
      xMax: tomorrowStart,
      backgroundColor: 'rgba(255,255,255,0)',
      borderWidth: 0,
    };

    const lastTimestamp = chartPoints[chartPoints.length - 1].timestamp;
    annotations.tomorrowBackground = {
      type: 'box' as const,
      xMin: tomorrowStart,
      xMax: lastTimestamp + 15 * 60 * 1000,
      backgroundColor: 'rgba(128,128,128,0.08)',
      borderWidth: 0,
    };
  }

  const highTariffValue = parseFloat(highTariff);
  if (!Number.isNaN(highTariffValue)) {
    annotations.highTariffLine = {
      type: 'line' as const,
      yMin: highTariffValue,
      yMax: highTariffValue,
      borderColor: 'rgba(128,128,128,0.8)',
      borderWidth: 1,
      borderDash: [4, 4] as [number, number],
      label: {
        display: true,
        content: 'VT',
        position: 'end' as const,
        xAdjust: 10,
      },
    };
  }

  const lowTariffValue = parseFloat(lowTariff);
  if (!Number.isNaN(lowTariffValue)) {
    annotations.lowTariffLine = {
      type: 'line' as const,
      yMin: lowTariffValue,
      yMax: lowTariffValue,
      borderColor: 'rgba(128,128,128,0.8)',
      borderWidth: 1,
      borderDash: [4, 4] as [number, number],
      label: {
        display: true,
        content: ' NT',
        position: 'end' as const,
        xAdjust: 10,
      },
    };
  }

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 30,
      },
    },
    plugins: {
      title: {
        display: false,
      },
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
      },
      annotation: {
        annotations,
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
  }), [annotations]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Načítání dat...</div>;
  }

  const actualPrice = currentPrice ? (currency === 'CZK' ? currentPrice.priceCZK : currentPrice.priceEUR) : null;
  const actualLevel = currentPrice?.level || lastLevel;

  return (
    <div className="w-full p-4">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="text-sm text-gray-600">
          {actualPrice !== null ? (
            <>
              Aktuální cena: <strong>{actualPrice.toFixed(2)} {currency}/MWh</strong>
            </>
          ) : (
            'Načítání aktuální ceny...'
          )}
        </div>
        <div>
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
          )          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <span className="text-sm text-gray-700 mr-2">Vysoký tarif:</span>
          <input
            type="number"
            step="any"
            value={highTariff}
            onChange={(e) => setHighTariff(e.target.value)}
            placeholder="Cena vysokého tarifu"
            className="px-2 py-1 border rounded text-sm"
          />
        </div>
        <div>
          <span className="text-sm text-gray-700 mr-2">Nízký tarif:</span>
          <input
            type="number"
            step="any"
            value={lowTariff}
            onChange={(e) => setLowTariff(e.target.value)}
            placeholder="Cena nízkého tarifu"
            className="px-2 py-1 border rounded text-sm"
          />
        </div>
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
            <span><strong>low (nízká):</strong> Elektřina je v rámci dne levná. Doporučuje se zapnout náročné spotřebiče.</span>
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
