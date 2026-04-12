import { render, screen } from '@testing-library/react';
import { DataTable } from './DataTable';

describe('DataTable', () => {
  it('renders tabular data and search input', () => {
    render(
      <DataTable
        title="Employees"
        items={[
          { _id: '1', employeeId: 'MLT-2026-0001', name: 'Ayesha Khan', designation: 'Frontend Engineer' },
          { _id: '2', employeeId: 'MLT-2026-0002', name: 'Ali Raza', designation: 'Backend Engineer' },
        ]}
        columns={[
          { key: 'employeeId', header: 'Employee ID' },
          { key: 'name', header: 'Name' },
          { key: 'designation', header: 'Designation' },
        ]}
      />,
    );

    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
    expect(screen.getByText('Ayesha Khan')).toBeInTheDocument();
  });
});
