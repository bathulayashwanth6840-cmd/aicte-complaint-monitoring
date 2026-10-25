import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  UserCheck,
  Shield,
  Search,
  Plus,
  Mail,
  Building,
  CheckCircle2,
} from 'lucide-react'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { DataTable } from '../components/ui/DataTable'
import { Dialog } from '../components/ui/Dialog'
import { StateView } from '../components/ui/StateView'
import { useToast } from '../context/ToastContext'
import * as dataService from '../services/dashboardService'
import { api } from '../services/apiClient'

export function UserManagementPage({ onNavigateTab }) {
  const { addToast } = useToast()
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState('Bureau Officer')
  const [newUserBureau, setNewUserBureau] = useState('Public Grievance Redressal Cell (PGRC)')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const list = await dataService.getUsers()
      setUsers(list)
    } catch (err) {
      setError(err.message || 'Unable to retrieve user registry.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term)) ||
      (u.bureau && u.bureau.toLowerCase().includes(term))
    )
  })

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      addToast({
        title: 'Validation Error',
        message: 'Name and official email are required.',
        type: 'warning',
      })
      return
    }

    setIsSubmitting(true)
    try {
      if (dataService.isDemoMode()) {
        const newUser = {
          id: `USR-${String(users.length + 1).padStart(3, '0')}`,
          name: newUserName,
          email: newUserEmail,
          role: newUserRole,
          bureau: newUserBureau,
          status: 'Active',
          lastLogin: 'Never',
        }
        setUsers([newUser, ...users])
      } else {
        await api.createUser({
          name: newUserName.trim(),
          login_identifier: newUserEmail.trim(),
          password: 'InitialPassword@2026',
          role: newUserRole,
          active_status: true,
        })
        await fetchUsers()
      }

      setIsAddUserOpen(false)
      setNewUserName('')
      setNewUserEmail('')
      addToast({
        title: 'User Registered Successfully',
        message: `${newUserName} provisioned with role: ${newUserRole}.`,
        type: 'success',
      })
    } catch (err) {
      addToast({
        title: 'Registration Failed',
        message: err.message || 'Could not register user record.',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    {
      header: 'Officer / Liaison Name',
      accessorKey: 'name',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
            {row.name
              .split(' ')
              .map((p) => p[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')}
          </div>
          <div>
            <span className="font-semibold text-slate-900 block">{row.name}</span>
            <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
              <Mail className="h-3 w-3 text-slate-400" />
              {row.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'System Role',
      accessorKey: 'role',
      cell: (row) => (
        <Badge
          variant={
            row.role === 'Central Administrator'
              ? 'danger'
              : row.role === 'Bureau Officer'
              ? 'primary'
              : 'default'
          }
        >
          {row.role}
        </Badge>
      ),
    },
    {
      header: 'Bureau / Cell Assignment',
      accessorKey: 'bureau',
      cell: (row) => (
        <span className="text-xs text-slate-700 font-medium block">
          {row.bureau}
        </span>
      ),
    },
    {
      header: 'Account Status',
      accessorKey: 'status',
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {row.status}
        </span>
      ),
    },
    {
      header: 'Last Active',
      accessorKey: 'lastLogin',
      align: 'right',
      cell: (row) => (
        <span className="text-xs text-slate-500 font-mono">{row.lastLogin}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Breadcrumb
        title="Role-Based Access Control (RBAC) & Officer Directory"
        subtitle="Manage credentials, bureau assignments, and operational permissions for AICTE grievance administrators."
        items={[{ label: 'Dashboard', onClick: () => onNavigateTab('dashboard') }, { label: 'User Directory' }]}
        badge={
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 font-bold text-xs border border-blue-200">
            {users.length} Active System Accounts
          </span>
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsAddUserOpen(true)}
          >
            Provision System Officer
          </Button>
        }
      />

      {/* Search Input */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
        <Input
          isSearch
          placeholder="Search by officer name, official email, or bureau..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
        />
      </div>

      {/* Main Table */}
      {isLoading ? (
        <StateView type="loading" title="Loading Officer Directory..." message="Retrieving credentials and role bindings." />
      ) : error ? (
        <StateView
          type="error"
          title="Directory Unavailable"
          message={error}
          action={<Button variant="outline" size="sm" onClick={fetchUsers}>Retry</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredUsers}
          keyField="id"
          emptyMessage="No officer accounts matched your query."
        />
      )}

      {/* Add User Dialog */}
      <Dialog
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Provision AICTE Officer Account"
        type="default"
        confirmText="Provision Account"
        cancelText="Cancel"
        onConfirm={handleCreateUser}
        isLoading={isSubmitting}
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Official Name
            </label>
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="e.g. Prof. Rajesh Mehra"
              className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Official Email (@aicte-india.org / .gov.in)
            </label>
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="e.g. r.mehra@aicte-india.org"
              className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Designated Role
              </label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none"
              >
                <option value="Central Administrator">Central Administrator</option>
                <option value="Bureau Officer">Bureau Officer</option>
                <option value="Regional Officer">Regional Officer</option>
                <option value="Institution Nodal Officer">Institution Nodal Officer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Bureau / Cell
              </label>
              <select
                value={newUserBureau}
                onChange={(e) => setNewUserBureau(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none"
              >
                <option value="Public Grievance Redressal Cell (PGRC)">PGRC Cell</option>
                <option value="Regulation Bureau (RB)">Regulation Bureau (RB)</option>
                <option value="Approval Bureau (AB)">Approval Bureau (AB)</option>
                <option value="Policy & Academic Planning Bureau (PAB)">Policy Bureau (PAB)</option>
                <option value="AICTE Central HQ">AICTE Central HQ</option>
              </select>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
