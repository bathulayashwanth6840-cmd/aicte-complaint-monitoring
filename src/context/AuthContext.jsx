import React, { createContext, useContext, useState } from 'react'
import { MOCK_USERS } from '../data/mockAicteData'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Default to Central Administrator (AICTE HQ)
  const [currentUser, setCurrentUser] = useState(MOCK_USERS[0])

  const switchUser = (userId) => {
    const found = MOCK_USERS.find((u) => u.id === userId)
    if (found) {
      setCurrentUser(found)
    }
  }

  // Helper getters for permissions
  const isAdmin = currentUser.role === 'Central Administrator'
  const isBureauOfficer = currentUser.role === 'Bureau Officer' || currentUser.role === 'Regional Officer'
  const isNodalOfficer = currentUser.role === 'Institution Nodal Officer'

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        switchUser,
        availableUsers: MOCK_USERS,
        isAdmin,
        isBureauOfficer,
        isNodalOfficer,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
