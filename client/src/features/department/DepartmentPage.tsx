import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { OrgChart } from '../../components/OrgChart';
import { LoadingState, ErrorState } from '../../components/AsyncState';

export const DepartmentPage = () => {
  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await api.get('/departments');
      return data.data;
    },
  });

  if (departmentsQuery.isLoading) {
    return <LoadingState label="Loading departments..." />;
  }

  if (departmentsQuery.isError) {
    return <ErrorState label="Department data could not be loaded." />;
  }

  return (
    <div className="space-y-6">
      <OrgChart departments={departmentsQuery.data} />
      <DataTable
        title="Departments"
        items={departmentsQuery.data}
        columns={[
          { key: 'name', header: 'Department' },
          { key: 'code', header: 'Code' },
          { key: 'status', header: 'Status' },
        ]}
      />
    </div>
  );
};
