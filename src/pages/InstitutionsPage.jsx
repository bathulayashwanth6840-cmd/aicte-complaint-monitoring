import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Building2,
  Search,
  Filter,
  Plus,
  ExternalLink,
  ShieldAlert,
  Phone,
  Mail,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Eye,
  MapPin,
  Calendar,
  UserCheck,
  Check,
} from 'lucide-react'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { DataTable } from '../components/ui/DataTable'
import { Dialog } from '../components/ui/Dialog'
import { Pagination } from '../components/ui/Pagination'
import { EmptyState, ErrorState } from '../components/ui/StateView'
import { useToast } from '../context/ToastContext'

// Data Service
import * as dataService from '../services/dashboardService'
import { MOCK_REGIONS } from '../data/mockAicteData'

export function InstitutionsPage({ onNavigateTab }) {
  const { addToast } = useToast()

  // Table & Filter States
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(6)

  // Data State
  const [institutions, setInstitutions] = useState([])
  const [totalItems, setTotalItems] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Institution Detail Drawer / Modal
  const [selectedInst, setSelectedInst] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [linkedComplaints, setLinkedComplaints] = useState([])
  const [isLoadingComplaints, setIsLoadingComplaints] = useState(false)

  // Registration Form Modal
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [regForm, setRegForm] = useState({
    pid: '',
    name: '',
    region: 'Western',
    state: '',
    district: '',
    address: '',
    type: 'Private-Self Financing',
    establishedYear: '2015',
    nodalName: '',
    nodalDesignation: 'Registrar',
    nodalEmail: '',
    nodalPhone: '',
  })
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch Institutions from Service
  const fetchInstitutions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await dataService.getInstitutions({
        search,
        region: regionFilter,
        sortBy,
        sortDir,
        page: currentPage,
        pageSize,
      })
      setInstitutions(res.data)
      setTotalItems(res.total)
    } catch (err) {
      setError('Unable to load technical institution directory from central repository.')
    } finally {
      setIsLoading(false)
    }
  }, [search, regionFilter, sortBy, sortDir, currentPage, pageSize])

  useEffect(() => {
    fetchInstitutions()
  }, [fetchInstitutions])

  // Handle Sort Toggle
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
    setCurrentPage(1)
  }

  // Open Detail Modal & Fetch Linked Complaints
  const handleOpenDetail = async (inst) => {
    setSelectedInst(inst)
    setIsDetailModalOpen(true)
    setIsLoadingComplaints(true)
    try {
      const complaints = await dataService.getInstitutionComplaints(inst.pid)
      setLinkedComplaints(complaints)
    } catch {
      setLinkedComplaints([])
    } finally {
      setIsLoadingComplaints(false)
    }
  }

  // Form Validation
  const validateForm = () => {
    const errs = {}
    if (!regForm.pid.trim()) {
      errs.pid = 'AICTE Permanent Institute ID (PID) is required.'
    } else if (!/^1-\d{7,10}$/.test(regForm.pid.trim())) {
      errs.pid = 'Format must be AICTE PID standard: e.g. 1-43289011'
    }

    if (!regForm.name.trim()) errs.name = 'Institution name is required.'
    if (!regForm.state.trim()) errs.state = 'State is required.'
    if (!regForm.district.trim()) errs.district = 'District is required.'
    if (!regForm.nodalName.trim()) errs.nodalName = 'Designated nodal officer name is required.'

    if (!regForm.nodalEmail.trim()) {
      errs.nodalEmail = 'Official contact email is required.'
    } else if (!/\S+@\S+\.\S+/.test(regForm.nodalEmail)) {
      errs.nodalEmail = 'Invalid email address.'
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Submit Institution Registration Form
  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const created = await dataService.createInstitution(regForm)
      setIsRegisterModalOpen(false)
      setRegForm({
        pid: '',
        name: '',
        region: 'Western',
        state: '',
        district: '',
        address: '',
        type: 'Private-Self Financing',
        establishedYear: '2015',
        nodalName: '',
        nodalDesignation: 'Registrar',
        nodalEmail: '',
        nodalPhone: '',
      })
      setFormErrors({})
      addToast({
        title: 'Institution Registered Successfully',
        message: `${created.name} (${created.pid}) assigned Internal ID: ${created.internalId}.`,
        type: 'success',
      })
      fetchInstitutions()
    } catch {
      addToast({
        title: 'Registration Failed',
        message: 'Could not record institution in central database.',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Data Columns
  const columns = [
    {
      header: 'Internal ID',
      accessorKey: 'internalId',
      width: '130px',
      sortable: true,
      sortKey: 'internalId',
      cell: (row) => (
        <span className="font-mono font-semibold text-slate-800 text-xs">
          {row.internalId}
        </span>
      ),
    },
    {
      header: 'AICTE Permanent ID',
      accessorKey: 'pid',
      width: '140px',
      sortable: true,
      sortKey: 'pid',
      cell: (row) => (
        <span className="font-mono font-bold text-blue-700 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          {row.pid}
        </span>
      ),
    },
    {
      header: 'Institution Name',
      accessorKey: 'name',
      sortable: true,
      sortKey: 'name',
      cell: (row) => (
        <div className="space-y-0.5 max-w-sm">
          <span className="font-bold text-slate-900 block truncate" title={row.name}>
            {row.name}
          </span>
          <span className="text-[11px] text-slate-500 block truncate">
            {row.type} • Estd. {row.establishedYear}
          </span>
        </div>
      ),
    },
    {
      header: 'Region',
      accessorKey: 'region',
      sortable: true,
      sortKey: 'region',
      cell: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {row.region}
        </span>
      ),
    },
    {
      header: 'Address',
      accessorKey: 'address',
      cell: (row) => (
        <div className="max-w-xs text-xs text-slate-600 truncate" title={row.address}>
          <span className="font-medium text-slate-800">{row.district}, {row.state}</span>
          <span className="block text-[11px] text-slate-400 truncate">{row.address}</span>
        </div>
      ),
    },
    {
      header: 'Total Cases',
      accessorKey: 'totalCases',
      align: 'center',
      sortable: true,
      sortKey: 'totalCases',
      cell: (row) => (
        <span className="font-bold text-slate-800 text-xs font-mono">{row.totalCases}</span>
      ),
    },
    {
      header: 'Open Cases',
      accessorKey: 'openCases',
      align: 'center',
      sortable: true,
      sortKey: 'openCases',
      cell: (row) => (
        <div className="flex flex-col items-center">
          <span className={`font-bold text-xs font-mono ${row.openCases > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
            {row.openCases}
          </span>
          {row.overlapCount > 0 && (
            <span className="text-[9px] font-bold text-rose-800 bg-rose-50 px-1 rounded border border-rose-200 mt-0.5">
              {row.overlapCount} Overlaps
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessorKey: 'actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            icon={Eye}
            onClick={() => handleOpenDetail(row)}
            title="Inspect complete institutional profile & grievance history"
          >
            Details
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTab('complaints', { institution: row.pid })}
            title="View filtered grievances in Complaints Ledger"
            className="text-blue-700 font-semibold"
          >
            Cases
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Official Breadcrumb Header */}
      <Breadcrumb
        title="Institution Registry & Affiliation Directory"
        subtitle="National directory of technical institutions, verified AICTE Permanent IDs (PID), and linked compliance records."
        items={[{ label: 'Dashboard', onClick: () => onNavigateTab('dashboard') }, { label: 'Institutions' }]}
        badge={
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 font-semibold text-xs border border-blue-200">
            {totalItems} Institutions Monitored
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              isLoading={isLoading}
              onClick={fetchInstitutions}
            >
              Refresh
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setIsRegisterModalOpen(true)}
            >
              Register Institution
            </Button>
          </div>
        }
      />

      {/* Synthetic Dataset Demonstration Notice */}
      <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
          <span>
            <strong>Synthetic Institutional Records Notice:</strong> Permanent Institute IDs (e.g., <code>1-43289011</code>) and internal registry keys are mock representations prepared for hackathon evaluation.
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500 shrink-0">
          Statutory Directory v2.4
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <Input
              isSearch
              placeholder="Search by Institution Name, Permanent ID (PID), Internal ID, Address, or State..."
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

          <Select
            value={regionFilter}
            onChange={(e) => {
              setRegionFilter(e.target.value)
              setCurrentPage(1)
            }}
            options={[
              { value: 'ALL', label: 'All AICTE Regions' },
              ...MOCK_REGIONS.map((r) => ({ value: r, label: `${r} Region` })),
            ]}
          />
        </div>

        {/* Quick Region Pills & Results Count */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 text-xs gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-medium">Quick Region:</span>
            {['Western', 'North Western', 'South Western', 'South Central', 'Eastern'].map((reg) => (
              <button
                key={reg}
                type="button"
                onClick={() => {
                  setRegionFilter(reg === regionFilter ? 'ALL' : reg)
                  setCurrentPage(1)
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition ${
                  regionFilter === reg
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {reg}
              </button>
            ))}
          </div>

          <span className="text-slate-500 font-medium">
            Showing <strong>{institutions.length}</strong> of {totalItems} colleges
          </span>
        </div>
      </div>

      {/* Main Institution Table */}
      {error ? (
        <ErrorState
          title="Registry Service Error"
          message={error}
          onRetry={fetchInstitutions}
          isRetrying={isLoading}
        />
      ) : (
        <DataTable
          columns={columns}
          data={institutions}
          keyField="pid"
          isLoading={isLoading}
          emptyMessage="No institutional records match your search or region criteria."
          pagination={{
            currentPage,
            totalItems,
            pageSize,
            onPageChange: setCurrentPage,
            onPageSizeChange: (newSize) => {
              setPageSize(newSize)
              setCurrentPage(1)
            },
          }}
        />
      )}

      {/* INSTITUTION DETAIL PAGE / MODAL */}
      <Dialog
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Institutional Profile: ${selectedInst?.name}`}
        type="info"
        size="lg"
        confirmText="Docket New Grievance for this College"
        cancelText="Close Profile"
        onConfirm={() => {
          setIsDetailModalOpen(false)
          onNavigateTab('complaints', { institution: selectedInst?.pid })
        }}
      >
        {selectedInst && (
          <div className="space-y-4 text-xs">
            {/* College Overview Panel */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedInst.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      AICTE Permanent ID: {selectedInst.pid}
                    </span>
                    <span className="font-mono text-slate-600 font-semibold bg-slate-200/80 px-2 py-0.5 rounded">
                      Internal Key: {selectedInst.internalId}
                    </span>
                  </div>
                </div>

                <Badge variant={selectedInst.status === 'Approved' ? 'success' : 'danger'}>
                  {selectedInst.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Region</span>
                  <span className="font-semibold">{selectedInst.region}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">State & District</span>
                  <span className="font-semibold">{selectedInst.district}, {selectedInst.state}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Category</span>
                  <span className="font-semibold">{selectedInst.type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Established</span>
                  <span className="font-semibold">{selectedInst.establishedYear}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-start gap-1.5 text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{selectedInst.address}</span>
              </div>
            </div>

            {/* Designated Nodal Officer Information */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-1.5">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-blue-700" />
                <span>Institutional Nodal Grievance Officer (Mandatory Liaison)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-700 pt-1">
                <div>
                  <span className="text-slate-400 text-[10px] block">Name & Designation</span>
                  <span className="font-semibold text-slate-900">{selectedInst.nodalOfficer.name}</span>
                  <span className="block text-[11px] text-slate-500">{selectedInst.nodalOfficer.designation}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Official Email</span>
                  <span className="flex items-center gap-1 font-mono text-slate-800 text-[11px]">
                    <Mail className="h-3 w-3 text-slate-400" /> {selectedInst.nodalOfficer.email}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Emergency Phone</span>
                  <span className="flex items-center gap-1 font-mono text-slate-800 text-[11px]">
                    <Phone className="h-3 w-3 text-slate-400" /> {selectedInst.nodalOfficer.phone}
                  </span>
                </div>
              </div>
            </div>

            {/* Complete Linked Complaint History */}
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Complete Linked Complaint History ({linkedComplaints.length})
                </h4>
                {selectedInst.overlapCount > 0 && (
                  <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    {selectedInst.overlapCount} Multi-Bureau Conflicts Recorded
                  </span>
                )}
              </div>

              {isLoadingComplaints ? (
                <div className="p-6 text-center text-slate-400">Loading complaint ledger...</div>
              ) : linkedComplaints.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center text-slate-500 mt-2">
                  No grievances on record for this technical institution.
                </div>
              ) : (
                <div className="space-y-2 mt-2 max-h-56 overflow-y-auto">
                  {linkedComplaints.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between gap-2 hover:bg-slate-100/70 transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700">{c.id}</span>
                          <Badge variant={c.bureauId} size="sm">{c.bureauId}</Badge>
                          <Badge variant={c.priority} size="sm">{c.priority}</Badge>
                          {c.isOverdue && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1 rounded">
                              Overdue
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-slate-800">{c.subject}</p>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>Received: {c.receivedDate || c.submissionDate}</span>
                          <span>•</span>
                          <span>Officer: {c.assignedOfficer}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <Badge variant={c.status}>{c.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* INSTITUTION REGISTRATION FORM MODAL */}
      <Dialog
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register New Technical Institution"
        type="info"
        size="lg"
        confirmText="Register Institution"
        cancelText="Cancel"
        onConfirm={handleRegisterSubmit}
        isLoading={isSubmitting}
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
          <p className="text-slate-500 text-[11px]">
            Enroll a new technical institution into the central AICTE registry. All fields marked with * are mandatory under central regulatory norms.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                AICTE Permanent ID (PID) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 1-98723412"
                value={regForm.pid}
                onChange={(e) => setRegForm((prev) => ({ ...prev, pid: e.target.value }))}
                className={`w-full p-2.5 rounded-lg border text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                  formErrors.pid
                    ? 'border-rose-400 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:ring-blue-600/20 focus:border-blue-600'
                }`}
              />
              {formErrors.pid && <p className="text-rose-600 text-[11px] mt-1">{formErrors.pid}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Institution Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Pune Institute of Advanced Technology"
                value={regForm.name}
                onChange={(e) => setRegForm((prev) => ({ ...prev, name: e.target.value }))}
                className={`w-full p-2.5 rounded-lg border text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                  formErrors.name
                    ? 'border-rose-400 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:ring-blue-600/20 focus:border-blue-600'
                }`}
              />
              {formErrors.name && <p className="text-rose-600 text-[11px] mt-1">{formErrors.name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                AICTE Region *
              </label>
              <select
                value={regForm.region}
                onChange={(e) => setRegForm((prev) => ({ ...prev, region: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                {MOCK_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                State *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Maharashtra"
                value={regForm.state}
                onChange={(e) => setRegForm((prev) => ({ ...prev, state: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
              />
              {formErrors.state && <p className="text-rose-600 text-[11px] mt-1">{formErrors.state}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                District *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Pune"
                value={regForm.district}
                onChange={(e) => setRegForm((prev) => ({ ...prev, district: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
              />
              {formErrors.district && <p className="text-rose-600 text-[11px] mt-1">{formErrors.district}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Campus Street Address
            </label>
            <input
              type="text"
              placeholder="e.g. Gate No. 23, Knowledge City Road, Hinjawadi, Pune 411057"
              value={regForm.address}
              onChange={(e) => setRegForm((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
            />
          </div>

          <div className="pt-2 border-t border-slate-200">
            <span className="block font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
              Institutional Nodal Grievance Officer (Designated Contact)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Nodal Officer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={regForm.nodalName}
                  onChange={(e) => setRegForm((prev) => ({ ...prev, nodalName: e.target.value }))}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
                />
                {formErrors.nodalName && <p className="text-rose-600 text-[11px] mt-1">{formErrors.nodalName}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Nodal Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="nodal@college.edu.in"
                  value={regForm.nodalEmail}
                  onChange={(e) => setRegForm((prev) => ({ ...prev, nodalEmail: e.target.value }))}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
                />
                {formErrors.nodalEmail && <p className="text-rose-600 text-[11px] mt-1">{formErrors.nodalEmail}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Nodal Phone
                </label>
                <input
                  type="tel"
                  placeholder="+91 98200 11223"
                  value={regForm.nodalPhone}
                  onChange={(e) => setRegForm((prev) => ({ ...prev, nodalPhone: e.target.value }))}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
