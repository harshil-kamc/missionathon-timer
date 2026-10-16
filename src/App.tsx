import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import AdminWindow from './components/AdminWindow'
import './styles.css'

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname
    }
    return '/'
  })

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Routing: /admin, /customization, /authorization, /admin/login route to the standalone Admin Window
  const isAdminRoute =
    currentPath.startsWith('/admin') ||
    currentPath.startsWith('/customization') ||
    currentPath.startsWith('/authorization')

  if (isAdminRoute) {
    return <AdminWindow onNavigateToHome={() => {
      window.history.pushState({}, '', '/')
      setCurrentPath('/')
    }} />
  }

  return <Dashboard />
}
