import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  FileText,
  Search,
  Filter,
  Plus,
  AlertOctagon,
  Clock,
  Eye,
  CheckCircle2,
  Calendar,
  User,
  Building2,
  ShieldAlert,
  Send,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  FileCheck,
  Paperclip,
  Share2,
  AlertTriangle,
  History,
  FileEdit,
  ExternalLink,
} from 'lucide-react'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { DataTable } from '../components/ui/DataTable'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState, ErrorState } from '../components/ui/StateView'
import { useToast } from '../context/ToastContext'

// Data Service Interface
import * as dataService from '../services/dashboardService'
import {
  MOCK_BUREAUS,
  MOCK_REGIONS,
  MOCK_CATEGORIES,
  MOCK_STATUSES,
  MOCK_PRIORITIES,
  MOCK_INSTITUTIONS,
} from '../data/mockAicteData'

export function ComplaintsPage({ onNavigateTab, initialFilter = null }) {
  const { addToast } = useToast()

  // Filter States
  const [search, setSearch] = useState('')
  const [institutionFilter, setInstitutionFilter] = useState('ALL')
  const [bureauFilter, setBureauFilter] = useState('ALL')
  const [regionFilter, setRegionFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [overlapFilter, setOverlapFilter] = useState('ALL') // 'ALL', 'OVERLAP_ONLY', 'NO_OVERLAP'
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [onlyOverdue, setOnlyOverdue] = useState(false)

  // Sort & Pagination
  const [sortBy, setSortBy] = useState('receivedDate')
  const [sortDir, setSortDir] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)

  // Data State
  const [complaints, setComplaints] = useState([])
  const [totalCases, setTotalCases] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [registeredInstitutions, setRegisteredInstitutions] = useState(MOCK_INSTITUTIONS)

  // Fetch registered institutions dynamically from central API
  useEffect(() => {
    dataService
      .getInstitutions({ pageSize: 100 })
      .then((res) => {
        if (res && res.data && res.data.length > 0) {
          setRegisteredInstitutions(res.data)
        }
      })
      .catch(() => {})
  }, [])

  // Handle incoming initialFilter prop from Dashboard cards / charts
  useEffect(() => {
    if (initialFilter) {
      if (initialFilter.status !== undefined) setStatusFilter(initialFilter.status)
      if (initialFilter.bureauId !== undefined) setBureauFilter(initialFilter.bureauId)
      if (initialFilter.institution !== undefined) setInstitutionFilter(initialFilter.institution)
      if (initialFilter.onlyOverdue !== undefined) setOnlyOverdue(Boolean(initialFilter.onlyOverdue))
      if (initialFilter.search !== undefined) setSearch(initialFilter.search)
      if (initialFilter.hasOverlap !== undefined) setOverlapFilter(initialFilter.hasOverlap)
      if (initialFilter.assignedOfficer !== undefined) setSearch(initialFilter.assignedOfficer)
      setCurrentPage(1)
    }
  }, [initialFilter])

  // Fetch Complaints from Service
  const fetchComplaints = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await dataService.getComplaints({
        search,
        institution: institutionFilter,
        bureauId: bureauFilter,
        region: regionFilter,
        category: categoryFilter,
        status: statusFilter,
        priority: priorityFilter,
        dateFrom,
        dateTo,
        hasOverlap: overlapFilter,
        onlyOverdue,
        sortBy,
        sortDir,
        page: currentPage,
        pageSize,
      })
      setComplaints(res.data)
      setTotalCases(res.total)
    } catch {
      setError('Unable to fetch grievance records from national database.')
    } finally {
      setIsLoading(false)
    }
  }, [
    search,
    institutionFilter,
    bureauFilter,
    regionFilter,
    categoryFilter,
    statusFilter,
    priorityFilter,
    dateFrom,
    dateTo,
    overlapFilter,
    onlyOverdue,
    sortBy,
    sortDir,
    currentPage,
    pageSize,
  ])

  useEffect(() => {
    fetchComplaints()
  }, [fetchComplaints])

  // ==========================================
  // C. CREATE COMPLAINT FORM STATE
  // ==========================================
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    institutionPid: MOCK_INSTITUTIONS[0]?.pid || '1-43289011',
    institutionName: MOCK_INSTITUTIONS[0]?.name || '',
    category: MOCK_CATEGORIES[0],
    description: '',
    receivedDate: new Date().toISOString().split('T')[0],
    priority: 'High',
    bureauId: 'PGRC',
    assignedOfficer: 'Dr. V. K. Sharma',
    expectedDisposalDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    supportingDocumentRef: '',
    complainantName: '',
    complainantType: 'Student',
    complainantContact: '',
  })
  const [createErrors, setCreateErrors] = useState({})
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false)

  // Validate Create Complaint Form
  const validateCreateForm = () => {
    const errs = {}
    if (!createForm.institutionPid) errs.institutionPid = 'Institution selection is required.'
    if (!createForm.category) errs.category = 'Complaint category is required.'
    if (!createForm.description.trim()) {
      errs.description = 'Detailed complaint description is required.'
    } else if (createForm.description.trim().length < 20) {
      errs.description = 'Please provide a substantive description (at least 20 characters).'
    }
    if (!createForm.receivedDate) errs.receivedDate = 'Received date is required.'
    if (!createForm.expectedDisposalDate) errs.expectedDisposalDate = 'Expected disposal date is required.'
    if (!createForm.complainantName.trim()) errs.complainantName = 'Complainant name is required.'

    setCreateErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Handle Create Complaint Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!validateCreateForm()) return

    setIsSubmittingCreate(true)
    try {
      const selectedInst = registeredInstitutions.find((i) => i.pid === createForm.institutionPid)
      const created = await dataService.createComplaint({
        ...createForm,
        institutionName: selectedInst ? selectedInst.name : createForm.institutionName,
        region: selectedInst ? selectedInst.region : 'Western',
        institutionInternalId: selectedInst ? selectedInst.internalId : 'AICTE-INST-001',
      })

      setIsCreateModalOpen(false)
      setCreateForm({
        institutionPid: registeredInstitutions[0]?.pid || '1-43289011',
        institutionName: registeredInstitutions[0]?.name || '',
        category: MOCK_CATEGORIES[0],
        description: '',
        receivedDate: new Date().toISOString().split('T')[0],
        priority: 'High',
        bureauId: 'PGRC',
        assignedOfficer: 'Dr. V. K. Sharma',
        expectedDisposalDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        supportingDocumentRef: '',
        complainantName: '',
        complainantType: 'Student',
        complainantContact: '',
      })
      setCreateErrors({})

      addToast({
        title: 'Grievance Docketed Successfully',
        message: `Registered as ${created.id}. Statutory SLA target set for ${created.expectedDisposalDate}.`,
        type: 'success',
      })
      fetchComplaints()
    } catch {
      addToast({
        title: 'Error Creating Complaint',
        message: 'Could not record case file.',
        type: 'error',
      })
    } finally {
      setIsSubmittingCreate(false)
    }
  }

  // ==========================================
  // D. CASE DETAILS & UPDATE FORMS STATE
  // ==========================================
  const [selectedCase, setSelectedCase] = useState(null)
  const [isDossierOpen, setIsDossierOpen] = useState(false)
  const [activeDossierTab, setActiveDossierTab] = useState('overview') // 'overview', 'actions', 'updates'

  // Update Status Form
  const [statusUpdateForm, setStatusUpdateForm] = useState({
    status: '',
    remarks: '',
  })
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Update Assignment Form
  const [assignmentForm, setAssignmentForm] = useState({
    bureauId: '',
    assignedOfficer: '',
    remarks: '',
  })
  const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false)

  // Update Next Action Form
  const [nextActionForm, setNextActionForm] = useState({
    nextActionRequired: '',
    nextActionDueDate: '',
    remarks: '',
  })
  const [isUpdatingNextAction, setIsUpdatingNextAction] = useState(false)

  // Append Official Remark Form
  const [remarkForm, setRemarkForm] = useState({
    remark: '',
    actionType: 'Official Directive',
  })
  const [isAppendingRemark, setIsAppendingRemark] = useState(false)

  // Open Case Dossier
  const handleOpenCase = (caseItem) => {
    setSelectedCase(caseItem)
    setStatusUpdateForm({ status: caseItem.status, remarks: '' })
    setAssignmentForm({
      bureauId: caseItem.bureauId,
      assignedOfficer: caseItem.assignedOfficer,
      remarks: '',
    })
    setNextActionForm({
      nextActionRequired: caseItem.nextActionRequired || '',
      nextActionDueDate: caseItem.nextActionDueDate || '',
      remarks: '',
    })
    setRemarkForm({ remark: '', actionType: 'Official Directive' })
    setActiveDossierTab('overview')
    setIsDossierOpen(true)
  }

  // Submit Status Update
  const handleStatusSubmit = async (e) => {
    e.preventDefault()
    if (!statusUpdateForm.status) return
    setIsUpdatingStatus(true)
    try {
      const updated = await dataService.updateComplaintStatus(selectedCase.id, {
        status: statusUpdateForm.status,
        remarks: statusUpdateForm.remarks,
        officer: 'Authorized AICTE Officer',
      })
      setSelectedCase({ ...updated })
      addToast({
        title: 'Status Updated',
        message: `Case ${updated.id} marked as ${updated.status}. Action trail updated.`,
        type: 'success',
      })
      fetchComplaints()
    } catch {
      addToast({ title: 'Update Failed', message: 'Could not change status.', type: 'error' })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Submit Assignment Update
  const handleAssignmentSubmit = async (e) => {
    e.preventDefault()
    setIsUpdatingAssignment(true)
    try {
      const updated = await dataService.updateComplaintAssignment(selectedCase.id, {
        bureauId: assignmentForm.bureauId,
        assignedOfficer: assignmentForm.assignedOfficer,
        remarks: assignmentForm.remarks,
        officer: 'Central Administrative Officer',
      })
      setSelectedCase({ ...updated })
      addToast({
        title: 'Assignment Reconfigured',
        message: `Assigned to ${updated.bureauId} (${updated.assignedOfficer}).`,
        type: 'success',
      })
      fetchComplaints()
    } catch {
      addToast({ title: 'Reassignment Failed', message: 'Could not change assignment.', type: 'error' })
    } finally {
      setIsUpdatingAssignment(false)
    }
  }

  // Submit Next Action Update
  const handleNextActionSubmit = async (e) => {
    e.preventDefault()
    if (!nextActionForm.nextActionRequired.trim()) return
    setIsUpdatingNextAction(true)
    try {
      const updated = await dataService.updateComplaintNextAction(selectedCase.id, {
        nextActionRequired: nextActionForm.nextActionRequired,
        nextActionDueDate: nextActionForm.nextActionDueDate,
        remarks: nextActionForm.remarks,
        officer: 'Supervisory Officer',
      })
      setSelectedCase({ ...updated })
      addToast({
        title: 'Next Action Scheduled',
        message: `Scheduled directive recorded for ${updated.id}.`,
        type: 'success',
      })
      fetchComplaints()
    } catch {
      addToast({ title: 'Action Schedule Failed', message: 'Could not schedule action.', type: 'error' })
    } finally {
      setIsUpdatingNextAction(false)
    }
  }

  // Submit Official Remark
  const handleRemarkSubmit = async (e) => {
    e.preventDefault()
    if (!remarkForm.remark.trim()) return
    setIsAppendingRemark(true)
    try {
      const updated = await dataService.addComplaintRemark(selectedCase.id, {
        remark: remarkForm.remark,
        actionType: remarkForm.actionType,
        officer: 'Regulatory Officer',
      })
      setSelectedCase({ ...updated })
      setRemarkForm({ remark: '', actionType: 'Official Directive' })
      addToast({
        title: 'Official Directive Logged',
        message: 'Remark permanently appended to chronological action trail.',
        type: 'success',
      })
      fetchComplaints()
    } catch {
      addToast({ title: 'Failed to Append Remark', message: 'Could not record remark.', type: 'error' })
    } finally {
      setIsAppendingRemark(false)
    }
  }

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('')
    setInstitutionFilter('ALL')
    setBureauFilter('ALL')
    setRegionFilter('ALL')
    setCategoryFilter('ALL')
    setStatusFilter('ALL')
    setPriorityFilter('ALL')
    setOverlapFilter('ALL')
    setDateFrom('')
    setDateTo('')
    setOnlyOverdue(false)
    setCurrentPage(1)
  }

  // Table Columns Definition (Strictly matching prompt specification)
  const columns = [
    {
      header: 'Complaint ID',
      accessorKey: 'id',
      width: '135px',
      sortable: true,
      sortKey: 'id',
      cell: (row) => (
        <span className="font-mono font-bold text-blue-700 text-xs">
          {row.id}
        </span>
      ),
    },
    {
      header: 'Institution & Identifier',
      accessorKey: 'institutionName',
      sortable: true,
      sortKey: 'institutionName',
      cell: (row) => (
        <div className="space-y-0.5 max-w-xs">
          <span className="font-bold text-slate-900 block truncate" title={row.institutionName}>
            {row.institutionName}
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            PID: {row.institutionPid} • {row.region}
          </span>
        </div>
      ),
    },
    {
      header: 'Complaint Category',
      accessorKey: 'category',
      cell: (row) => (
        <span className="text-xs text-slate-700 font-medium block truncate max-w-xs" title={row.category}>
          {row.category}
        </span>
      ),
    },
    {
      header: 'Responsible Bureau',
      accessorKey: 'bureauId',
      sortable: true,
      sortKey: 'bureauId',
      cell: (row) => (
        <Badge variant={row.bureauId === 'RB' ? 'RB' : 'PGRC'}>
          {row.bureauId}
        </Badge>
      ),
    },
    {
      header: 'Assigned Officer',
      accessorKey: 'assignedOfficer',
      cell: (row) => (
        <span className="text-xs text-slate-800 font-medium truncate block max-w-[130px]" title={row.assignedOfficer}>
          {row.assignedOfficer}
        </span>
      ),
    },
    {
      header: 'Priority',
      accessorKey: 'priority',
      sortable: true,
      sortKey: 'priority',
      cell: (row) => <Badge variant={row.priority}>{row.priority}</Badge>,
    },
    {
      header: 'Current Status',
      accessorKey: 'status',
      sortable: true,
      sortKey: 'status',
      cell: (row) => <Badge variant={row.status}>{row.status}</Badge>,
    },
    {
      header: 'Submission Date',
      accessorKey: 'receivedDate',
      sortable: true,
      sortKey: 'receivedDate',
      cell: (row) => (
        <span className="text-xs font-mono text-slate-600">
          {row.receivedDate || row.submissionDate}
        </span>
      ),
    },
    {
      header: 'Deadline',
      accessorKey: 'expectedDisposalDate',
      sortable: true,
      sortKey: 'expectedDisposalDate',
      cell: (row) => (
        <div className="font-mono text-xs">
          <span className={row.isOverdue ? 'text-rose-700 font-bold' : 'text-slate-700 font-medium'}>
            {row.expectedDisposalDate || row.slaDeadline}
          </span>
          {row.isOverdue && (
            <span className="block text-[10px] text-rose-700 font-semibold font-sans">
              Overdue ({row.daysPending}d)
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Last Updated',
      accessorKey: 'lastActionDate',
      cell: (row) => (
        <span className="text-xs font-mono text-slate-500">
          {row.lastActionDate || '—'}
        </span>
      ),
    },
    {
      header: 'Related Overlap',
      accessorKey: 'hasOverlap',
      align: 'center',
      cell: (row) => (
        <div>
          {row.hasOverlap ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-300"
              title={row.overlapSummary}
            >
              <AlertOctagon className="h-3 w-3 text-rose-700" />
              <span>Overlap Detected</span>
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-mono">—</span>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessorKey: 'action',
      align: 'right',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          icon={Eye}
          onClick={() => handleOpenCase(row)}
          title="Inspect complete case dossier, history, and update status"
        >
          Details
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <Breadcrumb
        title="Grievance & Regulatory Case Management Ledger"
        subtitle="Centralized registry tracking all complaints, statutory SLA deadlines, Bureau assignments, and cross-bureau conflicts."
        items={[{ label: 'Dashboard', onClick: () => onNavigateTab('dashboard') }, { label: 'Complaints & Cases' }]}
        badge={
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 font-semibold text-xs border border-blue-200">
            {totalCases} Active Files
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              isLoading={isLoading}
              onClick={fetchComplaints}
            >
              Refresh
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create Complaint
            </Button>
          </div>
        }
      />

      {/* FILTER PANEL */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5 text-blue-700" />
            <span>Multi-Facet Case Filters</span>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-blue-700 hover:underline font-semibold"
          >
            Reset All Filters
          </button>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Universal Search (Case ID, Institution, Complainant) */}
          <div className="sm:col-span-2">
            <Input
              isSearch
              placeholder="Search by Case ID, College Name, PID, Complainant..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              onClear={() => {
                setSearch('')
                setCurrentPage(1)
              }}
            />
          </div>

          {/* Institution Filter */}
          <Select
            value={institutionFilter}
            onChange={(e) => {
              setInstitutionFilter(e.target.value)
              setCurrentPage(1)
            }}
            options={[
              { value: 'ALL', label: 'All Registered Institutions' },
              ...registeredInstitutions.map((inst) => ({
                value: inst.pid,
                label: `${inst.name} (${inst.pid})`,
              })),
            ]}
          />

          {/* Bureau Filter: Emphasizing RB and PGRC */}
          <Select
            value={bureauFilter}
            onChange={(e) => {
              setBureauFilter(e.target.value)
              setCurrentPage(1)
            }}
            options={[
              { value: 'ALL', label: 'All Bureaus (RB & PGRC)' },
              { value: 'RB', label: 'RB - Regulation Bureau' },
              { value: 'PGRC', label: 'PGRC - Public Grievance Redressal Cell' },
              ...MOCK_BUREAUS.filter((b) => !['RB', 'PGRC'].includes(b.id)).map((b) => ({
                value: b.id,
                label: `${b.code} - ${b.name}`,
              })),
            ]}
          />

          {/* Region Filter */}
          <Select
            value={regionFilter}
            onChange={(e) => {
              setRegionFilter(e.target.value)
              setCurrentPage(1)
            }}
            options={[
              { value: 'ALL', label: 'All Regions' },
              ...MOCK_REGIONS.map((r) => ({ value: r, label: `${r} Region` })),
            ]}
          />

          {/* Category Filter */}
          <Select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setCurrentPage(1)
            }}
            options={[
              { value: 'ALL', label: 'All Categories' },
              ...MOCK_CATEGORIES.map((cat) => ({ value: cat, label: cat })),
            ]}
          />

          {/* Status Filter matching Phase 3C workflow */}
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            options={[
              { value: 'ALL', label: 'All Lifecycle Statuses' },
              { value: 'Submitted', label: 'Submitted' },
              { value: 'Under Review', label: 'Under Review' },
              { value: 'Assigned', label: 'Assigned' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Under Process', label: 'Under Process (All Active Inquiries)' },
              { value: 'Awaiting Information', label: 'Awaiting Information' },
              { value: 'Resolved', label: 'Resolved' },
              { value: 'Closed', label: 'Closed' },
              { value: 'Pending', label: 'Pending' },
              { value: 'In Investigation', label: 'In Investigation' },
              { value: 'Hearing Scheduled', label: 'Hearing Scheduled' },
              { value: 'Transferred', label: 'Transferred' },
            ]}
          />

          {/* Priority Filter */}
          <Select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value)
              setCurrentPage(1)
            }}
            options={[
              { value: 'ALL', label: 'All Priorities' },
              ...MOCK_PRIORITIES.map((p) => ({ value: p, label: `${p} Priority` })),
            ]}
          />

          {/* Overlap Status Filter */}
          <Select
            value={overlapFilter}
            onChange={(e) => {
              setOverlapFilter(e.target.value)
              setCurrentPage(1)
            }}
            options={[
              { value: 'ALL', label: 'All Overlap Statuses' },
              { value: 'OVERLAP_ONLY', label: 'Dual-Bureau Overlaps Only' },
              { value: 'NO_OVERLAP', label: 'No Overlap' },
            ]}
          />

          {/* Date Range: Received From */}
          <div>
            <input
              type="date"
              aria-label="Received Date From"
              title="Received Date From"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          {/* Date Range: Received To */}
          <div>
            <input
              type="date"
              aria-label="Received Date To"
              title="Received Date To"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        </div>

        {/* Active Pill Triggers & Results Count */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 text-xs gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium">Quick Toggles:</span>
            <button
              type="button"
              onClick={() => {
                setOnlyOverdue(!onlyOverdue)
                setCurrentPage(1)
              }}
              className={`px-2.5 py-1 rounded-md border font-medium transition ${
                onlyOverdue
                  ? 'bg-rose-100 text-rose-900 border-rose-300 font-semibold shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Overdue Cases Only
            </button>

            <button
              type="button"
              onClick={() => {
                setOverlapFilter(overlapFilter === 'OVERLAP_ONLY' ? 'ALL' : 'OVERLAP_ONLY')
                setCurrentPage(1)
              }}
              className={`px-2.5 py-1 rounded-md border font-medium transition ${
                overlapFilter === 'OVERLAP_ONLY'
                  ? 'bg-purple-100 text-purple-900 border-purple-300 font-semibold shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Cross-Bureau Overlaps Only
            </button>
          </div>

          <span className="text-slate-500 font-medium">
            Showing <strong>{complaints.length}</strong> of {totalCases} records
          </span>
        </div>
      </div>

      {/* Main Complaints Ledger Table */}
      {error ? (
        <ErrorState
          title="Grievance Ledger Error"
          message={error}
          onRetry={fetchComplaints}
          isRetrying={isLoading}
        />
      ) : (
        <DataTable
          columns={columns}
          data={complaints}
          keyField="id"
          isLoading={isLoading}
          emptyMessage="No grievances match the current filter criteria."
          pagination={{
            currentPage,
            totalItems: totalCases,
            pageSize,
            onPageChange: setCurrentPage,
            onPageSizeChange: (newSize) => {
              setPageSize(newSize)
              setCurrentPage(1)
            },
          }}
        />
      )}

      {/* ========================================== */}
      {/* C. CREATE COMPLAINT MODAL FORM */}
      {/* ========================================== */}
      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Docket New Official Grievance Case"
        type="info"
        size="lg"
        confirmText="Register Grievance"
        cancelText="Cancel"
        onConfirm={handleCreateSubmit}
        isLoading={isSubmittingCreate}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs max-h-[75vh] overflow-y-auto pr-1">
          <p className="text-slate-500 text-[11px]">
            File an official complaint docket in the national registry. All fields marked with * are required under Central Redressal Guidelines.
          </p>

          {/* 1. Target Institution Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Institution *
            </label>
            <select
              value={createForm.institutionPid}
              onChange={(e) => {
                const pid = e.target.value
                const found = registeredInstitutions.find((i) => i.pid === pid)
                setCreateForm((prev) => ({
                  ...prev,
                  institutionPid: pid,
                  institutionName: found ? found.name : '',
                }))
              }}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              {registeredInstitutions.map((inst) => (
                <option key={inst.pid} value={inst.pid}>
                  {inst.name} ({inst.pid}) - {inst.state || inst.region}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Complaint Category *
              </label>
              <select
                value={createForm.category}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none"
              >
                {MOCK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Priority Level *
              </label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, priority: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none"
              >
                {MOCK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p} Priority
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Complainant Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Complainant Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={createForm.complainantName}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, complainantName: e.target.value }))}
                className={`w-full p-2 rounded-lg border text-xs text-slate-900 focus:outline-none ${
                  createErrors.complainantName ? 'border-rose-400' : 'border-slate-300'
                }`}
              />
              {createErrors.complainantName && (
                <p className="text-rose-600 text-[10px] mt-0.5">{createErrors.complainantName}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Complainant Type
              </label>
              <select
                value={createForm.complainantType}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, complainantType: e.target.value }))}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none"
              >
                <option value="Student">Student</option>
                <option value="Faculty Member">Faculty Member</option>
                <option value="Parent / Guardian">Parent / Guardian</option>
                <option value="Citizen / RTI Applicant">Citizen / RTI</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Contact Phone / Email
              </label>
              <input
                type="text"
                placeholder="ramesh@gmail.com"
                value={createForm.complainantContact}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, complainantContact: e.target.value }))}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* 4. Description of Allegation */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Grievance Description & Statutory Allegation Statement *
            </label>
            <textarea
              rows={3}
              required
              placeholder="State the facts of the allegation, date of occurrence, monetary demand or regulatory violation details..."
              value={createForm.description}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              className={`w-full p-2.5 rounded-lg border text-xs text-slate-900 focus:outline-none ${
                createErrors.description ? 'border-rose-400' : 'border-slate-300'
              }`}
            />
            {createErrors.description && (
              <p className="text-rose-600 text-[11px] mt-0.5">{createErrors.description}</p>
            )}
          </div>

          {/* 5. Bureau Assignment & Officer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Bureau / Cell *
              </label>
              <select
                value={createForm.bureauId}
                onChange={(e) => {
                  const bId = e.target.value
                  const bObj = MOCK_BUREAUS.find((b) => b.id === bId)
                  setCreateForm((prev) => ({
                    ...prev,
                    bureauId: bId,
                    assignedOfficer: bObj ? bObj.lead : 'Bureau In-Charge',
                  }))
                }}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none"
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
                Assigned Lead Officer
              </label>
              <input
                type="text"
                value={createForm.assignedOfficer}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, assignedOfficer: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* 6. Dates & Supporting Document */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Received Date *
              </label>
              <input
                type="date"
                required
                value={createForm.receivedDate}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, receivedDate: e.target.value }))}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Expected Disposal Date *
              </label>
              <input
                type="date"
                required
                value={createForm.expectedDisposalDate}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, expectedDisposalDate: e.target.value }))}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Supporting Document Ref
              </label>
              <input
                type="text"
                placeholder="e.g. Fee_Receipt_Signed.pdf"
                value={createForm.supportingDocumentRef}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, supportingDocumentRef: e.target.value }))}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
              />
            </div>
          </div>
        </form>
      </Dialog>

      {/* ========================================== */}
      {/* D. CASE DETAILS DOSSIER & FORMS MODAL */}
      {/* ========================================== */}
      <Dialog
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        title={`Grievance Dossier: ${selectedCase?.id}`}
        type="info"
        size="lg"
        confirmText="Done"
        cancelText="Close"
        onConfirm={() => setIsDossierOpen(false)}
      >
        {selectedCase && (
          <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* Dossier Navigation Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveDossierTab('overview')}
                className={`py-2 px-3 font-semibold text-xs border-b-2 transition ${
                  activeDossierTab === 'overview'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Case Overview & Evidence
              </button>
              <button
                type="button"
                onClick={() => setActiveDossierTab('actions')}
                className={`py-2 px-3 font-semibold text-xs border-b-2 transition ${
                  activeDossierTab === 'actions'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Action Trail & Escalations ({selectedCase.actionHistory?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveDossierTab('updates')}
                className={`py-2 px-3 font-semibold text-xs border-b-2 transition ${
                  activeDossierTab === 'updates'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Regulatory Directives & Status Forms
              </button>
            </div>

            {/* TAB 1: OVERVIEW & EVIDENCE */}
            {activeDossierTab === 'overview' && (
              <div className="space-y-3.5">
                {/* Subject & Status */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Category: {selectedCase.category}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 mt-0.5">{selectedCase.subject}</h4>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant={selectedCase.priority}>{selectedCase.priority}</Badge>
                      <Badge variant={selectedCase.status}>{selectedCase.status}</Badge>
                    </div>
                  </div>

                  <p className="text-slate-700 leading-relaxed bg-white p-2.5 rounded border border-slate-200 text-xs">
                    {selectedCase.description || 'No detailed statement provided.'}
                  </p>
                </div>

                {/* Overlap Indicator Warning Banner if active */}
                {selectedCase.hasOverlap && (
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg flex items-start gap-2.5">
                    <AlertOctagon className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-rose-900 block text-xs">
                        Cross-Bureau Overlap Conflict: Linked Case {selectedCase.overlapCaseId}
                      </span>
                      <p className="text-rose-800 text-[11px] leading-normal">{selectedCase.overlapSummary}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDossierOpen(false)
                          onNavigateTab('overlap')
                        }}
                        className="text-blue-700 font-semibold underline text-[11px] pt-1 block"
                      >
                        Inspect in Cross-Bureau Overlap Matrix →
                      </button>
                    </div>
                  </div>
                )}

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-white rounded-lg border border-slate-200 text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Institution</span>
                    <span className="font-semibold block truncate">{selectedCase.institutionName}</span>
                    <span className="text-[10px] font-mono text-slate-400">PID: {selectedCase.institutionPid}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Complainant</span>
                    <span className="font-semibold">{selectedCase.complainantName}</span>
                    <span className="text-[10px] text-slate-500 block">{selectedCase.complainantType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Bureau</span>
                    <span className="font-semibold">{selectedCase.bureauName}</span>
                    <span className="text-[10px] text-blue-700 font-medium block">Lead: {selectedCase.assignedOfficer}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Received Date</span>
                    <span className="font-mono">{selectedCase.receivedDate || selectedCase.submissionDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Expected Disposal (SLA)</span>
                    <span className={`font-mono font-bold ${selectedCase.isOverdue ? 'text-rose-700' : 'text-slate-800'}`}>
                      {selectedCase.expectedDisposalDate || selectedCase.slaDeadline}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Next Action Window</span>
                    <span className="font-mono text-amber-800 font-semibold">{selectedCase.nextActionDueDate || 'Scheduled'}</span>
                  </div>
                </div>

                {/* Next Action Required */}
                <div className="p-3 bg-amber-500/10 border border-amber-200 rounded-lg space-y-1">
                  <span className="font-bold text-amber-950 uppercase tracking-wider text-[10px] block">
                    Mandatory Next Action Required
                  </span>
                  <p className="text-amber-900 leading-normal font-medium">
                    {selectedCase.nextActionRequired || 'Awaiting formal hearing schedule.'}
                  </p>
                </div>

                {/* Supporting Documents */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
                    Verified Supporting Documents ({selectedCase.supportingDocuments?.length || 0})
                  </span>
                  {(!selectedCase.supportingDocuments || selectedCase.supportingDocuments.length === 0) ? (
                    <p className="text-slate-400 italic">No document attachments uploaded.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedCase.supportingDocuments.map((doc) => (
                        <div key={doc.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <Paperclip className="h-4 w-4 text-blue-600 shrink-0" />
                            <div className="truncate">
                              <span className="font-semibold text-slate-800 block truncate">{doc.name}</span>
                              <span className="text-[10px] text-slate-400">{doc.size} • Uploaded {doc.uploadDate}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              addToast({
                                title: 'Document Downloaded',
                                message: `Accessing verified evidentiary copy: ${doc.name}`,
                                type: 'info',
                              })
                            }}
                            className="p-1 text-slate-500 hover:text-blue-700"
                            title="Download document copy"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: ACTION HISTORY & TRANSFER ESCALATIONS */}
            {activeDossierTab === 'actions' && (
              <div className="space-y-4">
                {/* Transfer & Escalation History */}
                {selectedCase.transferEscalationHistory && selectedCase.transferEscalationHistory.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-bold text-rose-900 uppercase tracking-wider text-[11px] block flex items-center gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5 text-rose-700" />
                      <span>Jurisdictional Transfer & Escalation Log</span>
                    </span>
                    <div className="space-y-2">
                      {selectedCase.transferEscalationHistory.map((esc) => (
                        <div key={esc.id} className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1">
                          <div className="flex items-center justify-between font-mono text-[10px]">
                            <span className="font-bold text-rose-900">{esc.id} • {esc.date}</span>
                            <span className="text-slate-500">Auth: {esc.authorizedBy}</span>
                          </div>
                          <p className="text-rose-800">
                            <strong>From:</strong> {esc.from} <strong>→ To:</strong> {esc.to}
                          </p>
                          <p className="text-slate-600 text-[11px]">{esc.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chronological Action Trail */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-blue-700" />
                    <span>Chronological Action Trail ({selectedCase.actionHistory?.length || 0})</span>
                  </span>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white overflow-hidden">
                    {selectedCase.actionHistory?.map((act) => (
                      <div key={act.id} className="p-3 space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{act.officer}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({act.role})</span>
                            <span className="text-[10px] font-semibold bg-blue-50 text-blue-800 px-1.5 py-0.2 rounded border border-blue-200">
                              {act.action}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{act.date}</span>
                        </div>
                        <p className="text-slate-600 text-[11px] font-mono leading-relaxed pl-1 border-l-2 border-slate-200">
                          {act.remarks}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: UPDATE STATUS, ASSIGNMENT & REMARK FORMS */}
            {activeDossierTab === 'updates' && (
              <div className="space-y-4">
                {/* Form A: Update Lifecycle Status */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2.5">
                  <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <FileEdit className="h-3.5 w-3.5 text-blue-700" />
                    <span>1. Update Grievance Lifecycle Status</span>
                  </h5>
                  <form onSubmit={handleStatusSubmit} className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-0.5">
                          New Status Target
                        </label>
                        <select
                          value={statusUpdateForm.status}
                          onChange={(e) => setStatusUpdateForm((prev) => ({ ...prev, status: e.target.value }))}
                          className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none"
                        >
                          {MOCK_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-0.5">
                          Official Reason / Justification
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Compliance verified by Western Regional Office..."
                          value={statusUpdateForm.remarks}
                          onChange={(e) => setStatusUpdateForm((prev) => ({ ...prev, remarks: e.target.value }))}
                          className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button variant="primary" size="sm" type="submit" isLoading={isUpdatingStatus}>
                        Commit Status Change
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Form B: Reconfigure Bureau & Lead Officer Assignment */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2.5">
                  <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-indigo-700" />
                    <span>2. Reconfigure Bureau & Lead Officer Assignment</span>
                  </h5>
                  <form onSubmit={handleAssignmentSubmit} className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-0.5">
                          Assigned Bureau / Cell
                        </label>
                        <select
                          value={assignmentForm.bureauId}
                          onChange={(e) => {
                            const bId = e.target.value
                            const found = MOCK_BUREAUS.find((b) => b.id === bId)
                            setAssignmentForm((prev) => ({
                              ...prev,
                              bureauId: bId,
                              assignedOfficer: found ? found.lead : prev.assignedOfficer,
                            }))
                          }}
                          className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none"
                        >
                          {MOCK_BUREAUS.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.code} - {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-0.5">
                          Assigned Case Officer
                        </label>
                        <input
                          type="text"
                          value={assignmentForm.assignedOfficer}
                          onChange={(e) => setAssignmentForm((prev) => ({ ...prev, assignedOfficer: e.target.value }))}
                          className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button variant="outline" size="sm" type="submit" isLoading={isUpdatingAssignment}>
                        Reassign Case
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Form C: Update Next Action Required */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2.5">
                  <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-amber-700" />
                    <span>3. Schedule Next Regulatory Directive</span>
                  </h5>
                  <form onSubmit={handleNextActionSubmit} className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-0.5">
                          Next Action Directive
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Schedule personal appearance before Standing Appellate Committee..."
                          value={nextActionForm.nextActionRequired}
                          onChange={(e) => setNextActionForm((prev) => ({ ...prev, nextActionRequired: e.target.value }))}
                          className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-0.5">
                          Directive Due Date
                        </label>
                        <input
                          type="date"
                          value={nextActionForm.nextActionDueDate}
                          onChange={(e) => setNextActionForm((prev) => ({ ...prev, nextActionDueDate: e.target.value }))}
                          className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button variant="outline" size="sm" type="submit" isLoading={isUpdatingNextAction}>
                        Schedule Directive
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Form D: Append Official Supervisory Remark */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2.5">
                  <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-emerald-700" />
                    <span>4. Log Official Remark in Action Trail</span>
                  </h5>
                  <form onSubmit={handleRemarkSubmit} className="space-y-2">
                    <textarea
                      rows={2}
                      required
                      placeholder="Add an immutable official note or hearing remark into the case ledger..."
                      value={remarkForm.remark}
                      onChange={(e) => setRemarkForm((prev) => ({ ...prev, remark: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
                    />

                    <div className="flex justify-end pt-1">
                      <Button variant="primary" size="sm" type="submit" isLoading={isAppendingRemark}>
                        Append to Audit Trail
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  )
}
