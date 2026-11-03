'use client';

import { useEffect, useState } from 'react';

type FlowDirection = 'charging' | 'discharging' | 'idle';

interface CurrentPrice {
  priceCZK: number;
  priceEUR: number;
  level: string;
}

export default function EnergyFlow() {
  const [flow1, setFlow1] = useState<FlowDirection>('idle');
  const [flow2, setFlow2] = useState<FlowDirection>('idle');
  const [flow3, setFlow3] = useState<FlowDirection>('idle');

  useEffect(() => {
    const fetchCurrent = async () => {
      try {
        const res = await fetch('/api/backend/current-price', { cache: 'no-store' });
        if (!res.ok) return;
        const price: CurrentPrice = await res.json();

        switch (price.level) {
          case 'low':
            setFlow1('charging');
            setFlow2('idle');
            setFlow3('charging');
            break;
          case 'medium':
            setFlow1('idle');
            setFlow2('idle');
            setFlow3('charging');
            break;
          case 'high':
            setFlow1('idle');
            setFlow2('charging');
            setFlow3('idle');
            break;
          default:
            setFlow1('idle');
            setFlow2('idle');
            setFlow3('idle');
        }
      } catch {
        // ignore
      }
    };

    fetchCurrent();
    const intervalId = setInterval(fetchCurrent, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const getFlowColor = (direction: FlowDirection) => {
    if (direction === 'charging') return '#22c55e';
    if (direction === 'discharging') return '#ef4444';
    return '#9ca3af';
  };

  const flowAnimation = (direction: FlowDirection) => {
    const color = getFlowColor(direction);
    const isIdle = direction === 'idle';

    return {
      stroke: color,
      strokeWidth: isIdle ? 2 : 3,
      strokeDasharray: isIdle ? 'none' : '8 4',
      opacity: isIdle ? 0.4 : 1,
    };
  };

  const arrowMarker = (color: string) => (
    <marker
      id={`arrow-${color.replace('#', '')}`}
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="6"
      markerHeight="6"
      orient="auto"
    >
      <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
    </marker>
  );

  const Arrow = ({ direction }: { direction: FlowDirection }) => {
    const color = getFlowColor(direction);
    const isIdle = direction === 'idle';

    return (
      <div className="flex items-center justify-center w-24" style={{ marginTop: '5px' }}>
        <svg width="80" height="24" viewBox="0 0 80 24">
          <defs>
            <marker id={`arrow-${color.replace('#', '')}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
            </marker>
          </defs>
          <line
            x1="0"
            y1="12"
            x2="77"
            y2="12"
            stroke={color}
            strokeWidth={isIdle ? 2 : 3}
            strokeDasharray={isIdle ? 'none' : '8 4'}
            opacity={isIdle ? 0.4 : 1}
            markerEnd={`url(#arrow-${color.replace('#', '')})`}
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="w-full p-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-center">Schéma propojení energie</h2>

        <div className="relative flex items-center justify-center h-80">
          {}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 900 320"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {arrowMarker('#22c55e')}
              {arrowMarker('#ef4444')}
              {arrowMarker('#9ca3af')}
            </defs>

            {}
            <path
              d="M 240 220 L 240 320 L 655 320 L 655 220"
              fill="none"
              style={flowAnimation(flow3)}
              markerEnd={`url(#arrow-${getFlowColor(flow3).replace('#', '')})`}
            />
          </svg>

          {}
          <div className="flex items-center justify-center gap-0 relative z-10">
            {}
            <div className="flex flex-col items-center">
              <div className="bg-blue-100 rounded-full p-4 shadow-lg border-2 border-blue-400">
                <svg className="w-12 h-12 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
            </div>

            {}
            <Arrow direction={flow1} />

            {}
            <div className="flex flex-col items-center">
              <div className="bg-green-100 rounded-full p-4 shadow-lg border-2 border-green-500">
                <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z" />
                </svg>
              </div>
            </div>

            {}
            <Arrow direction={flow2} />

            {}
            <div className="flex flex-col items-center">
              <div className="bg-purple-100 rounded-full p-4 shadow-lg border-2 border-purple-400">
                <svg className="w-12 h-12 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm0 2.84L18 12v7h-2v-6H8v6H6v-7l6-6.16z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-1 bg-green-500 rounded"></span>
            <span>Aktivní přenos energie</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-1 bg-gray-400 rounded"></span>
            <span>Neaktivní</span>
          </div>
        </div>
      </div>
    </div>
  );
}
