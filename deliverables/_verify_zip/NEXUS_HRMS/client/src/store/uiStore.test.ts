import { useUIStore } from './uiStore';

describe('uiStore', () => {
  it('rotates widget order', () => {
    useUIStore.setState({ widgetOrder: ['headcount', 'attendance', 'leave', 'payroll'] });
    useUIStore.getState().setWidgetOrder(['attendance', 'leave', 'payroll', 'headcount']);
    expect(useUIStore.getState().widgetOrder[0]).toBe('attendance');
  });
});
