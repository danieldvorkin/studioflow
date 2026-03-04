/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@apollo/client'
import { STUDIOS } from '../apollo/queries'
import { useAuth } from '../auth/AuthProvider'

const StudioContext = createContext({
  studios: [],
  selectedStudioId: null,
  setSelectedStudioId: () => {},
  loading: false,
})

const STORAGE_KEY = 'pilates_selected_studio_id'
const EMPTY = []

export function useStudio() {
  return useContext(StudioContext)
}

export function StudioProvider({ children }) {
  const { user } = useAuth()
  const role = (user?.roleName || '').toString().toLowerCase()
  const isClient = role === 'client' || user?.role === 3 || user?.role === 'client'
  const isGodmode = user?.godmode === true || role === 'godmode'

  const { data, loading } = useQuery(STUDIOS, {
    skip: !user || (!isClient && !isGodmode),
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  })

  const studios = data?.studios || EMPTY

  const [selectedStudioId, setSelectedStudioIdState] = useState(() => {
    if (typeof window === 'undefined') return null
    try {
      return window.localStorage.getItem(STORAGE_KEY) || null
    } catch {
      return null
    }
  })

  // If role changes away from client/godmode, clear selection.
  useEffect(() => {
    if (isClient || isGodmode) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedStudioIdState(null)
  }, [isClient, isGodmode])

  // Choose a default studio for clients if none selected.
  // Godmode intentionally starts at null ("All studios") and only picks one when the user explicitly chooses.
  useEffect(() => {
    if (!isClient) return
    if (loading) return
    if (!studios.length) return

    if (selectedStudioId && studios.some((s) => s.id === selectedStudioId)) return

    const first = studios[0]
    if (!first?.id) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedStudioIdState(first.id)
    try {
      window.localStorage.setItem(STORAGE_KEY, first.id)
    } catch {
      // ignore
    }
  }, [isClient, loading, studios, selectedStudioId])

  const setSelectedStudioId = (id) => {
    const next = id || null
    setSelectedStudioIdState(next)
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, next)
      else window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  const value = useMemo(() => ({
    studios,
    selectedStudioId,
    setSelectedStudioId,
    loading,
  }), [studios, selectedStudioId, loading])

  return (
    <StudioContext.Provider value={value}>
      {children}
    </StudioContext.Provider>
  )
}
