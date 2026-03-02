/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { useLazyQuery, gql } from '@apollo/client'

const CURRENT_USER = gql`
  query CurrentUser {
    currentUser {
      id
      studioId
      email
      name
      role
      roleName
      godmode
      active
      availableForSessions
    }
  }
`

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [tokenChecked, setTokenChecked] = useState(false)
  const [user, setUser] = useState(null)
  const [impersonator, setImpersonator] = useState(null)
  const [fetchCurrentUser, { called, loading, data, error }] = useLazyQuery(CURRENT_USER, { fetchPolicy: 'network-only' })

  useEffect(() => {
    // hydrate impersonator (if any) so we know when we're in a view-as session
    try {
      const storedImpersonator = localStorage.getItem('pilates_impersonator_user')
      if (storedImpersonator) {
        setImpersonator(JSON.parse(storedImpersonator))
      }
    } catch (e) {
      void e
    }

    const token = localStorage.getItem('pilates_token')
    // hydrate user from localStorage for immediate UI responsiveness
    try {
      const stored = localStorage.getItem('pilates_user')
      if (stored) {
        const parsed = JSON.parse(stored)
        setUser((prev) => prev || parsed)
        // consider token checked for UI purposes; verify in background
        setTokenChecked(true)
      }
    } catch (e) {
      void e
    }
    if (!token) {
      setTokenChecked(true)
      return
    }

    // If token exists but we haven't fetched the user yet, do so
    if (!called) {
      // Log token for debugging header issues
      try {
        console.info('AuthProvider: found token, fetching current user', { token: token && token.slice ? token.slice(0, 20) : token })
      } catch (e) { void e }
      fetchCurrentUser().catch((e) => console.error('AuthProvider: fetchCurrentUser failed', e))
    }
  }, [called, fetchCurrentUser])

  useEffect(() => {
    if (error) {
      console.error('AuthProvider: currentUser query error', error)
      localStorage.removeItem('pilates_token')
      localStorage.removeItem('pilates_user')
      setUser(null)
      setTokenChecked(true)
      return
    }

    if (!loading && data) {
      setUser(data?.currentUser || null)
      try {
        if (data?.currentUser) localStorage.setItem('pilates_user', JSON.stringify(data.currentUser))
        else localStorage.removeItem('pilates_user')
      } catch (e) { void e }
      setTokenChecked(true)
    }
  }, [data, loading, error])

  const signOut = () => {
    localStorage.removeItem('pilates_token')
    localStorage.removeItem('pilates_user')
    localStorage.removeItem('pilates_impersonator_token')
    localStorage.removeItem('pilates_impersonator_user')
    setUser(null)
    setImpersonator(null)
    window.location.href = '/signin'
  }

  // Accept optional initialUser to avoid an extra round-trip if the signin mutation returned the user
  const signInWithToken = async (token, initialUser = null) => {
    localStorage.setItem('pilates_token', token)
    setTokenChecked(false)
    if (initialUser) {
      setUser(initialUser)
      // still verify/fill user data in background to keep role checks consistent
    }
    try {
      try { console.info('AuthProvider.signInWithToken: token set', { token: token && token.slice ? token.slice(0, 20) : token }) } catch (e) { void e }
      const res = await fetchCurrentUser()
      setUser(res?.data?.currentUser || null)
    } catch (e) {
      console.error('AuthProvider: fetchCurrentUser after sign-in failed', e)
      localStorage.removeItem('pilates_token')
      setUser(null)
    } finally {
      setTokenChecked(true)
    }
  }

  const refetch = async () => fetchCurrentUser()
  const beginImpersonation = async (token, impersonatedUser) => {
    try {
      const existingImpersonatorToken = localStorage.getItem('pilates_impersonator_token')
      if (!existingImpersonatorToken) {
        const originalToken = localStorage.getItem('pilates_token')
        const originalUser = localStorage.getItem('pilates_user')
        if (originalToken) localStorage.setItem('pilates_impersonator_token', originalToken)
        if (originalUser) localStorage.setItem('pilates_impersonator_user', originalUser)
        if (originalUser) setImpersonator(JSON.parse(originalUser))
      }
    } catch (e) {
      void e
    }

    await signInWithToken(token, impersonatedUser || null)
  }

  const stopImpersonation = async () => {
    const originalToken = localStorage.getItem('pilates_impersonator_token')
    const originalUserRaw = localStorage.getItem('pilates_impersonator_user')
    if (!originalToken) return

    localStorage.removeItem('pilates_impersonator_token')
    localStorage.removeItem('pilates_impersonator_user')

    let originalUser = null
    try {
      if (originalUserRaw) originalUser = JSON.parse(originalUserRaw)
    } catch (e) {
      void e
    }

    setImpersonator(null)
    await signInWithToken(originalToken, originalUser)
  }

  const isImpersonating = !!impersonator

  const value = {
    user,
    loading: !tokenChecked,
    signOut,
    signInWithToken,
    refetch,
    beginImpersonation,
    stopImpersonation,
    isImpersonating,
    impersonator,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
