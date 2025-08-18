import { useAuth as useSupabaseAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

export function useAuth() {
  const { user, session, loading, signIn, signUp, signOut } = useSupabaseAuth()
  const [backendUserId, setBackendUserId] = useState<number | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  
  useEffect(() => {
    // Fetch backend user profile when Supabase user changes
    const fetchBackendProfile = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/supabase-profile/${user.id}`)
          if (response.ok) {
            const data = await response.json()
            setBackendUserId(data.id)
            setUsername(data.handle)
          }
        } catch (error) {
          console.error('Failed to fetch backend user profile:', error)
        }
      } else {
        setBackendUserId(null)
        setUsername(null)
      }
    }
    
    fetchBackendProfile()
  }, [user?.id])
  
  return {
    user,
    username, // Backend handle/username
    userId: backendUserId, // Use backend numeric ID for API compatibility
    supabaseId: user?.id || null,
    isAuthenticated: !!session,
    isLoading: loading,
    session,
    signIn,
    signUp,
    signOut,
  }
}