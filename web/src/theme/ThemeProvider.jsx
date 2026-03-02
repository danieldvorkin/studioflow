/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@apollo/client'
import { STUDIO_SETTINGS } from '../apollo/queries'
import { useStudio } from '../studio/StudioProvider'
import { useAuth } from '../auth/AuthProvider'

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
  applyTheme: () => {},
  clearThemeOverride: () => {},
})

const LEGACY_THEME_KEY = 'theme'
const THEME_OVERRIDE_KEY = 'themeOverride'

function isTheme(value) {
  return value === 'light' || value === 'dark'
}

function getOsPreferredTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
  return 'dark'
}

function getThemeOverride() {
  try {
    const raw = window.localStorage.getItem(THEME_OVERRIDE_KEY)
    return isTheme(raw) ? raw : null
  } catch {
    return null
  }
}

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const role = (user?.roleName || '').toString().toLowerCase()
  const isClient = role === 'client'
  const { selectedStudioId } = useStudio()

  const { data } = useQuery(STUDIO_SETTINGS, {
    variables: isClient ? { studioId: selectedStudioId } : undefined,
    skip: isClient && !selectedStudioId,
  })
  const studioDefaultTheme = useMemo(() => {
    const t = data?.studioSettings?.defaultTheme
    return isTheme(t) ? t : null
  }, [data])

  const [theme, setThemeState] = useState(() => getThemeOverride() || getOsPreferredTheme())
  const hasOverrideRef = useRef(getThemeOverride() != null)

  // Clean up legacy key so old values don't override studio defaults.
  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_THEME_KEY)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!studioDefaultTheme) return
    if (hasOverrideRef.current) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(studioDefaultTheme)
  }, [studioDefaultTheme])

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const setThemeOverride = (next) => {
    if (!isTheme(next)) return
    hasOverrideRef.current = true
    try {
      window.localStorage.setItem(THEME_OVERRIDE_KEY, next)
    } catch {
      // ignore
    }
    setThemeState(next)
  }

  const clearThemeOverride = () => {
    hasOverrideRef.current = false
    try {
      window.localStorage.removeItem(THEME_OVERRIDE_KEY)
    } catch {
      // ignore
    }

    if (studioDefaultTheme) {
      setThemeState(studioDefaultTheme)
    } else {
      setThemeState(getOsPreferredTheme())
    }
  }

  const applyTheme = (next) => {
    if (!isTheme(next)) return
    setThemeState(next)
  }

  const toggleTheme = () => {
    setThemeOverride(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: setThemeOverride, applyTheme, clearThemeOverride }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
