// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock WebSocket - provide a basic mock only if not already mocked
if (!global.WebSocket) {
  global.WebSocket = jest.fn().mockImplementation(() => ({
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: 1,
  }));
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null })),
      delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    toString: jest.fn(),
  }),
  usePathname: () => '/',
  useParams: () => ({}),
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

// Mock next/dynamic
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (fn) => {
    const Component = fn();
    const DynamicComponent = (props) => {
      const ResolvedComponent = Component.default || Component;
      return ResolvedComponent(props);
    };
    DynamicComponent.preload = () => {};
    return DynamicComponent;
  },
}));

// Mock axios is handled by manual mock in src/__mocks__/axios.js

// Ensure timers and mocks are cleared between tests
afterEach(() => {
  try { jest.clearAllTimers(); } catch {}
  try { jest.clearAllMocks(); } catch {}
});

// Provide lightweight polyfills for MessageEvent and CloseEvent to reduce JSDOM overhead
if (typeof global.MessageEvent === 'undefined') {
  class SimpleMessageEvent {
    type;
    data;
    constructor(type, init = {}) {
      this.type = type;
      this.data = init.data;
    }
  }
  // @ts-ignore
  global.MessageEvent = SimpleMessageEvent;
}

if (typeof global.CloseEvent === 'undefined') {
  class SimpleCloseEvent {
    type;
    code;
    reason;
    wasClean;
    constructor(type, init = {}) {
      this.type = type;
      this.code = init.code;
      this.reason = init.reason;
      this.wasClean = true;
    }
  }
  // @ts-ignore
  global.CloseEvent = SimpleCloseEvent;
}

// Silence noisy console to reduce memory and speed up tests
if (process.env.JEST_WORKER_ID) {
  // eslint-disable-next-line no-console
  console.log = jest.fn();
  // eslint-disable-next-line no-console
  console.warn = jest.fn();
  // eslint-disable-next-line no-console
  console.error = jest.fn();
  // eslint-disable-next-line no-console
  console.info = jest.fn();
}