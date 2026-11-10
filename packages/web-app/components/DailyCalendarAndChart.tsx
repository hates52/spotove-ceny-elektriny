'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, TimeScale, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { fetchAvailableDates, fetchHistoricalData, DataSourceInfo } from '@/app/lib/api';
import { useAuth } from 'react-oidc-context';
import { HourlyPriceEntry } from '@/lib/hourlyTypes';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, TimeScale, Filler);

interface ChartPoint {
  timestamp: number;
  priceCZK: number;
  priceEur: number;
  level: string;
}

// Create gradient for area fill based on price values
const createAreaGradient = (chart: any, points: ChartPoint[], currency: 'CZK' | 'EUR') => {
  if (!chart?.ctx || !chart.chartArea) return 'rgba(59, 130, 246, 0.3)';

  const ctx = chart.ctx;
  const chartArea = chart.chartArea;
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

export default function DailyCalendarAndChart() {
  const auth = useAuth();
  const token = auth.user?.access_token;
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [currency, setCurrency] = useState<'CZK' | 'EUR'>('CZK');
  const [dataSource, setDataSource] = useState<DataSourceInfo | null>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    const loadDates = async () => {
      try {
        const dates = await fetchAvailableDates(token);
        setAvailableDates(dates || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load available dates');
      } finally {
        setLoadingDates(false);
      }
    };
    if (!token) return;
    loadDates();
  }, [token]);

  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);

  const loadDayData = async (dateStr: string) => {
    setLoadingDay(true);
    try {
      const response = await fetchHistoricalData(dateStr, dateStr, token);
      const data = response.data;
      const points: ChartPoint[] = [];
      if (data && data.length > 0) {
        const dayData = data[0];
        const dsId = (dayData as any).data_source;
        if (dsId) {
          const map: any = {
            spotovaelektrina: { id: 'spotovaelektrina', name: 'Spotová elektřina', url: 'https://spotovaelektrina.cz', description: 'Aggregátor spotových cen elektřiny z OTE' },
            ote: { id: 'ote', name: 'OTE - Operátor trhu s elektřinou', url: 'https://www.ote-cr.cz', description: 'Oficiální data z veřejného rozhraní OTE (SOAP API)' },
          };
          setDataSource(map[dsId] || null);
        } else if (response.dataSource) {
          setDataSource(response.dataSource);
        } else {
          setDataSource(null);
        }
        const [year, month, day] = dayData.date.split('-').map(Number);
        (dayData.data as HourlyPriceEntry[]).forEach((entry) => {
          const timestamp = new Date(year, month - 1, day, entry.hour, entry.minute, 0).getTime();
          points.push({ timestamp, priceCZK: entry.priceCZK, priceEur: entry.priceEur, level: entry.level });
        });
        points.sort((a, b) => a.timestamp - b.timestamp);
      }
      setChartPoints(points);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load day data');
      setDataSource(null);
    } finally {
      setLoadingDay(false);
    }
  };

  const handleDayClick = (dateStr: string) => {
    if (availableSet.has(dateStr)) {
      setSelectedDate(dateStr);
      loadDayData(dateStr);
    }
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    const days: Array<{ date: Date; dateStr: string; available: boolean }> = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      days.push({ date: d, dateStr, available: availableSet.has(dateStr) });
    }

    const startOffset = (startDayOfWeek + 6) % 7;
    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

    return (
      <div className="bg-card rounded shadow border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="px-2 py-1 bg-secondary rounded hover:bg-secondary/80 text-secondary-foreground">←</button>
          <div className="font-semibold text-card-foreground">{format(currentMonth, 'MMMM yyyy', { locale: cs })}</div>
          <button onClick={nextMonth} className="px-2 py-1 bg-secondary rounded hover:bg-secondary/80 text-secondary-foreground">→</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((d) => (
            <div key={d} className="text-center text-muted-foreground py-1">{d}</div>
          ))}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const isSelected = selectedDate === day.dateStr;
            return (
              <button
                key={day.dateStr}
                onClick={() => handleDayClick(day.dateStr)}
                disabled={!day.available}
                className={`p-2 rounded text-center text-sm ${
                  day.available
                    ? isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-green-500/20 hover:bg-green-500/30 text-green-700 dark:text-green-400 cursor-pointer'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {day.date.getDate()}
              </button>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          <span className="inline-block w-3 h-3 bg-green-500/30 mr-1 rounded"></span> Dostupné
          <span className="inline-block w-3 h-3 bg-muted ml-3 mr-1 rounded border border-border"></span> Nedostupné
        </div>
      </div>
    );
  };

  const chartData = useMemo(() => ({
    datasets: [{
      label: currency,
      data: chartPoints.map((d) => ({ x: d.timestamp, y: currency === 'CZK' ? d.priceCZK : d.priceEur })),
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 2,
      fill: true,
      backgroundColor: 'rgba(59, 130, 246, 0.3)',
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.1,
    }],
  }), [currency, chartPoints]);

  // Update gradient fill after chart renders
  useEffect(() => {
    const updateGradient = () => {
      const chart = chartRef.current?.chartInstance || chartRef.current;
      if (chart?.ctx && chart.chartArea && chart.data.datasets[0]) {
        const gradient = createAreaGradient(chart, chartPoints, currency);
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

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      title: {
        display: !!selectedDate,
        text: selectedDate ? `Denní graf: ${format(new Date(selectedDate), 'dd.MM.yyyy', { locale: cs })}` : '',
        font: { size: 14, weight: 'bold' as const },
        color: titleColor,
        padding: { bottom: 10 },
      },
      legend: { display: false },
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
              return `${hour}:${minute}–${endHour}:${endMinute}`;
            }
            return '';
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: { unit: 'hour' as const, displayFormats: { hour: 'HH:mm' }, tooltipFormat: 'HH:mm' },
        grid: { display: false },
        ticks: { display: true, maxRotation: 0, autoSkip: true },
      },
      y: { grid: { display: false }, beginAtZero: true },
    },
  }), [selectedDate]);

  return (
    <div className="w-full mt-8 p-4 bg-card rounded shadow border border-border">
      <h2 className="text-lg font-semibold mb-4 text-card-foreground">Detailní pohled na den</h2>
      {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded text-sm">{error}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col">
          {loadingDates ? <div className="text-muted-foreground">Načítání kalendáře...</div> : <div className="min-h-[448px]">{renderCalendar()}</div>}
        </div>
        <div className="flex flex-col">
          <div className="h-[400px] bg-muted/50 rounded p-2">
            {!selectedDate && <div className="flex items-center justify-center h-full text-muted-foreground">Klikněte na dostupný den v kalendáři.</div>}
            {selectedDate && loadingDay && <div className="flex items-center justify-center h-full text-muted-foreground">Načítání dat...</div>}
            {selectedDate && !loadingDay && chartPoints.length > 0 && (
              <>
                <div className="mb-2 p-2 bg-primary/10 border border-primary/20 rounded text-sm flex items-center justify-between">
                  <span>
                    <span className="font-medium text-primary">Zdroj dat: </span>
                    {dataSource ? (
                      <a href={dataSource.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{dataSource.name}</a>
                    ) : '-'}
                  </span>
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    {(['CZK', 'EUR'] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => setCurrency(c)}
                        className={`flex items-center px-3 py-1.5 text-sm rounded-md transition-colors ${
                          currency === c
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        title={c === 'CZK' ? 'České koruny' : 'Eura'}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-[calc(100%-48px)]">
                  <Line ref={chartRef} data={chartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
                </div>
              </>
            )}
            {selectedDate && !loadingDay && chartPoints.length === 0 && <div className="flex items-center justify-center h-full text-muted-foreground">Pro tento den nejsou k dispozici žádná data.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}