import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Building2,
  Layers,
  Send,
  AlertOctagon,
  RefreshCw,
  Plus,
  Eye,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Calendar,
  Sparkles,
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
  LineChart,
  Line,
} from 'recharts'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ChartContainer } from '../components/ui/ChartContainer'
import { Dialog } from '../components/ui/Dialog'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/StateView'
import { useToast } from '../context/ToastContext'

// Data Service Interface
import * as dashboardService from '../services/dashboardService'
import { MOCK_BUREAUS } from '../data/mockAicteData'

export function DashboardPage({ onNavigateTab }) {
  const { addToast } = useToast()

  // Data & State Management
  const [summary, setSummary] = useState(null)
  const [bureauWorkload, setBureauWorkload] = useState([])
  const [regionDistribution, setRegionDistribution] = useState([])
  const [statusDistribution, setStatusDistribution] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [approachingDeadlines, setApproachingDeadlines] = useState([])
  const [potentialOverlaps, setPotentialOverlaps] = useState([])
  const [recentInstitutions, setRecentInstitutions] = useState([])

  // UI States: Loading, Error & Simulation
  const [isLoading, setIsLoading] = useState(true)
  const [errorState, setErrorState] = useState(null)
  const [isSimulatedEmpty, setIsSimulatedEmpty] = useState(false)

  // Interactive Case Dossier Inspection
  const [selectedCase, setSelectedCase] = useState(null)
  const [isCaseDossierOpen, setIsCaseDossierOpen] = useState(false)

  // Quick Action Form 1: Register New Complaint
  const [isRegisterComplaintOpen, setIsRegisterComplaintOpen] = useState(false)
  const [complaintForm, setComplaintForm] = useState({
    institutionPid: '1-33419082',
    institutionName: 'Delhi Apex Institute of Management & Science',
    category: 'Capitation Fee / Admission Irregularity',
    complainantName: '',
    complainantType: 'Student',
    subject: '',
    bureauId: 'PGRC',
    priority: 'High',
  })
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false)

  // Quick Action Form 2: Register New Institution
  const [isRegisterInstitutionOpen, setIsRegisterInstitutionOpen] = useState(false)
  const [instForm, setInstForm] = useState({
    pid: '',
    name: '',
    state: 'Maharashtra',
    region: 'Western',
    type: 'Private-Self Financing',
    nodalName: '',
    nodalEmail: '',
    nodalPhone: '',
  })
  const [isSubmittingInstitution, setIsSubmittingInstitution] = useState(false)

  // Selected interactive filter highlight
  const [focusedBureau, setFocusedBureau] = useState(null)

  // Load Dashboard Data from Service
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true)
    setErrorState(null)
    try {
      const [
        sumData,
        bureauData,
        regionData,
        statusData,
        activityData,
        deadlinesData,
        overlapsData,
        institutionsData,
      ] = await Promise.all([
        dashboardService.getDashboardSummary(),
        dashboardService.getBureauWorkload(),
        dashboardService.getRegionDistribution(),
        dashboardService.getStatusDistribution(),
        dashboardService.getRecentActivity(6),
        dashboardService.getApproachingDeadlines(5),
        dashboardService.getPotentialOverlaps(4),
        dashboardService.getRecentlyUpdatedInstitutions(4),
      ])

      setSummary(sumData)
      setBureauWorkload(bureauData)
      setRegionDistribution(regionData)
      setStatusDistribution(statusData)
      setRecentActivity(activityData)
      setApproachingDeadlines(deadlinesData)
      setPotentialOverlaps(overlapsData)
      setRecentInstitutions(institutionsData)
    } catch (err) {
      console.error('Failed to load AICTE dashboard metrics:', err)
      setErrorState('Unable to fetch national grievance parameters from the central service.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Summary Card Handler: Navigates to relevant filtered case list
  const handleSummaryCardClick = (filterType) => {
    switch (filterType) {
      case 'total':
        onNavigateTab('complaints', { status: 'ALL' })
        break
      case 'pending':
        onNavigateTab('complaints', { status: 'Pending' })
        break
      case 'inProgress':
      case 'underProcess':
        onNavigateTab('complaints', { status: 'Under Process' })
        break
      case 'overdue':
        onNavigateTab('complaints', { onlyOverdue: true })
        break
      case 'resolved':
      case 'disposed':
        onNavigateTab('complaints', { status: 'Resolved' })
        break
      case 'awaitingAssignment':
        onNavigateTab('complaints', { assignedOfficer: 'Unassigned' })
        break
      case 'overlap':
        onNavigateTab('overlap')
        break
      default:
        onNavigateTab('complaints')
    }
  }

  // Interactive Chart Bar Click: Filter complaints by selected bureau
  const handleBureauChartClick = (entry) => {
    if (entry && entry.bureauId) {
      setFocusedBureau(entry.bureauId)
      addToast({
        title: `Bureau Filter Applied: ${entry.code}`,
        message: `Navigating to cases assigned to ${entry.name}.`,
        type: 'info',
      })
      onNavigateTab('complaints', { bureauId: entry.bureauId })
    }
  }

  // Quick Action: Submit New Grievance
  const handleSubmitComplaint = async (e) => {
    e.preventDefault()
    if (!complaintForm.subject.trim() || !complaintForm.complainantName.trim()) {
      addToast({
        title: 'Validation Incomplete',
        message: 'Complainant name and grievance subject are required.',
        type: 'warning',
      })
      return
    }

    setIsSubmittingComplaint(true)
    try {
      const created = await dashboardService.createComplaint(complaintForm)
      setIsRegisterComplaintOpen(false)
      setComplaintForm({
        institutionPid: '1-33419082',
        institutionName: 'Delhi Apex Institute of Management & Science',
        category: 'Capitation Fee / Admission Irregularity',
        complainantName: '',
        complainantType: 'Student',
        subject: '',
        bureauId: 'PGRC',
        priority: 'High',
      })
      addToast({
        title: 'Grievance Docketed Successfully',
        message: `Registered as ${created.id}. SLA countdown initiated (15 Days).`,
        type: 'success',
      })
      loadDashboardData()
    } catch {
      addToast({
        title: 'Registration Failed',
        message: 'Could not record grievance into the national ledger.',
        type: 'error',
      })
    } finally {
      setIsSubmittingComplaint(false)
    }
  }

  // Quick Action: Submit New Institution
  const handleSubmitInstitution = async (e) => {
    e.preventDefault()
    if (!instForm.pid.trim() || !instForm.name.trim()) {
      addToast({
        title: 'PID & Name Required',
        message: 'Please provide valid Permanent Institute ID and institution name.',
        type: 'warning',
      })
      return
    }

    setIsSubmittingInstitution(true)
    try {
      const created = await dashboardService.createInstitution(instForm)
      setIsRegisterInstitutionOpen(false)
      setInstForm({
        pid: '',
        name: '',
        state: 'Maharashtra',
        region: 'Western',
        type: 'Private-Self Financing',
        nodalName: '',
        nodalEmail: '',
        nodalPhone: '',
      })
      addToast({
        title: 'Institution Enrolled in Registry',
        message: `Institution ${created.name} (PID: ${created.pid}) established.`,
        type: 'success',
      })
      loadDashboardData()
    } catch {
      addToast({
        title: 'Enrollment Error',
        message: 'Could not write institution to registry.',
        type: 'error',
      })
    } finally {
      setIsSubmittingInstitution(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Official Top Title & Quick Actions */}
      <Breadcrumb
        title="AICTE National Complaint Monitoring & Status Dashboard"
        subtitle="Real-time oversight of technical institution grievances, regulatory proceedings, SLA compliance, and cross-bureau overlap detection."
        items={[{ label: 'Dashboard' }]}
        badge={
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 font-semibold text-xs border border-blue-200">
            Govt. Statutory Cycle 2026-27
          </span>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              isLoading={isLoading}
              onClick={loadDashboardData}
              title="Refresh dashboard metrics"
            >
              Refresh Data
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={Building2}
              onClick={() => setIsRegisterInstitutionOpen(true)}
            >
              Enroll Institution
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setIsRegisterComplaintOpen(true)}
            >
              Register Grievance
            </Button>
          </div>
        }
      />

      {/* Official Status Indicator */}
      <div className="bg-blue-500/10 border-l-4 border-l-blue-600 border border-blue-200/80 rounded-r-lg p-3 text-xs text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-700 shrink-0" />
          <span>
            <strong>AICTE INTEGRATED GRIEVANCE SYSTEM:</strong> Centralized complaint monitoring across Regulation Bureau (RB) and Public Grievance Redressal Cell (PGRC).
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Live Database Connected
          </span>
        </div>
      </div>

      {/* Error State Handler */}
      {errorState ? (
        <ErrorState
          title="Telemetry Feed Error"
          message={errorState}
          onRetry={loadDashboardData}
          isRetrying={isLoading}
        />
      ) : isSimulatedEmpty ? (
        <EmptyState
          title="No Grievance Records Found in Registry"
          message="No active cases or institutional complaints are currently registered in this reporting window."
          actionText="Create First Case"
          onAction={() => setIsRegisterComplaintOpen(true)}
        />
      ) : isLoading || !summary ? (
        /* Loading Skeleton for Cards & Charts */
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 animate-pulse space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-2 w-20" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-72 lg:col-span-2 rounded-lg" />
            <Skeleton className="h-72 rounded-lg" />
          </div>
        </div>
      ) : (
        <>
          {/* SECTION 1: 7 DASHBOARD SUMMARY CARDS (PHASE 2A SPECIFICATION) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Institutional Complaint Status Summary (Click card to filter complaints)
              </h2>
              <span className="text-[11px] text-slate-400">
                Resolution Rate: <strong>{summary.resolutionRate}%</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {/* Card 1: Total Complaints */}
              <button
                type="button"
                onClick={() => handleSummaryCardClick('total')}
                className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition text-left flex flex-col justify-between group focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span>Total Complaints</span>
                  <FileText className="h-3.5 w-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-2.5">
                  <div className="text-2xl font-bold text-slate-900 font-sans">{summary.totalCases}</div>
                  <p className="text-[10px] text-slate-400 mt-0.5">All Registered Files</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-blue-700 font-semibold">
                  <span>View All</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>

              {/* Card 2: Pending Complaints */}
              <button
                type="button"
                onClick={() => handleSummaryCardClick('pending')}
                className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition text-left flex flex-col justify-between group focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-amber-900 uppercase tracking-wider">
                  <span>Pending</span>
                  <Clock className="h-3.5 w-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-2.5">
                  <div className="text-2xl font-bold text-amber-900 font-sans">{summary.pendingCases}</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Awaiting Triage</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-amber-800 font-semibold">
                  <span>Inspect Queue</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>

              {/* Card 3: In-Progress Complaints */}
              <button
                type="button"
                onClick={() => handleSummaryCardClick('inProgress')}
                className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-blue-500 hover:shadow-md transition text-left flex flex-col justify-between group focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-blue-800 uppercase tracking-wider">
                  <span>In-Progress</span>
                  <Layers className="h-3.5 w-3.5 text-blue-700 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-2.5">
                  <div className="text-2xl font-bold text-blue-700 font-sans">{summary.underProcessCases}</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Active Inquiries</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-blue-700 font-semibold">
                  <span>Track Status</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>

              {/* Card 4: Overdue Complaints */}
              <button
                type="button"
                onClick={() => handleSummaryCardClick('overdue')}
                className="bg-white p-4 rounded-lg border border-rose-200 shadow-xs hover:border-rose-400 hover:shadow-md transition text-left flex flex-col justify-between group focus:outline-none focus:ring-2 focus:ring-rose-600 bg-rose-50/30"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-rose-900 uppercase tracking-wider">
                  <span>Overdue</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
                  </span>
                </div>
                <div className="mt-2.5">
                  <div className="text-2xl font-bold text-rose-700 font-sans">{summary.overdueCases}</div>
                  <p className="text-[10px] text-rose-700 font-medium mt-0.5">&gt; 30 Days SLA Breach</p>
                </div>
                <div className="mt-2 pt-2 border-t border-rose-100 flex items-center justify-between text-[10px] text-rose-700 font-bold">
                  <span>Escalations</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>

              {/* Card 5: Resolved Complaints */}
              <button
                type="button"
                onClick={() => handleSummaryCardClick('resolved')}
                className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-emerald-500 hover:shadow-md transition text-left flex flex-col justify-between group focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  <span>Resolved</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-2.5">
                  <div className="text-2xl font-bold text-emerald-700 font-sans">{summary.disposedCases}</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Disposed & Closed</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-emerald-700 font-semibold">
                  <span>Archived Files</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>

              {/* Card 6: Complaints Awaiting Assignment */}
              <button
                type="button"
                onClick={() => handleSummaryCardClick('awaitingAssignment')}
                className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition text-left flex flex-col justify-between group focus:outline-none focus:ring-2 focus:ring-amber-600"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-amber-900 uppercase tracking-wider">
                  <span>Unassigned</span>
                  <Clock className="h-3.5 w-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-2.5">
                  <div className="text-2xl font-bold text-amber-800 font-sans">
                    {summary.awaitingAssignmentCases ?? summary.pendingCases}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Awaiting Officer</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-amber-800 font-semibold">
                  <span>Assign Now</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>

              {/* Card 7: Related or Duplicate Complaints */}
              <button
                type="button"
                onClick={() => handleSummaryCardClick('overlap')}
                className="bg-white p-4 rounded-lg border border-rose-300 shadow-xs hover:border-rose-500 hover:shadow-md transition text-left flex flex-col justify-between group focus:outline-none focus:ring-2 focus:ring-rose-600 bg-rose-100/40"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-rose-950 uppercase tracking-wider">
                  <span>Related / Overlaps</span>
                  <AlertOctagon className="h-3.5 w-3.5 text-rose-800 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-2.5">
                  <div className="text-2xl font-bold text-rose-900 font-sans">{summary.unresolvedOverlaps}</div>
                  <p className="text-[10px] text-rose-800 font-medium mt-0.5">Cross-Bureau Cases</p>
                </div>
                <div className="mt-2 pt-2 border-t border-rose-200 flex items-center justify-between text-[10px] text-rose-900 font-bold">
                  <span>Joint Inquiries</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 2 & 3: CHARTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Bureau-wise Workload Chart (2 Cols) */}
            <div className="lg:col-span-2">
              <ChartContainer
                title="Bureau-wise Workload & Case Disposal"
                subtitle="Comparative case distribution across PGRC, Regulation Bureau (RB), Approval Bureau (AB), etc. Click any bar to inspect."
                height={290}
                action={
                  focusedBureau && (
                    <button
                      type="button"
                      onClick={() => setFocusedBureau(null)}
                      className="text-xs text-blue-700 underline font-medium"
                    >
                      Clear Focus
                    </button>
                  )
                }
              >
                <BarChart
                  data={bureauWorkload}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={(state) => {
                    if (state && state.activePayload && state.activePayload.length) {
                      handleBureauChartClick(state.activePayload[0].payload)
                    }
                  }}
                  className="cursor-pointer"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="code" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-lg text-xs shadow-xl space-y-1">
                            <p className="font-bold text-slate-100">{data.name} ({data.code})</p>
                            <div className="space-y-0.5 pt-1 border-t border-slate-800 text-[11px]">
                              <p className="text-blue-300 font-mono">Active Inquiries: {data.activeCases}</p>
                              <p className="text-emerald-300 font-mono">Disposed / Resolved: {data.disposedCases}</p>
                              <p className="text-rose-400 font-mono">Overdue Violations: {data.overdueCases}</p>
                            </div>
                            <p className="text-[10px] text-slate-400 pt-1 italic">Click bar to filter cases</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} />
                  <Bar dataKey="activeCases" name="Active / Under Process" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="disposedCases" name="Disposed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overdueCases" name="Overdue SLA" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>

            {/* Chart 2: Complaint Status Distribution (Donut Chart) */}
            <div className="lg:col-span-1">
              <ChartContainer
                title="Complaint Status Distribution"
                subtitle="National proportional composition by statutory stage"
                height={290}
              >
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`status-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg">
                            <span className="font-semibold">{data.name}</span>
                            <span className="block font-mono text-blue-300 mt-0.5">{data.value} cases</span>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={8}
                    wrapperStyle={{ paddingTop: '8px', fontSize: '10px' }}
                  />
                </PieChart>
              </ChartContainer>
            </div>
          </div>

          {/* SECTION 4: REGION-WISE CASE DISTRIBUTION */}
          <div>
            <ChartContainer
              title="Regional Council Case Distribution & Escalation Volume"
              subtitle="Grievance density and overdue flags across all 7 AICTE Regional Directorates"
              height={240}
            >
              <BarChart data={regionDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="region" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg space-y-1">
                          <p className="font-bold">{data.name}</p>
                          <p className="text-blue-300">Total Cases: {data.count}</p>
                          <p className="text-rose-400">Overdue: {data.overdue}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} />
                <Bar dataKey="count" name="Total Inflow" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdue" name="SLA Escalations" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>

          {/* SECTION 5 & 6: TWO-COLUMN OPERATIONAL PANELS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel: Cases Approaching Statutory SLA Deadlines */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Grievances Approaching Statutory Deadlines
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateTab('complaints', { onlyOverdue: true })}
                    className="text-xs text-blue-700"
                  >
                    <span>View All Overdue</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>

                <div className="divide-y divide-slate-100 mt-2">
                  {approachingDeadlines.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedCase(item)
                        setIsCaseDossierOpen(true)
                      }}
                      className="py-3 flex items-start justify-between gap-3 hover:bg-slate-50/80 p-2 rounded cursor-pointer transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-700">{item.id}</span>
                          <Badge variant={item.priority} size="sm">{item.priority}</Badge>
                          <Badge variant={item.bureauId} size="sm">{item.bureauId}</Badge>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 line-clamp-1">{item.subject}</p>
                        <p className="text-[11px] text-slate-500 font-mono truncate max-w-sm">
                          {item.institutionName} • PID: {item.institutionPid}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {item.isOverdue ? (
                          <span className="text-rose-700 font-bold text-xs bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1 justify-end">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                            Overdue {item.daysPending - 15}d
                          </span>
                        ) : (
                          <span className="text-amber-800 font-semibold text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {15 - item.daysPending} days left
                          </span>
                        )}
                        <span className="block text-[10px] text-slate-400 mt-1">Due: {item.slaDeadline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel: Potential Overlap Alerts */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4 text-rose-700" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Cross-Bureau Conflict Overlaps
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateTab('overlap')}
                    className="text-xs text-rose-800 font-bold"
                  >
                    <span>Overlap Matrix</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>

                <div className="space-y-3 mt-3">
                  {potentialOverlaps.map((ovl) => (
                    <div
                      key={ovl.id}
                      onClick={() => onNavigateTab('overlap')}
                      className="p-3 bg-rose-50/50 border border-rose-200 rounded-lg hover:bg-rose-50 cursor-pointer transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-rose-900">{ovl.id}</span>
                        <Badge variant="danger" size="sm">{ovl.severity} Severity</Badge>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{ovl.institutionName}</h4>
                      <p className="text-[11px] text-slate-600 leading-tight line-clamp-2">
                        {ovl.triggerReason}
                      </p>
                      <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-rose-100">
                        <span>Bureaus: {ovl.bureauPrimary} vs {ovl.bureauSecondary}</span>
                        <span className="text-blue-700 font-semibold underline">Review Joint Inquiry</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 7 & 8: RECENT ACTIVITY & UPDATED INSTITUTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Case Activity (2 Cols) */}
            <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Recent Case Actions & Regulatory Directives
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateTab('action-history')}
                  className="text-xs text-blue-700"
                >
                  <span>Full Audit Trail</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>

              <div className="divide-y divide-slate-100">
                {recentActivity.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-start gap-3 text-xs">
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 w-28 pt-0.5">
                      {log.timestamp}
                    </span>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{log.officer}</span>
                        <span className="text-[10px] text-slate-500">({log.role})</span>
                        <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                          {log.action}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] font-mono leading-normal">
                        {log.details}
                      </p>
                    </div>
                    <span className="font-mono text-blue-700 font-semibold shrink-0">
                      {log.targetId}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recently Updated Institutions (1 Col) */}
            <div className="lg:col-span-1 bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-700" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Institutions on Watchlist
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateTab('institutions')}
                    className="text-xs text-blue-700"
                  >
                    <span>Registry</span>
                  </Button>
                </div>

                <div className="space-y-3 mt-3">
                  {recentInstitutions.map((inst) => (
                    <div
                      key={inst.pid}
                      onClick={() => onNavigateTab('institutions')}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100/60 cursor-pointer transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-700">{inst.pid}</span>
                        <Badge
                          variant={inst.status === 'Approved' ? 'success' : 'danger'}
                          size="sm"
                        >
                          {inst.status}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{inst.name}</h4>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                        <span>{inst.state}</span>
                        <span className="font-semibold text-rose-700">{inst.activeComplaints} Complaints</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL 1: REGISTER NEW GRIEVANCE (QUICK ACTION) */}
      <Dialog
        isOpen={isRegisterComplaintOpen}
        onClose={() => setIsRegisterComplaintOpen(false)}
        title="Register New Institutional Grievance File"
        type="info"
        size="lg"
        confirmText="Register Grievance & Issue Docket"
        cancelText="Cancel"
        onConfirm={handleSubmitComplaint}
        isLoading={isSubmittingComplaint}
      >
        <form onSubmit={handleSubmitComplaint} className="space-y-3 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Target AICTE Technical Institution
            </label>
            <select
              value={complaintForm.institutionPid}
              onChange={(e) => {
                const pid = e.target.value
                const found = recentInstitutions.find((i) => i.pid === pid)
                setComplaintForm((prev) => ({
                  ...prev,
                  institutionPid: pid,
                  institutionName: found ? found.name : 'Technical Institution',
                }))
              }}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              {recentInstitutions.map((i) => (
                <option key={i.pid} value={i.pid}>
                  {i.pid} - {i.name} ({i.state})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Complainant Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Chandra / Whistleblower"
                value={complaintForm.complainantName}
                onChange={(e) => setComplaintForm((prev) => ({ ...prev, complainantName: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Complainant Category
              </label>
              <select
                value={complaintForm.complainantType}
                onChange={(e) => setComplaintForm((prev) => ({ ...prev, complainantType: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                <option value="Student">Student</option>
                <option value="Faculty Member">Faculty Member</option>
                <option value="Parent / Guardian">Parent / Guardian</option>
                <option value="Citizen / RTI">Citizen / RTI Applicant</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Routing AICTE Bureau / Cell
              </label>
              <select
                value={complaintForm.bureauId}
                onChange={(e) => setComplaintForm((prev) => ({ ...prev, bureauId: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                {MOCK_BUREAUS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Priority Level
              </label>
              <select
                value={complaintForm.priority}
                onChange={(e) => setComplaintForm((prev) => ({ ...prev, priority: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                <option value="Critical">Critical (Immediate Hearing / Harassment)</option>
                <option value="High">High (Capitation Fee / Admission Breach)</option>
                <option value="Medium">Medium (Infrastructure / Lab Deficiency)</option>
                <option value="Low">Low (General Query / Procedural)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Grievance Subject & Key Allegation Summary
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Non-refund of hostel fee deposit upon early withdrawal..."
              value={complaintForm.subject}
              onChange={(e) => setComplaintForm((prev) => ({ ...prev, subject: e.target.value }))}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        </form>
      </Dialog>

      {/* MODAL 2: ENROLL NEW INSTITUTION (QUICK ACTION) */}
      <Dialog
        isOpen={isRegisterInstitutionOpen}
        onClose={() => setIsRegisterInstitutionOpen(false)}
        title="Enroll Institution into Central Registry"
        type="info"
        size="lg"
        confirmText="Verify & Save to Registry"
        cancelText="Cancel"
        onConfirm={handleSubmitInstitution}
        isLoading={isSubmittingInstitution}
      >
        <form onSubmit={handleSubmitInstitution} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Permanent Institute ID (PID)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 1-90823419"
                value={instForm.pid}
                onChange={(e) => setInstForm((prev) => ({ ...prev, pid: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Institution Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Pune Apex Institute of Technology"
                value={instForm.name}
                onChange={(e) => setInstForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                AICTE Region
              </label>
              <select
                value={instForm.region}
                onChange={(e) => setInstForm((prev) => ({ ...prev, region: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                <option value="Western">Western</option>
                <option value="North Western">North Western</option>
                <option value="South Western">South Western</option>
                <option value="South Central">South Central</option>
                <option value="Eastern">Eastern</option>
                <option value="Southern">Southern</option>
                <option value="Central">Central</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                State
              </label>
              <input
                type="text"
                placeholder="e.g. Maharashtra"
                value={instForm.state}
                onChange={(e) => setInstForm((prev) => ({ ...prev, state: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Nodal Officer Name
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. K. Verma"
                value={instForm.nodalName}
                onChange={(e) => setInstForm((prev) => ({ ...prev, nodalName: e.target.value }))}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Nodal Email
              </label>
              <input
                type="email"
                placeholder="nodal@college.ac.in"
                value={instForm.nodalEmail}
                onChange={(e) => setInstForm((prev) => ({ ...prev, nodalEmail: e.target.value }))}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Nodal Phone
              </label>
              <input
                type="tel"
                placeholder="+91 98000 00000"
                value={instForm.nodalPhone}
                onChange={(e) => setInstForm((prev) => ({ ...prev, nodalPhone: e.target.value }))}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
              />
            </div>
          </div>
        </form>
      </Dialog>

      {/* MODAL 3: CASE DOSSIER INSPECTOR */}
      <Dialog
        isOpen={isCaseDossierOpen}
        onClose={() => setIsCaseDossierOpen(false)}
        title={`Grievance Dossier: ${selectedCase?.id}`}
        type="info"
        size="lg"
        confirmText="Open in Full Ledger"
        cancelText="Close"
        onConfirm={() => {
          setIsCaseDossierOpen(false)
          onNavigateTab('complaints', { search: selectedCase?.id })
        }}
      >
        {selectedCase && (
          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-sm text-slate-900">{selectedCase.subject}</h4>
                <Badge variant={selectedCase.priority}>{selectedCase.priority}</Badge>
              </div>
              <p className="text-slate-600 font-semibold">{selectedCase.institutionName}</p>
              <p className="text-slate-400 font-mono text-[11px]">Permanent Institute ID: {selectedCase.institutionPid}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Complainant</span>
                <span className="font-semibold">{selectedCase.complainantName} ({selectedCase.complainantType})</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Bureau</span>
                <span className="font-semibold">{selectedCase.bureauName} ({selectedCase.bureauId})</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Registration Date</span>
                <span className="font-mono">{selectedCase.submissionDate}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Statutory SLA Deadline</span>
                <span className="font-mono text-rose-700 font-bold">{selectedCase.slaDeadline}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Latest Action Proceeding</span>
              <p className="text-slate-800 font-mono text-[11px]">{selectedCase.lastUpdate}</p>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
