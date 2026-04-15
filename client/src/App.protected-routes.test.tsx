import { screen } from '@testing-library/react';
import App from './App';
import { renderWithProviders } from './test/render';
import { mockApiState } from './test/msw/handlers';
import { defaultProfile, testUsers } from './test/fixtures';

describe('App protected routes', () => {
  it('redirects unauthenticated users to the login page', async () => {
    renderWithProviders(<App />, { route: '/portal/super-admin' });

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders an employee portal route and hides admin-only navigation', async () => {
    mockApiState.currentUser = testUsers.employee;
    mockApiState.currentProfile = {
      ...defaultProfile,
      role: 'employee',
      email: testUsers.employee.email,
      firstName: testUsers.employee.firstName,
      lastName: testUsers.employee.lastName,
    };

    renderWithProviders(<App />, {
      route: '/portal/employee/settings',
      user: testUsers.employee,
    });

    expect(await screen.findByRole('heading', { name: /account center/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /access/i })).not.toBeInTheDocument();
  });
});
