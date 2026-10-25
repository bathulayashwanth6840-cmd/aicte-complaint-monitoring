import React, { useState } from 'react'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import { AppShell } from './components/layout/AppShell'

// Individual Page Components
import { DashboardPage } from './pages/DashboardPage'
import { InstitutionsPage } from './pages/InstitutionsPage'
import { ComplaintsPage } from './pages/ComplaintsPage'
import { OverlapAlertsPage } from './pages/OverlapAlertsPage'
import { ActionHistoryPage } from './pages/ActionHistoryPage'
import { ReportsPage } from './pages/ReportsPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { UserManagementPage } from './pages/UserManagementPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [complaintInitialFilter, setComplaintInitialFilter] = useState(null)

  const handleNavigateTab = (tabId, filterParams = null) => {
    setActiveTab(tabId)
    if (tabId === 'complaints') {
      setComplaintInitialFilter(filterParams)
    }
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigateTab={handleNavigateTab} />
      case 'institutions':
        return <InstitutionsPage onNavigateTab={handleNavigateTab} />
      case 'complaints':
        return (
          <ComplaintsPage
            onNavigateTab={handleNavigateTab}
            initialFilter={complaintInitialFilter}
          />
        )
      case 'overlap':
        return <OverlapAlertsPage onNavigateTab={handleNavigateTab} />
      case 'action-history':
        return <ActionHistoryPage onNavigateTab={handleNavigateTab} />
      case 'reports':
        return <ReportsPage onNavigateTab={handleNavigateTab} />
      case 'notifications':
        return <NotificationsPage onNavigateTab={handleNavigateTab} />
      case 'users':
        return <UserManagementPage onNavigateTab={handleNavigateTab} />
      case 'settings':
        return <SettingsPage onNavigateTab={handleNavigateTab} />
      default:
        return <DashboardPage onNavigateTab={handleNavigateTab} />
    }
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <AppShell
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        >
          {renderActivePage()}
        </AppShell>
      </ToastProvider>
    </AuthProvider>
  )
}
