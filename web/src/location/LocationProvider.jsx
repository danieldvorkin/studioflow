/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { useQuery } from '@apollo/client'
import { STUDIO_LOCATIONS } from '../apollo/queries'
import { useStudio } from '../studio/StudioProvider'
import { useAuth } from '../auth/AuthProvider'

const LocationContext = createContext(null)
const EMPTY_LOCATIONS = []

export function useLocationContext() {
  return useContext(LocationContext)
}

export function LocationProvider({ children }) {
  const { user } = useAuth()
  const role = (user?.roleName || '').toString().toLowerCase()
  const isClient = role === 'client'
  const { selectedStudioId } = useStudio()

  const storageKey = isClient && selectedStudioId ? `pilates_location_id_${selectedStudioId}` : 'pilates_location_id'

  const { data, loading } = useQuery(STUDIO_LOCATIONS, {
    variables: isClient ? { studioId: selectedStudioId } : undefined,
    skip: isClient && !selectedStudioId,
  })
  const locations = data?.studioLocations || EMPTY_LOCATIONS

  const [, setStorageTick] = useState(0)

  let storedLocationId = null
  if (typeof window !== 'undefined') {
    try {
      storedLocationId = window.localStorage.getItem(storageKey) || null
    } catch {
      storedLocationId = null
    }
  }

  const locationId = !locations.length
    ? storedLocationId
    : (storedLocationId && locations.some((l) => l.id === storedLocationId))
        ? storedLocationId
        : (locations[0]?.id || null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!locations.length) return
    const first = locations[0]
    if (!first?.id) return

    if (!storedLocationId || !locations.some((l) => l.id === storedLocationId)) {
      try {
        window.localStorage.setItem(storageKey, first.id)
      } catch (e) { void e }
    }
  }, [locations, storedLocationId, storageKey])

  const handleSetLocationId = (id) => {
    try {
      if (id) window.localStorage.setItem(storageKey, id)
      else window.localStorage.removeItem(storageKey)
    } catch (e) { void e }
    setStorageTick((v) => v + 1)
  }

  const value = { locations, locationId, setLocationId: handleSetLocationId, loading }

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  )
}
