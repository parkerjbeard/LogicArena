import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/utils/supabase/client'

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn()
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock fetch
global.fetch = jest.fn()

describe('Authentication', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    // Reset mocks
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    })
    
    mockSupabaseClient = {
      auth: {
        getSession: jest.fn(),
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        refreshSession: jest.fn(),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } }
        })),
      },
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('AuthProvider', () => {
    it('loads user session on mount', async () => {
      jest.useFakeTimers()
      const mockSession = {
        user: { id: 'test-id', email: 'test@example.com' },
        access_token: 'test-token',
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      })

      const TestComponent = () => {
        const { user, isLoading } = useAuth()
        return (
          <div>
            {isLoading ? <p>Loading...</p> : null}
            {user ? <p>User: {user.email}</p> : <p>No user</p>}
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Initial render shows loading or no user
      await waitFor(() => {
        expect(screen.queryByText('No user') || screen.queryByText('Loading...')).toBeTruthy()
      })

      await waitFor(() => {
        expect(screen.getByText('User: test@example.com')).toBeInTheDocument()
      })
      
      jest.useRealTimers()
    })

    it('handles sign in', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null }
      })

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: { user: { email: 'test@example.com' } } },
        error: null
      })

      const TestComponent = () => {
        const { signIn, user } = useAuth()
        return (
          <div>
            {user ? <p>Signed in as: {user.email}</p> : <p>Not signed in</p>}
            <button onClick={() => signIn('test@example.com', 'password')}>
              Sign In
            </button>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Not signed in')).toBeInTheDocument()
      })

      const signInButton = screen.getByText('Sign In')
      await userEvent.click(signInButton)

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      })
    })

    it('handles sign up', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null }
      })

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { email: 'new@example.com' } },
        error: null
      })

      const TestComponent = () => {
        const { signUp } = useAuth()
        return (
          <button onClick={() => signUp('new@example.com', 'password', { handle: 'newuser' })}>
            Sign Up
          </button>
        )
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const signUpButton = screen.getByText('Sign Up')
      await userEvent.click(signUpButton)

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password',
        options: { data: { handle: 'newuser' } },
      })
    })

    it('handles sign out', async () => {
      const mockSession = {
        user: { id: 'test-id', email: 'test@example.com' },
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      })

      mockSupabaseClient.auth.signOut.mockResolvedValue({})

      const TestComponent = () => {
        const { signOut } = useAuth()
        return <button onClick={signOut}>Sign Out</button>
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const signOutButton = await screen.findByText('Sign Out')
      await userEvent.click(signOutButton)

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })
  })

  describe('useAuth hook', () => {
    it('provides authentication state and methods', async () => {
      const mockSession = {
        user: { id: 'test-id', email: 'test@example.com' },
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      })

      const TestComponent = () => {
        const auth = useAuth()
        return (
          <div>
            <p>Is Authenticated: {auth.isAuthenticated ? 'Yes' : 'No'}</p>
            <p>Has Methods: {auth.signIn && auth.signUp && auth.signOut ? 'Yes' : 'No'}</p>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Is Authenticated: Yes')).toBeInTheDocument()
        expect(screen.getByText('Has Methods: Yes')).toBeInTheDocument()
      })
    })

    it('throws error when used outside AuthProvider', () => {
      const TestComponent = () => {
        useAuth() // This should throw
        return null
      }

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      expect(() => render(<TestComponent />)).toThrow(
        'useAuth must be used within an AuthProvider'
      )

      consoleSpy.mockRestore()
    })
  })
})