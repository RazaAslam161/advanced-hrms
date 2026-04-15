import { useUIStore } from './uiStore';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockReturnValue({ matches: false }),
  });
});

describe('uiStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({
      sidebarOpen: true,
      darkMode: false,
      soundEnabled: true,
      widgetOrder: ['headcount', 'attendance', 'leave', 'payroll'],
    });
  });

  it('rotates widget order', () => {
    useUIStore.setState({ widgetOrder: ['headcount', 'attendance', 'leave', 'payroll'] });
    useUIStore.getState().setWidgetOrder(['attendance', 'leave', 'payroll', 'headcount']);
    expect(useUIStore.getState().widgetOrder[0]).toBe('attendance');
  });

  it('persists widget order to localStorage', () => {
    useUIStore.getState().setWidgetOrder(['payroll', 'leave', 'headcount', 'attendance']);
    const stored = JSON.parse(localStorage.getItem('nexus-ui')!);
    expect(stored.widgetOrder[0]).toBe('payroll');
  });

  it('toggles sidebar open state', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(true);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('toggles dark mode and persists to localStorage', () => {
    useUIStore.getState().toggleDarkMode();
    expect(useUIStore.getState().darkMode).toBe(true);
    const stored = JSON.parse(localStorage.getItem('nexus-ui')!);
    expect(stored.darkMode).toBe(true);
  });

  it('toggles soundEnabled and persists to localStorage', () => {
    useUIStore.getState().toggleSoundEnabled();
    expect(useUIStore.getState().soundEnabled).toBe(false);
    const stored = JSON.parse(localStorage.getItem('nexus-ui')!);
    expect(stored.soundEnabled).toBe(false);
  });

  it('hydrates from localStorage when data is present', () => {
    localStorage.setItem(
      'nexus-ui',
      JSON.stringify({ darkMode: true, soundEnabled: false, sidebarOpen: false, widgetOrder: ['payroll'] }),
    );
    useUIStore.getState().hydrate();
    const state = useUIStore.getState();
    expect(state.darkMode).toBe(true);
    expect(state.soundEnabled).toBe(false);
    expect(state.sidebarOpen).toBe(false);
    expect(state.widgetOrder).toEqual(['payroll']);
  });

  it('uses system preference when no localStorage data exists', () => {
    localStorage.clear();
    window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as any;
    useUIStore.getState().hydrate();
    expect(useUIStore.getState().darkMode).toBe(true);
  });
});
