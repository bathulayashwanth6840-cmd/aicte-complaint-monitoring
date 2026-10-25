import React, { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts'
import { TrendingUp, Layers } from 'lucide-react'

// Custom tooltip for digital signals
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload
    return (
      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs">
        <div className="font-mono text-slate-400 mb-1 border-b border-slate-800 pb-1">
          {dataPoint.fullTime}
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-red-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Red LED:
            </span>
            <span className="font-mono font-bold">
              {dataPoint.red_led ? 'ON (1)' : 'OFF (0)'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Green LED:
            </span>
            <span className="font-mono font-bold">
              {dataPoint.green_led ? 'ON (1)' : 'OFF (0)'}
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export function TelemetryChart({ readings }) {
  const [pointLimit, setPointLimit] = useState(20)

  // Format data for chart display
  // Readings are typically newest first, so we reverse for chronological left-to-right plotting
  const chartData = (readings || [])
    .slice(0, pointLimit)
    .reverse()
    .map((item) => {
      const d = new Date(item.created_at)
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      return {
        ...item,
        timeLabel: timeStr,
        fullTime: d.toLocaleDateString() + ' ' + timeStr,
        redVal: item.red_led ? 1 : 0,
        greenVal: item.green_led ? 1 : 0
      }
    })

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Historical Telemetry Timeline</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time digital logic transitions over timestamped intervals
          </p>
        </div>

        {/* View Limit Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-slate-400 font-medium">Window:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {[10, 20, 50].map((limit) => (
              <button
                key={limit}
                onClick={() => setPointLimit(limit)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  pointLimit === limit
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {limit} pts
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="mt-4 h-64 sm:h-72 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
            <Layers className="h-8 w-8 mb-2 stroke-1 text-slate-300" />
            <span>Waiting for telemetry points to plot waveform...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="timeLabel"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                domain={[-0.15, 1.15]}
                ticks={[0, 1]}
                tickFormatter={(v) => (v === 1 ? 'HIGH' : 'LOW')}
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                formatter={(value) => (
                  <span className="text-slate-600 font-medium">{value}</span>
                )}
              />
              <Line
                type="stepAfter"
                dataKey="redVal"
                name="Red LED"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#ef4444', strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="stepAfter"
                dataKey="greenVal"
                name="Green LED"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#10b981', strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
