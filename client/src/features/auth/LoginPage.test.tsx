import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { LoginPage } from './LoginPage';
import { renderWithProviders } from '../../test/render';
import { server } from '../../test/msw/server';

const apiBaseUrl = 'http://localhost:4001/api/v1';

describe('LoginPage', () => {
  it('shows validation, toggles password visibility, and redirects on successful login', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/portal/super-admin" element={<div>Super Admin Home</div>} />
      </Routes>,
      { route: '/login' },
    );

    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();

    const passwordInput = screen.getByPlaceholderText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.type(screen.getByPlaceholderText('Work email'), 'zia.aslam@metalabstech.com');
    await user.clear(passwordInput);
    await user.type(passwordInput, 'Meta@12345');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText('Super Admin Home')).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem('nexus-auth')).toContain('zia.aslam@metalabstech.com'));
  });

  it('renders API error feedback when sign-in fails', async () => {
    const user = userEvent.setup();

    server.use(
      rest.post(`${apiBaseUrl}/auth/login`, (_req, res, ctx) =>
        res(ctx.status(401), ctx.json({ success: false, message: 'Invalid email or password' })),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login' },
    );

    await user.type(screen.getByPlaceholderText('Work email'), 'zia.aslam@metalabstech.com');
    await user.type(screen.getByPlaceholderText('Password'), 'WrongMeta@123');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });
});
