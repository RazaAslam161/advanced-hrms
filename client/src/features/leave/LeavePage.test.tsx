import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { LeavePage } from './LeavePage';
import { renderWithProviders } from '../../test/render';
import { server } from '../../test/msw/server';
import { defaultProfile, makeApiResponse, testUsers } from '../../test/fixtures';
import { mockApiState } from '../../test/msw/handlers';

const apiBaseUrl = 'http://localhost:4001/api/v1';

describe('LeavePage', () => {
  it('submits a leave request for an employee user', async () => {
    const user = userEvent.setup();
    let applyPayload: Record<string, unknown> | null = null;

    mockApiState.currentUser = testUsers.employee;
    mockApiState.currentProfile = {
      ...defaultProfile,
      role: 'employee',
      email: testUsers.employee.email,
      firstName: testUsers.employee.firstName,
      lastName: testUsers.employee.lastName,
    };

    server.use(
      rest.post(`${apiBaseUrl}/leave/apply`, async (req, res, ctx) => {
        applyPayload = await req.json<Record<string, unknown>>();
        return res(
          ctx.status(201),
          ctx.json(
            makeApiResponse(
              {
                _id: 'leave-created',
                leaveType: applyPayload.leaveType,
                startDate: applyPayload.startDate,
                endDate: applyPayload.endDate,
                days: 1,
                status: 'pendingManager',
              },
              'Leave request submitted successfully',
            ),
          ),
        );
      }),
    );

    renderWithProviders(<LeavePage />, {
      user: testUsers.employee,
    });

    const form = await screen.findByTestId('leave-request-form');
    const selects = within(form).getAllByRole('combobox');

    await user.selectOptions(selects[0], 'annual');
    await user.clear(within(form).getByPlaceholderText('Reason for leave'));
    await user.type(within(form).getByPlaceholderText('Reason for leave'), 'Annual leave for family travel');
    await user.click(within(form).getByRole('button', { name: /submit leave request/i }));

    expect(await screen.findByText('Leave request submitted successfully.')).toBeInTheDocument();
    await waitFor(() =>
      expect(applyPayload).toMatchObject({
        leaveType: 'annual',
        reason: 'Annual leave for family travel',
      }),
    );
  });

  it('shows approval actions only for approving roles and sends the decision', async () => {
    const user = userEvent.setup();
    let decisionPayload: Record<string, unknown> | null = null;

    mockApiState.currentUser = testUsers.manager;
    mockApiState.currentProfile = {
      ...defaultProfile,
      role: 'manager',
      email: testUsers.manager.email,
      firstName: testUsers.manager.firstName,
      lastName: testUsers.manager.lastName,
      designation: 'Delivery Manager',
    };

    server.use(
      rest.patch(`${apiBaseUrl}/leave/:id/approve`, async (req, res, ctx) => {
        decisionPayload = await req.json<Record<string, unknown>>();
        return res(
          ctx.status(200),
          ctx.json(
            makeApiResponse(
              {
                _id: req.params.id,
                status: 'approved',
              },
              'Leave request updated successfully',
            ),
          ),
        );
      }),
    );

    renderWithProviders(<LeavePage />, {
      user: testUsers.manager,
    });

    expect(await screen.findByRole('button', { name: /^approve$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^approve$/i }));

    await waitFor(() => expect(decisionPayload).toMatchObject({ status: 'approved' }));
  });
});
