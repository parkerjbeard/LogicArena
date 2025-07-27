import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'
import { AuthProvider } from '@/contexts/AuthContext'
import { createClient } from '@/utils/supabase/client'

// Mock dependencies
jest.mock('@/utils/supabase/client')
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock fetch for profile sync
global.fetch = jest.fn()

describe('Authentication Integration', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    mockSupabaseClient = {
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        getUser: jest.fn(),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } }
        })),
      },
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Login Page', () => {
    it('renders login form', () => {
      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('handles successful login', async () => {
      const user = userEvent.setup()
      
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { 
          session: { 
            user: { id: '123', email: 'test@example.com' } 
          } 
        },
        error: null,
      })

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        })
      })
    })

    it('displays error on failed login', async () => {
      const user = userEvent.setup()
      
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      })

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })

    it('toggles between login and register modes', async () => {
      const user = userEvent.setup()
      
      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      // Initially in login mode
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
      expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()

      // Switch to register mode
      const toggleButton = screen.getByText(/don't have an account/i)
      await user.click(toggleButton)

      // Now in register mode
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
      expect(screen.getByLabelText('Username')).toBeInTheDocument()
    })

    it('handles registration with username', async () => {
      const user = userEvent.setup()
      
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: '123', email: 'new@example.com' } },
        error: null,
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '123', email: 'new@example.com' } },
      })

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      // Switch to register mode
      const toggleButton = screen.getByText(/don't have an account/i)
      await user.click(toggleButton)

      // Fill in registration form
      await user.type(screen.getByLabelText('Username'), 'newuser')
      await user.type(screen.getByLabelText('Email'), 'new@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
          email: 'new@example.com',
          password: 'password123',
          options: {
            data: { handle: 'newuser' },
          },
        })
      })

      // Should sync with backend
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/users/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supabase_id: '123',
            email: 'new@example.com',
            handle: 'newuser',
          }),
        })
      })
    })
  })
})