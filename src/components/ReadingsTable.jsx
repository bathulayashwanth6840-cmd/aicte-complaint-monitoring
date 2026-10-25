import React, { useState } from 'react'
import { Table, Search, ChevronLeft, ChevronRight, Hash, Clock, CheckCircle2, XCircle } from 'lucide-react'

export function ReadingsTable({ readings, isDemoMode }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Filter based on search term
  const filteredReadings = (readings || []).filter((item) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      item.device_id?.toLowerCase().includes(term) ||
      String(item.id).toLowerCase().includes(term)
    )
  })

  // Pagination calculation
  const totalPages = Math.ceil(filteredReadings.length / itemsPerPage) || 1
  const displayedReadings = filteredReadings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const formatTimestamp = (isoStr) => {
    if (!isoStr) return '—'
    try {
      const d = new Date(isoStr)
      return {
        date: d.toLocaleDateString(),
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }
    } catch {
      return { date: '—', time: isoStr }
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Table className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Recent Readings Log</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit log of telemetry payloads stored in the database
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by Device ID or Record #..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">Record ID</th>
              <th className="py-3 px-4">Timestamp (UTC / Local)</th>
              <th className="py-3 px-4">Device ID</th>
              <th className="py-3 px-4 text-center">Red LED</th>
              <th className="py-3 px-4 text-center">Green LED</th>
              <th className="py-3 px-4 text-right">Data Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {displayedReadings.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-400 font-sans">
                  No telemetry records match your current filter.
                </td>
              </tr>
            ) : (
              displayedReadings.map((item) => {
                const ts = formatTimestamp(item.created_at)
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-700 font-semibold">
                      #{item.id}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5 font-sans">
                        <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">{ts.time}</span>
                        <span className="text-slate-400 text-[11px]">({ts.date})</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60">
                        {item.device_id}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        item.red_led
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.red_led ? 'bg-red-500' : 'bg-slate-400'}`}></span>
                        {item.red_led ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        item.green_led
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.green_led ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {item.green_led ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      {item._isMock || isDemoMode ? (
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Demo Mock
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Supabase Live
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing {displayedReadings.length} of {filteredReadings.length} records
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
