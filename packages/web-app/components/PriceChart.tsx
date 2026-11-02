'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, TimeScale, annotationPlugin);

const formatDateRange = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startStr = `${startDate.getDate()}.${startDate.getMonth() + 1}.${startDate.getFullYear()}`;
  const endStr = `${endDate.getDate()}.${endDate.getMonth() + 1}.${endDate.getFullYear()}`;
  return startStr === endStr ? startStr : `${startStr} – ${endStr}`;
};

import { fetchCurrentPrice } from '@/app/lib/api';
import { fetchTodayAndTomorrowData } from '@/app/lib/api';
import { fetchDataSourceInfo, DataSourceInfo } from '@/app/lib/api';
import { HourlyPriceEntry, HourlyPriceData } from '@/lib/hourlyTypes';
import { getCookie, setCookie } from '@/lib/cookies';
import { useAuth } from 'react-oidc-context';

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
  const auth = useAuth();
  const token = auth.user?.access_token;
  const chartRef = useRef<any>(null);
  const [plotArea, setPlotArea] = useState({ left: 0, right: 0 });
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<CurrentPrice | null>(null);
  const [dataSource, setDataSource] = useState<DataSourceInfo | null>(null);
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
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  const loadData = async () => {
    try {
      const { days, dateRange } = await fetchTodayAndTomorrowData(token);
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

      days?.forEach((dayData: any) => {
        addDay(dayData?.date || '', dayData?.data);
      });

      points.sort((a, b) => a.timestamp - b.timestamp);
      const newHash = JSON.stringify({ days, dateRange });
      if (newHash !== dataHash) {
        setDataHash(newHash);
        setChartPoints(points);
        setDateRange(dateRange);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  // useEffect(() => {
  //   fetchDataSourceInfo().then(setDataSource).catch(console.error);
  // }, []);

  useEffect(() => {
    const fetchCurrent = async () => {
      try {
        const price = await fetchCurrentPrice(token);
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

  useEffect(() => {
    const updatePlotArea = () => {
      const chart = chartRef.current;
      if (chart?.chartInstance?.chartArea) {
        setPlotArea({
          left: chart.chartInstance.chartArea.left,
          right: chart.chartInstance.chartArea.right,
        });
      } else if (chart?.chartArea) {
        setPlotArea({
          left: chart.chartArea.left,
          right: chart.chartArea.right,
        });
      } else if (chart?.current?.chartArea) {
        setPlotArea({
          left: chart.current.chartArea.left,
          right: chart.current.chartArea.right,
        });
      } else {
        // Fallback - try to get from canvas
        const canvas = chart?.canvas || document.querySelector('canvas');
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          setPlotArea({ left: 70, right: 40 });
        }
      }
    };
    updatePlotArea();
    const timeout = setTimeout(updatePlotArea, 200);
    const timeout2 = setTimeout(updatePlotArea, 500);
    window.addEventListener('resize', updatePlotArea);
    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
      window.removeEventListener('resize', updatePlotArea);
    };
  }, [chartPoints, currency]);

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

  const chartData = useMemo(() => ({
    datasets: [
      {
        label: currency,
        data: chartPoints.map((d) => ({
          x: d.timestamp,
          y: currency === 'CZK' ? d.priceCZK : d.priceEur,
        })),
        backgroundColor: chartPoints.map((d) => getLevelColor(d.level)),
        borderColor: chartPoints.map((d) => getLevelBorderColor(d.level)),
        borderWidth: 0,
        barThickness: dynamicBarThickness,
      },
    ],
  }), [currency, chartPoints, dynamicBarThickness]);

  const now = Date.now();
  // Calculate current quarter-hour (15-min interval)
  const nowDate = new Date();
  const currentQuarterHour = Math.floor(nowDate.getMinutes() / 15) * 15;
  const currentQuarterTimestamp = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
    nowDate.getHours(),
    currentQuarterHour,
    0
  ).getTime();

  // Find exact match for current quarter-hour
  const currentPoint = chartPoints.find(
    (p) => p.timestamp === currentQuarterTimestamp
  );
  const chartCurrentPrice = currentPoint ? (currency === 'CZK' ? currentPoint.priceCZK : currentPoint.priceEur) : null;
  const labelContent = chartCurrentPrice !== null ? `${chartCurrentPrice.toFixed(2)} ${currency}/MWh` : 'now';

  const annotations = useMemo<Record<string, any>>(() => {
    const ann: Record<string, any> = {
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

    if (chartPoints.length > 0) {
      const firstTimestamp = chartPoints[0].timestamp;
      const lastTimestamp = chartPoints[chartPoints.length - 1].timestamp;
      const firstDate = new Date(firstTimestamp).setHours(0, 0, 0, 0);
      const lastDate = new Date(lastTimestamp).setHours(23, 59, 59, 999);
    }

    const highTariffValue = parseFloat(highTariff);
    if (!Number.isNaN(highTariffValue)) {
      ann.highTariffLine = {
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
      ann.lowTariffLine = {
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

    return ann;
  }, [now, labelContent, chartPoints, highTariff, lowTariff]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    layout: {
      padding: {
        top: 30,
        left: 20,
        right: 20,
      },
    },
    plugins: {
      title: {
        display: !!dateRange,
        text: dateRange ? `Spotové ceny silové elektřiny: ${formatDateRange(dateRange.start, dateRange.end)}` : '',
        font: { size: 14, weight: 'bold' as const },
        color: 'rgba(0,0,0,0.7)',
        padding: { bottom: 10 },
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
        beginAtZero: true,
      },
    },
  }), [annotations, dateRange]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Načítání dat...</div>;
  }

  const actualPrice = currentPrice ? (currency === 'CZK' ? currentPrice.priceCZK : currentPrice.priceEUR) : null;
  const actualLevel = currentPrice?.level || lastLevel;

  return (
    <div className="w-full p-4">
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              {dataSource && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-800">Zdroj dat:</span>
                  <a
                    href={dataSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline font-medium"
                  >
                    {dataSource.name}
                  </a>
                </div>
              )}
              <div className="text-sm text-gray-700">
                {actualPrice !== null ? (
                  <>
                    Aktuální cena: <strong>{actualPrice.toFixed(2)} {currency}/MWh</strong>
                  </>
                ) : (
                  'Načítání aktuální ceny...'
                )}
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-2">Měna:</span>
              {(['CZK', 'EUR'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`mx-1 px-2 py-1 text-xs rounded ${
                    currency === c
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          {dataSource && <div className="text-xs text-blue-600">{dataSource.description}</div>}
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
        <>
          <div className="h-96">
            <Bar ref={chartRef} data={chartData} options={options} />
          </div>
          <div className="mt-3 pl-[85px] pr-[40px]">
            <div
              className="h-2 w-full"
              style={{
                background: `linear-gradient(to right, ${(() => {
                  const values = chartPoints.map((d) =>
                    currency === 'CZK' ? d.priceCZK : d.priceEur
                  );
                  const min = Math.min(...values);
                  const max = Math.max(...values);

                  const getInterpolatedColor = (value: number) => {
                    if (max === min) return 'rgb(234, 179, 8)';
                    const t = (value - min) / (max - min);
                    if (t <= 0) return 'rgb(34, 197, 94)';
                    if (t >= 1) return 'rgb(239, 68, 68)';
                    if (t < 0.5) {
                      const s = t / 0.5;
                      const r = Math.round(34 + (234 - 34) * s);
                      const g = Math.round(197 + (179 - 197) * s);
                      const b = Math.round(94 + (8 - 94) * s);
                      return `rgb(${r}, ${g}, ${b})`;
                    } else {
                      const s = (t - 0.5) / 0.5;
                      const r = Math.round(234 + (239 - 234) * s);
                      const g = Math.round(179 + (68 - 179) * s);
                      const b = Math.round(8 + (68 - 8) * s);
                      return `rgb(${r}, ${g}, ${b})`;
                    }
                  };

                  return chartPoints
                    .map((d, i) => {
                      const value = currency === 'CZK' ? d.priceCZK : d.priceEur;
                      const pct = (i / Math.max(1, chartPoints.length - 1)) * 100;
                      return `${getInterpolatedColor(value)} ${pct}%`;
                    })
                    .join(', ');
                })()})`,
              }}
            />
          </div>
        </>
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
