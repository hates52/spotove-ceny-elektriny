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
import { Bar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { fetchAvailableDates, fetchHistoricalData, DataSourceInfo } from '@/app/lib/api';
import { HourlyPriceEntry } from '@/lib/hourlyTypes';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, TimeScale);

interface ChartPoint {
  timestamp: number;
  priceCZK: number;
  priceEur: number;
  level: string;
}

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

export default function DailyCalendarAndChart() {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [currency, setCurrency] = useState<'CZK' | 'EUR'>('CZK');
  const [dataSource, setDataSource] = useState<DataSourceInfo | null>(null);

  useEffect(() => {
    const loadDates = async () => {
      try {
        const dates = await fetchAvailableDates();
        setAvailableDates(dates || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load available dates');
      } finally {
        setLoadingDates(false);
      }
    };
    loadDates();
  }, []);

  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);

const loadDayData = async (dateStr: string) => {
    setLoadingDay(true);
    try {
      const response = await fetchHistoricalData(dateStr, dateStr);
      const data = response.data;
      if (response.dataSource) {
        setDataSource(response.dataSource);
      }
      const points: ChartPoint[] = [];
      if (data && data.length > 0) {
        const dayData = data[0];
        const [year, month, day] = dayData.date.split('-').map(Number);
        (dayData.data as HourlyPriceEntry[]).forEach((entry) => {
          const timestamp = new Date(year, month - 1, day, entry.hour, entry.minute, 0).getTime();
          points.push({
            timestamp,
            priceCZK: entry.priceCZK,
            priceEur: entry.priceEur,
            level: entry.level,
          });
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
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday in JS, but we want Monday? locale cs uses Monday; but easier to just render
    const days: Array<{ date: Date; dateStr: string; available: boolean }> = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      days.push({
        date: d,
        dateStr,
        available: availableSet.has(dateStr),
      });
    }

    // Pad start for Monday-first view (approximate)
    const startOffset = (startDayOfWeek + 6) % 7; // convert Sunday=0 to Monday=0

    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

    return (
      <div className="bg-white rounded shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">←</button>
          <div className="font-semibold">{format(currentMonth, 'MMMM yyyy', { locale: cs })}</div>
          <button onClick={nextMonth} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">→</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((d) => (
            <div key={d} className="text-center text-gray-600 py-1">{d}</div>
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
                      ? 'bg-blue-600 text-white'
                      : 'bg-green-100 hover:bg-green-200 text-gray-800 cursor-pointer'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                title={day.available ? 'Klikněte pro zobrazení grafu dne' : 'Nejsou dostupná data'}
              >
                {day.date.getDate()}
              </button>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-gray-600">
          <span className="inline-block w-3 h-3 bg-green-100 mr-1"></span> Dostupné
          <span className="inline-block w-3 h-3 bg-gray-100 ml-3 mr-1"></span> Nedostupné
        </div>
      </div>
    );
  };

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
        barThickness: Math.max(2, Math.floor(600 / Math.max(1, chartPoints.length) - 0.5)),
      },
    ],
  }), [currency, chartPoints]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      title: {
        display: !!selectedDate,
        text: selectedDate ? `Denní graf: ${format(new Date(selectedDate), 'dd.MM.yyyy', { locale: cs })}` : '',
        font: { size: 14, weight: 'bold' as const },
        color: 'rgba(0,0,0,0.7)',
        padding: { bottom: 10 },
      },
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'hour' as const,
          displayFormats: { hour: 'HH:mm' },
          tooltipFormat: 'HH:mm',
        },
        grid: { display: false },
        ticks: { display: true, maxRotation: 0, autoSkip: true },
      },
      y: {
        grid: { display: false },
        beginAtZero: false,
      },
    },
  }), [selectedDate]);

  return (
    <div className="w-full mt-8 p-4 bg-white rounded shadow">
      <h2 className="text-lg font-semibold mb-4">Detailní pohled na den</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">{error}</div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>{loadingDates ? <div className="text-gray-500">Načítání kalendáře...</div> : renderCalendar()}</div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedDate ? `Vybraný den: ${format(new Date(selectedDate), 'dd.MM.yyyy', { locale: cs })}` : 'Vyberte den v kalendáři'}
            </div>
            {selectedDate && (
              <div>
                <span className="text-sm text-gray-700 mr-2">Měna:</span>
                {(['CZK', 'EUR'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`mx-1 px-2 py-1 text-xs rounded ${
                      currency === c ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="h-80 bg-gray-50 rounded p-2">
            {!selectedDate && <div className="flex items-center justify-center h-full text-gray-500">Klikněte na dostupný den v kalendáři.</div>}
            {selectedDate && loadingDay && <div className="flex items-center justify-center h-full text-gray-500">Načítání dat...</div>}
            {selectedDate && !loadingDay && dataSource && (
              <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                <span className="font-medium text-blue-800">Zdroj dat: </span>
                <a href={dataSource.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {dataSource.name}
                </a>
              </div>
            )}
            {selectedDate && !loadingDay && chartPoints.length > 0 && <Bar data={chartData} options={chartOptions} />}
            {selectedDate && !loadingDay && chartPoints.length === 0 && <div className="flex items-center justify-center h-full text-gray-500">Pro tento den nejsou k dispozici žádná data.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
