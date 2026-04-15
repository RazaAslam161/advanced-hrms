import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { EmployeePage } from './EmployeePage';
import { renderWithProviders } from '../../test/render';
import { server } from '../../test/msw/server';
import { defaultProfile, makeApiResponse, makeEmployee, testDepartments, testUsers } from '../../test/fixtures';
import { mockApiState } from '../../test/msw/handlers';

const apiBaseUrl = 'http://localhost:4001/api/v1';

describe('EmployeePage', () => {
  it('submits the employee create form and shows issued credentials', async () => {
    const user = userEvent.setup();
    let capturedPayload: Record<string, unknown> | null = null;

    mockApiState.currentUser = testUsers.admin;
    mockApiState.currentProfile = {
      ...defaultProfile,
      role: 'admin',
      email: testUsers.admin.email,
      firstName: testUsers.admin.firstName,
      lastName: testUsers.admin.lastName,
      designation: 'Head of HR',
    };

    server.use(
      rest.post(`${apiBaseUrl}/employees`, async (req, res, ctx) => {
        capturedPayload = await req.json<Record<string, unknown>>();
        const employee = makeEmployee({
          _id: 'employee-created',
          employeeId: 'MLT-2026-0012',
          firstName: String(capturedPayload.firstName),
          lastName: String(capturedPayload.lastName),
          email: String(capturedPayload.email),
          role: (capturedPayload.role as typeof testUsers.employee.role) ?? 'employee',
          designation: String(capturedPayload.designation),
          department: testDepartments[0],
          status: 'active',
          employmentType: 'full-time',
          joiningDate: String(capturedPayload.joiningDate),
          salary: {
            basic: 160000,
            houseRent: 30000,
            medical: 10000,
            transport: 5000,
            currency: 'PKR',
            bonus: 0,
          },
        });

        return res(
          ctx.status(201),
          ctx.json(
            makeApiResponse(
              {
                employee,
                credentials: {
                  email: employee.email,
                  role: employee.role ?? 'employee',
                  generatedPassword: 'MetaTX!12345',
                },
              },
              'Employee created successfully',
            ),
          ),
        );
      }),
    );

    renderWithProviders(<EmployeePage />, {
      user: testUsers.admin,
    });

    const form = await screen.findByTestId('employee-create-form');

    await user.type(within(form).getByPlaceholderText('First name'), 'Ali');
    await user.type(within(form).getByPlaceholderText('Last name'), 'Raza');
    await user.type(within(form).getByPlaceholderText('Work email'), 'ali.raza@metalabstech.com');

    const selects = within(form).getAllByRole('combobox');
    await user.selectOptions(selects[0], 'employee');
    await user.selectOptions(selects[1], testDepartments[0]._id);

    await user.clear(within(form).getByPlaceholderText('Designation'));
    await user.type(within(form).getByPlaceholderText('Designation'), 'Backend Engineer');
    await user.clear(within(form).getByPlaceholderText('Basic salary'));
    await user.type(within(form).getByPlaceholderText('Basic salary'), '160000');
    await user.click(within(form).getByRole('button', { name: /create employee and credentials/i }));

    expect(await screen.findByText('Employee account created successfully.')).toBeInTheDocument();
    expect(await screen.findByText('MetaTX!12345')).toBeInTheDocument();

    await waitFor(() =>
      expect(capturedPayload).toMatchObject({
        firstName: 'Ali',
        lastName: 'Raza',
        email: 'ali.raza@metalabstech.com',
        designation: 'Backend Engineer',
        role: 'employee',
        department: testDepartments[0]._id,
      }),
    );
  });
});
