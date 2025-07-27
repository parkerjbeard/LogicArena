'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        
        // Sync with backend if user exists
        if (session?.user) {
          await syncUserWithBackend(session.user)
        }
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      // Sync with backend on sign in
      if (_event === 'SIGNED_IN' && session?.user) {
        await syncUserWithBackend(session.user)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const syncUserWithBackend = async (user: User) => {
    try {
      const response = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabase_id: user.id,
          email: user.email!,
          handle: user.user_metadata?.handle || user.email!.split('@')[0],
        }),
      })
      
      if (!response.ok) {
        console.error('Failed to sync user with backend')
      }
    } catch (error) {
      console.error('Error syncing user:', error)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      })
      
      if (error) throw error
      
      // If email confirmation is disabled, sign in automatically
      if (data.user && !data.session) {
        // Email confirmation is required
        return { error: null }
      }
      
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const refreshSession = async () => {
    const { data: { session }, error } = await supabase.auth.refreshSession()
    if (!error && session) {
      setSession(session)
      setUser(session.user)
    }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}