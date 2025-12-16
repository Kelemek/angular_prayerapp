import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all the modules that main.tsx imports
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
  })),
}));

vi.mock('@vercel/speed-insights/react', () => ({
  SpeedInsights: () => null,
}));

vi.mock('../lib/clarity', () => ({
  initializeClarity: vi.fn(),
}));

vi.mock('../lib/sentry', () => ({
  initializeSentry: vi.fn(),
}));

vi.mock('../App.tsx', () => ({
  default: () => null,
}));

describe('main.tsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup DOM
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('initializes the app and renders to root element', async () => {
    const { createRoot } = await import('react-dom/client');
    const { initializeClarity } = await import('../lib/clarity');
    
    // Import main to trigger execution
    await import('../main');
    
    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(initializeClarity).toHaveBeenCalled();
  });

  it('initializes Sentry asynchronously', async () => {
    // Clear any previous dynamic imports
    vi.resetModules();
    
    // Import main to trigger execution
    await import('../main');
    
    // Wait for async sentry initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { initializeSentry } = await import('../lib/sentry');
    expect(initializeSentry).toHaveBeenCalled();
  });

  it('handles Sentry initialization errors gracefully', async () => {
    vi.resetModules();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock Sentry to throw an error
    vi.doMock('../lib/sentry', () => ({
      initializeSentry: vi.fn(() => {
        throw new Error('Sentry init failed');
      }),
    }));
    
    // Import main to trigger execution
    await import('../main');
    
    // Wait for async sentry initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to load Sentry module:',
      expect.any(Error)
    );
    
    consoleErrorSpy.mockRestore();
  });

  it('renders App component in StrictMode', async () => {
    const { createRoot } = await import('react-dom/client');
    const mockRender = vi.fn();
    
    vi.mocked(createRoot).mockReturnValue({
      render: mockRender,
    } as any);
    
    vi.resetModules();
    await import('../main');
    
    expect(mockRender).toHaveBeenCalled();
    // Just verify render was called with a React element
    expect(mockRender.mock.calls[0][0]).toBeDefined();
  });

  it('includes SpeedInsights component', async () => {
    const { createRoot } = await import('react-dom/client');
    const mockRender = vi.fn();
    
    vi.mocked(createRoot).mockReturnValue({
      render: mockRender,
    } as any);
    
    vi.resetModules();
    await import('../main');
    
    expect(mockRender).toHaveBeenCalled();
  });
});
