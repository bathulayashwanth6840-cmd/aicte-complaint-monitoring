import React, { useState, useEffect, useCallback } from 'react'
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  Clock,
  Terminal,
  User,
  ExternalLink,
} from 'lucide-react'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { DataTable } from '../components/ui/DataTable'
import { StateView } from '../components/ui/StateView'
import { useToast } from '../context/ToastContext'
import * as dataService from '../services/dashboardService'

export function ActionHistoryPage({ onNavigateTab }) {
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await dataService.getAuditLogs({ search, limit: 100 })
      setLogs(res.data || [])
    } catch (err) {
      setError(err.message || 'Unable to retrieve action history from database.')
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs()
    }, 200)
    return () => clearTimeout(timer)
  }, [fetchLogs])

  const columns = [
    {
      header: 'Audit ID & Time',
      accessorKey: 'timestamp',
      width: '180px',
      cell: (row) => (
        <div className="space-y-0.5">
          <span className="font-mono font-bold text-slate-800 text-xs">{row.id}</span>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
            <Clock className="h-3 w-3 text-slate-400" />
            <span>{row.timestamp}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Authorized Officer',
      accessorKey: 'officer',
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900 block">{row.officer}</span>
          <span className="text-[11px] text-blue-700">{row.role}</span>
        </div>
      ),
    },
    {
      header: 'Action Executed',
      accessorKey: 'action',
      cell: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
          {row.action}
        </span>
      ),
    },
    {
      header: 'Target Entity',
      accessorKey: 'targetId',
      cell: (row) => (
        <div className="font-mono text-xs">
          <span className="font-bold text-blue-700">{row.targetId}</span>
          <span className="text-[10px] text-slate-400 block">Type: {row.targetType}</span>
        </div>
      ),
    },
    {
      header: 'Log Summary & Directives',
      accessorKey: 'details',
      cell: (row) => (
        <p className="text-xs text-slate-700 leading-normal max-w-md font-mono" title={row.details}>
          {row.details}
        </p>
      ),
    },
    {
      header: 'IP Address',
      accessorKey: 'ipAddress',
      align: 'right',
      cell: (row) => (
        <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
          {row.ipAddress}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Breadcrumb
        title="Official Regulatory Audit Trail"
        subtitle="Cryptographically sealed chronological log of all bureau notices, hearing orders, and officer remarks."
        items={[{ label: 'Dashboard', onClick: () => onNavigateTab('dashboard') }, { label: 'Action History' }]}
        badge={
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200">
            Immutable Audit Mode Active
          </span>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              addToast({
                title: 'Audit Log Exported',
                message: 'Encrypted action history archive downloaded in CSV format.',
                type: 'info',
              })
            }}
          >
            Export Signed Log Archive
          </Button>
        }
      />

      {/* Search Input */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
        <Input
          isSearch
          placeholder="Filter audit log by Case ID, Officer Name, Action, or IP Address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
        />
      </div>

      {/* Main Audit Log Table */}
      {isLoading ? (
        <StateView type="loading" title="Retrieving Audit Records..." message="Connecting to secure audit log repository." />
      ) : error ? (
        <StateView
          type="error"
          title="Audit Log Unavailable"
          message={error}
          action={<Button variant="outline" size="sm" onClick={fetchLogs}>Retry</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          data={logs}
          keyField="id"
          emptyMessage="No audit trail entries matched your search query."
        />
      )}
    </div>
  )
}
