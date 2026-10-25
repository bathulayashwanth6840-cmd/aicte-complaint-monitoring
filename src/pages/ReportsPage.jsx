import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  FileCheck,
  CheckCircle2,
  TrendingUp,
  Clock,
  Layers,
  AlertTriangle,
  RefreshCw,
  Search,
  Building2,
  ShieldCheck,
  PieChart as PieIcon,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ChartContainer } from '../components/ui/ChartContainer'
import { Select } from '../components/ui/Select'
import { StateView } from '../components/ui/StateView'
import { useToast } from '../context/ToastContext'
import * as dataService from '../services/dashboardService'
import { api } from '../services/apiClient'

const CATEGORY_COLORS = ['#2563eb', '#7c3aed', '#ea580c', '#e11d48', '#059669', '#0891b2', '#4f46e5', '#ca8a04']
const AGEING_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444']

export function ReportsPage({ onNavigateTab }) {
  const { addToast } = useToast()

  // Filter States
  const [bureauFilter, setBureauFilter] = useState('ALL')
  const [regionFilter, setRegionFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [overlapStatusFilter, setOverlapStatusFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [institutionSearch, setInstitutionSearch] = useState('')

  // Active Report View Tab
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'bureaus', 'regions', 'institutions', 'ageing', 'overlaps', 'trends'

  const [isExporting, setIsExporting] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const activeFilters = useMemo(() => {
    const params = {}
    if (bureauFilter !== 'ALL') params.bureau = bureauFilter
    if (regionFilter !== 'ALL') params.region = regionFilter
    if (statusFilter !== 'ALL') params.status = statusFilter
    if (categoryFilter !== 'ALL') params.category = categoryFilter
    if (overlapStatusFilter !== 'ALL') params.overlap_status = overlapStatusFilter
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    if (institutionSearch.trim()) params.institution_name = institutionSearch.trim()
    return params
  }, [bureauFilter, regionFilter, statusFilter, categoryFilter, overlapStatusFilter, dateFrom, dateTo, institutionSearch])

  const loadReports = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await dataService.getReportsSummary(activeFilters)
      setReportData(res)
    } catch (err) {
      setError(err.message || 'Unable to load compliance report data.')
    } finally {
      setIsLoading(false)
    }
  }, [activeFilters])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const handleResetFilters = () => {
    setBureauFilter('ALL')
    setRegionFilter('ALL')
    setStatusFilter('ALL')
    setCategoryFilter('ALL')
    setOverlapStatusFilter('ALL')
    setDateFrom('')
    setDateTo('')
    setInstitutionSearch('')
  }

  const handleExportCsv = () => {
    setIsExporting(true)
    try {
      // Pass the exact same filters to CSV export endpoint
      const exportUrl = api.getExportCsvUrl({
        ...activeFilters,
        role: 'Bureau Officer',
      })
      window.open(exportUrl, '_blank')
      addToast({
        title: 'Export Generated',
        message: 'Streaming validated, formula-sanitized RFC 4180 CSV export with exact active filters.',
        type: 'success',
      })
    } catch (err) {
      addToast({
        title: 'Export Failed',
        message: err.message || 'Could not stream report export.',
        type: 'error',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const summary = reportData?.summary || {
    total_records: 0,
    active_cases: 0,
    resolved_cases: 0,
    overdue_cases: 0,
    transferred_cases: 0,
    resolution_rate: 0,
    avg_days_to_disposal: 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Breadcrumb
        title="National Reports & Regulatory Compliance Analytics"
        subtitle="Bureau distributions, region workloads, institution histories, case ageing analysis, disposal metrics, and overlap audits."
        items={[{ label: 'Dashboard', onClick: () => onNavigateTab('dashboard') }, { label: 'Reports & Analytics' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={loadReports}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={FileSpreadsheet}
              onClick={handleExportCsv}
              isLoading={isExporting}
            >
              Export Filtered CSV
            </Button>
          </div>
        }
      />

      {/* Comprehensive Filter Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Filter className="h-3.5 w-3.5 text-blue-700" />
            <span>Multi-Facet Regulatory Filters</span>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-blue-700 hover:text-blue-900 font-medium"
          >
            Reset All Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Bureau */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Bureau / Cell</label>
            <Select
              value={bureauFilter}
              onChange={(e) => setBureauFilter(e.target.value)}
              className="text-xs py-1.5"
            >
              <option value="ALL">All Bureaus & Cells</option>
              <option value="PGRC">PGRC (Public Grievance Cell)</option>
              <option value="RB">RB (Regulation Bureau)</option>
              <option value="Approval Bureau">Approval Bureau</option>
              <option value="Anti-Ragging Cell">Anti-Ragging Cell</option>
            </Select>
          </div>

          {/* Region */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">AICTE Region</label>
            <Select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="text-xs py-1.5"
            >
              <option value="ALL">All Regions</option>
              <option value="Northern">Northern</option>
              <option value="North-West">North-West</option>
              <option value="Western">Western</option>
              <option value="South-West">South-West</option>
              <option value="Southern">Southern</option>
              <option value="South-Central">South-Central</option>
              <option value="Central">Central</option>
              <option value="Eastern">Eastern</option>
            </Select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Case Status</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-1.5"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Under Process">Under Process / Active</option>
              <option value="In Investigation">In Investigation</option>
              <option value="Hearing Scheduled">Hearing Scheduled</option>
              <option value="Action Initiated">Action Initiated</option>
              <option value="Resolved">Resolved</option>
              <option value="Disposed">Disposed</option>
              <option value="Transferred">Transferred</option>
            </Select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Grievance Category</label>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-1.5"
            >
              <option value="ALL">All Categories</option>
              <option value="Fee & Financial Anomalies">Fee & Financial Anomalies</option>
              <option value="Faculty & Staff Grievance">Faculty & Staff Grievance</option>
              <option value="Admission Irregularities">Admission Irregularities</option>
              <option value="Ragging & Safety Concerns">Ragging & Safety Concerns</option>
              <option value="Infrastructure Deficiencies">Infrastructure Deficiencies</option>
              <option value="Curriculum & Accreditation">Curriculum & Accreditation</option>
            </Select>
          </div>

          {/* Overlap Review Status */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Overlap Review Status</label>
            <Select
              value={overlapStatusFilter}
              onChange={(e) => setOverlapStatusFilter(e.target.value)}
              className="text-xs py-1.5"
            >
              <option value="ALL">All Overlap States</option>
              <option value="Pending Review">Pending Overlap Review</option>
              <option value="Coordination Required">Coordination Mandated</option>
              <option value="Confirmed">Confirmed Overlap</option>
              <option value="Rejected">Rejected Suggestion</option>
            </Select>
          </div>

          {/* Date Range From */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Received Date (From)</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full text-xs rounded border border-slate-300 px-2 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Date Range To */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Received Date (To)</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full text-xs rounded border border-slate-300 px-2 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Institution Search */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Institution Name</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Filter institution..."
                value={institutionSearch}
                onChange={(e) => setInstitutionSearch(e.target.value)}
                className="w-full text-xs rounded border border-slate-300 pl-7 pr-2 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <Search className="h-3 w-3 text-slate-400 absolute left-2 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Records</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{summary.total_records}</div>
          <span className="text-[10px] text-slate-500">Filtered Dockets</span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Inquiry</span>
          <div className="text-2xl font-bold text-blue-700 mt-1">{summary.active_cases}</div>
          <span className="text-[10px] text-blue-600">Under Process</span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Resolved</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{summary.resolved_cases}</div>
          <span className="text-[10px] text-emerald-600">{summary.resolution_rate}% Resolution</span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Overdue SLA</span>
          <div className="text-2xl font-bold text-rose-700 mt-1">{summary.overdue_cases}</div>
          <span className="text-[10px] text-rose-600">SLA Breached</span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Avg Disposal</span>
          <div className="text-2xl font-bold text-slate-800 mt-1">{summary.avg_days_to_disposal} <span className="text-xs font-normal text-slate-500">Days</span></div>
          <span className="text-[10px] text-slate-500">Target: 15-30 Days</span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Transferred</span>
          <div className="text-2xl font-bold text-purple-700 mt-1">{summary.transferred_cases}</div>
          <span className="text-[10px] text-purple-600">Zonal/State Handover</span>
        </div>
      </div>

      {/* Report Section Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {[
          { id: 'overview', label: 'Overview & Distribution' },
          { id: 'bureaus', label: 'Bureau-Wise Workload' },
          { id: 'regions', label: 'Region-Wise Workload' },
          { id: 'ageing', label: 'Case Ageing Analysis' },
          { id: 'institutions', label: 'Institution Complaint History' },
          { id: 'overlaps', label: 'Overlap & Duplicate Report' },
          { id: 'trends', label: 'Monthly & Quarterly Trends' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <StateView type="loading" title="Generating Analytics Report..." message="Querying centralized database with active filters." />
      ) : error ? (
        <StateView type="error" title="Report Generation Error" message={error} action={<Button variant="outline" size="sm" onClick={loadReports}>Retry</Button>} />
      ) : (
        <div className="space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bureau Chart */}
              <ChartContainer
                title="Bureau-Wise Grievance Distribution"
                subtitle="Active inquiry load vs resolved cases across bureaus"
                height={260}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.bureau_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="bureau" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                    <Bar dataKey="active" name="Active Inquiry" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="overdue" name="Overdue SLA" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              {/* Category Pie */}
              <ChartContainer
                title="Complaint Category Breakdown"
                subtitle="Allegation types across filtered dockets"
                height={260}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.category_breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="category"
                    >
                      {reportData.category_breakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}

          {/* TAB 2: BUREAUS */}
          {activeTab === 'bureaus' && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Bureau-Wise Workload & Disposal Statistics</h3>
                  <p className="text-xs text-slate-500">Cross-sectional inquiry workload across AICTE Bureaus & Cells</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Bureau / Cell</th>
                      <th className="px-4 py-2.5 text-right">Total Cases</th>
                      <th className="px-4 py-2.5 text-right">Active Inquiries</th>
                      <th className="px-4 py-2.5 text-right">Resolved</th>
                      <th className="px-4 py-2.5 text-right">Overdue SLA</th>
                      <th className="px-4 py-2.5 text-right">Resolution Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.bureau_distribution.map((b) => {
                      const rate = b.total > 0 ? Math.round((b.resolved / b.total) * 100) : 0
                      return (
                        <tr key={b.bureau} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-900">{b.bureau}</td>
                          <td className="px-4 py-3 text-right font-mono font-medium">{b.total}</td>
                          <td className="px-4 py-3 text-right font-mono text-blue-700">{b.active}</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-700">{b.resolved}</td>
                          <td className="px-4 py-3 text-right font-mono text-rose-700 font-semibold">{b.overdue}</td>
                          <td className="px-4 py-3 text-right font-mono">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              rate >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: REGIONS */}
          {activeTab === 'regions' && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900">Region-Wise Grievance Distribution</h3>
                <p className="text-xs text-slate-500">Zonal AICTE regional distribution and SLA breach patterns</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">AICTE Region</th>
                      <th className="px-4 py-2.5 text-right">Total Cases</th>
                      <th className="px-4 py-2.5 text-right">Active Inquiries</th>
                      <th className="px-4 py-2.5 text-right">Resolved</th>
                      <th className="px-4 py-2.5 text-right">Overdue SLA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.region_distribution.map((r) => (
                      <tr key={r.region} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{r.region}</td>
                        <td className="px-4 py-3 text-right font-mono font-medium">{r.total}</td>
                        <td className="px-4 py-3 text-right font-mono text-blue-700">{r.active}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-700">{r.resolved}</td>
                        <td className="px-4 py-3 text-right font-mono text-rose-700 font-semibold">{r.overdue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CASE AGEING */}
          {activeTab === 'ageing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {reportData.case_ageing_analysis.map((b, idx) => (
                  <div key={b.bucket} className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">{b.bucket}</span>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{b.count}</div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, b.percentage)}%`,
                          backgroundColor: AGEING_COLORS[idx % AGEING_COLORS.length],
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">{b.percentage}% of active docket</span>
                  </div>
                ))}
              </div>

              <ChartContainer
                title="Case Ageing Profile"
                subtitle="Elapsed duration of open inquiries pending conclusion"
                height={260}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.case_ageing_analysis} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="bucket" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Open Cases in Bucket" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}

          {/* TAB 5: INSTITUTIONS */}
          {activeTab === 'institutions' && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Institution-Wise Complaint History</h3>
                  <p className="text-xs text-slate-500">Historical inquiry volumes and compliance flags by institution</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Institution Name</th>
                      <th className="px-4 py-2.5">AICTE PID</th>
                      <th className="px-4 py-2.5">Region</th>
                      <th className="px-4 py-2.5 text-right">Total Cases</th>
                      <th className="px-4 py-2.5 text-right">Open Cases</th>
                      <th className="px-4 py-2.5 text-right">Resolved</th>
                      <th className="px-4 py-2.5 text-right">Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.institution_history.map((inst) => (
                      <tr key={inst.institution_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{inst.institution_name}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{inst.aicte_permanent_id || 'Unverified'}</td>
                        <td className="px-4 py-3 text-slate-600">{inst.region}</td>
                        <td className="px-4 py-3 text-right font-mono font-medium">{inst.total_cases}</td>
                        <td className="px-4 py-3 text-right font-mono text-blue-700">{inst.open_cases}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-700">{inst.resolved_cases}</td>
                        <td className="px-4 py-3 text-right font-mono text-rose-700 font-semibold">{inst.overdue_cases}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: OVERLAPS */}
          {activeTab === 'overlaps' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Total Detected Relationships</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{reportData.overlap_report?.total_relationships || 0}</div>
                  <span className="text-[11px] text-slate-500">Cross-bureau inquiry links</span>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Pending Review</span>
                  <div className="text-2xl font-bold text-amber-700 mt-1">
                    {reportData.overlap_report?.by_review_status?.['Pending Review'] || 0}
                  </div>
                  <span className="text-[11px] text-amber-600">Awaiting official directive</span>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Coordination Mandated</span>
                  <div className="text-2xl font-bold text-blue-700 mt-1">
                    {reportData.overlap_report?.by_review_status?.['Coordination Required'] || 0}
                  </div>
                  <span className="text-[11px] text-blue-600">Joint hearings scheduled</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">By Relationship Type</h4>
                  <div className="space-y-2">
                    {Object.entries(reportData.overlap_report?.by_relationship_type || {}).map(([type, cnt]) => (
                      <div key={type} className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                        <span className="text-slate-700 font-medium">{type}</span>
                        <span className="font-mono font-bold text-blue-900">{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">By Review Decision</h4>
                  <div className="space-y-2">
                    {Object.entries(reportData.overlap_report?.by_review_status || {}).map(([status, cnt]) => (
                      <div key={status} className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                        <span className="text-slate-700 font-medium">{status}</span>
                        <span className="font-mono font-bold text-slate-900">{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: TRENDS */}
          {activeTab === 'trends' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-900">Monthly Intake & Disposal Trends</h3>
                </div>
                <div className="p-4">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold uppercase">
                      <tr>
                        <th className="px-3 py-2">Period</th>
                        <th className="px-3 py-2 text-right">Received</th>
                        <th className="px-3 py-2 text-right">Resolved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {reportData.monthly_summary.map((m) => (
                        <tr key={m.period} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-semibold text-slate-800">{m.period}</td>
                          <td className="px-3 py-2 text-right text-blue-700">{m.received}</td>
                          <td className="px-3 py-2 text-right text-emerald-700">{m.resolved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-900">Quarterly Intake & Disposal Trends</h3>
                </div>
                <div className="p-4">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold uppercase">
                      <tr>
                        <th className="px-3 py-2">Quarter</th>
                        <th className="px-3 py-2 text-right">Received</th>
                        <th className="px-3 py-2 text-right">Resolved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {reportData.quarterly_summary.map((q) => (
                        <tr key={q.period} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-semibold text-slate-800">{q.period}</td>
                          <td className="px-3 py-2 text-right text-blue-700">{q.received}</td>
                          <td className="px-3 py-2 text-right text-emerald-700">{q.resolved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
