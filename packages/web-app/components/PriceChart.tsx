'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  TimeScale,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import 'chartjs-adapter-date-fns';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, TimeScale, Filler, annotationPlugin);

const formatDateRange = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startStr = `${startDate.getDate()}.${startDate.getMonth() + 1}.${startDate.getFullYear()}`;
  const endStr = `${endDate.getDate()}.${endDate.getMonth() + 1}.${endDate.getFullYear()}`;
  return `${startStr} – ${endStr}`;
};

import { fetchCurrentPrice } from '@/app/lib/api';
import { fetchTodayAndTomorrowData } from '@/app/lib/api';
import { fetchDataSourceInfo, DataSourceInfo } from '@/app/lib/api';
import { HourlyPriceEntry, HourlyPriceData } from '@/lib/hourlyTypes';
import { getCookie, setCookie } from '@/lib/cookies';
import { useAuth } from 'react-oidc-context';
import { useCurrency } from './CurrencyContext';

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
  const token = auth?.user?.access_token;
  const chartRef = useRef<any>(null);
  const [plotArea, setPlotArea] = useState({ left: 0, right: 0 });
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<CurrentPrice | null>(null);
  const [dataSource, setDataSource] = useState<DataSourceInfo | null>(null);
  const [highTariff, setHighTariff] = useState<string>(() => {
    return getCookie('spot_high_tariff') || '';
  });
  const [lowTariff, setLowTariff] = useState<string>(() => {
    return getCookie('spot_low_tariff') || '';
  });
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  const { currency } = useCurrency();

  const dataHashRef = useRef<string>('');
  const [now, setNow] = useState(0);

  useEffect(() => {
    setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token) return;

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
        if (newHash !== dataHashRef.current) {
          dataHashRef.current = newHash;
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

    loadData();
  }, [token]);

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
  }, [token, onLevelChange]);

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

  // Create gradient for area fill based on price values
  const createAreaGradient = (chartRef: any, points: ChartPoint[], currency: 'CZK' | 'EUR') => {
    const chart = chartRef?.current?.chartInstance || chartRef?.current || chartRef?.chartInstance;
    if (!chart?.ctx) return 'rgba(59, 130, 246, 0.3)';

    const ctx = chart.ctx;
    const chartArea = chart.chartArea;
    if (!chartArea) return 'rgba(59, 130, 246, 0.3)';

    const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);

    const values = points.map((d) => currency === 'CZK' ? d.priceCZK : d.priceEur);
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

    points.forEach((d, i) => {
      const value = currency === 'CZK' ? d.priceCZK : d.priceEur;
      const pct = i / Math.max(1, points.length - 1);
      gradient.addColorStop(pct, getInterpolatedColor(value).replace('rgb', 'rgba').replace(')', ', 0.3)'));
    });

    return gradient;
  };

  const chartData = useMemo(() => {
    const dataset: any = {
      label: currency,
      data: chartPoints.map((d) => ({
        x: d.timestamp,
        y: currency === 'CZK' ? d.priceCZK : d.priceEur,
      })),
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 2,
      fill: true,
      backgroundColor: 'rgba(59, 130, 246, 0.3)',
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.1,
    };

    return { datasets: [dataset] };
  }, [currency, chartPoints]);

  // Update gradient fill after chart renders
  useEffect(() => {
    const updateGradient = () => {
      const chart = chartRef.current?.chartInstance || chartRef.current;
      if (chart?.ctx && chart.chartArea && chart.data.datasets[0]) {
        const gradient = createAreaGradient(chartRef, chartPoints, currency);
        chart.data.datasets[0].backgroundColor = gradient;
        chart.update('none');
      }
    };
    const timeout = setTimeout(updateGradient, 100);
    const timeout2 = setTimeout(updateGradient, 300);
    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
    };
  }, [chartPoints, currency, chartRef]);

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

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const titleColor = isDark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.7)';

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
        color: titleColor,
        padding: { bottom: 10 },
      },
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            const price = value.toFixed(2);
            return `${price} ${currency}/MWh`;
          },
          title: (items: any[]) => {
            const item = items[0];
            const dataIndex = item.dataIndex;
            if (dataIndex !== undefined && chartPoints[dataIndex]) {
              const timestamp = chartPoints[dataIndex].timestamp;
              const date = new Date(timestamp);
              const hour = date.getHours().toString().padStart(2, '0');
              const minute = date.getMinutes().toString().padStart(2, '0');
              const endDate = new Date(timestamp + 15 * 60 * 1000);
              const endHour = endDate.getHours().toString().padStart(2, '0');
              const endMinute = endDate.getMinutes().toString().padStart(2, '0');
              const day = date.getDate().toString().padStart(2, '0');
              const month = (date.getMonth() + 1).toString().padStart(2, '0');
              return `${day}.${month}. ${hour}:${minute}–${endHour}:${endMinute}`;
            }
            return '';
          },
        },
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
  }), [annotations, dateRange, titleColor, currency, chartPoints]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Načítání dat...</div>;
  }

  const actualPrice = currentPrice ? (currency === 'CZK' ? currentPrice.priceCZK : currentPrice.priceEUR) : null;
  const actualLevel = currentPrice?.level || lastLevel;

  return (
    <div className="w-full p-4">
      <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              {dataSource && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-primary">Zdroj dat:</span>
                  <a
                    href={dataSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {dataSource.name}
                  </a>
                </div>
              )}
              <div className="text-sm text-foreground">
                {actualPrice !== null ? (
                  <>
                    Aktuální cena: <strong>{actualPrice.toFixed(2)} {currency}/MWh</strong>
                  </>
                ) : (
                  'Načítání aktuální ceny...'
                )}
              </div>
            </div>
          </div>
          {dataSource && <div className="text-xs text-primary/80">{dataSource.description}</div>}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <span className="text-sm text-muted-foreground mr-2">Vysoký tarif:</span>
          <input
            type="number"
            step="any"
            value={highTariff}
            onChange={(e) => setHighTariff(e.target.value)}
            placeholder="Cena vysokého tarifu"
            className="px-2 py-1 border border-input bg-background rounded text-sm text-foreground"
          />
        </div>
        <div>
          <span className="text-sm text-muted-foreground mr-2">Nízký tarif:</span>
          <input
            type="number"
            step="any"
            value={lowTariff}
            onChange={(e) => setLowTariff(e.target.value)}
            placeholder="Cena nízkého tarifu"
            className="px-2 py-1 border border-input bg-background rounded text-sm text-foreground"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded">
          {error}
        </div>
      )}

      {chartPoints.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Zatím nejsou k dispozici žádná data.
        </div>
      ) : (
        <>
          <div className="h-96">
            <Line ref={chartRef} data={chartData} options={options} />
          </div>
          <div className="mt-3" style={{ paddingLeft: plotArea.left + 10, paddingRight: plotArea.right + 10 }}>
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

      <div className="mt-4 p-3 bg-muted/50 rounded border border-border text-sm">
        <div className="font-semibold mb-2 text-card-foreground">Legenda cenových úrovní:</div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 bg-green-500 rounded"></span>
            <span className="text-card-foreground"><strong>low (nízká):</strong> Elektřina je v rámci dne levná. Doporučuje se zapnout náročné spotřebiče.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 bg-yellow-500 rounded"></span>
            <span className="text-card-foreground"><strong>medium (střední):</strong> Průměrná, běžná cena v rámci dne.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 bg-red-500 rounded"></span>
            <span className="text-card-foreground"><strong>high (vysoká):</strong> Elektřina je drahá. Je vhodné odložit spotřebu a vypnout volitelné zátěže.</span>
          </div>
        </div>
      </div>
    </div>
  );
}