export const employeeDirectoryQueryKey = ['employee-directory-for-projects'] as const;

export const invalidateEmployeeDirectory = (queryClient: { invalidateQueries: (input: { queryKey: readonly string[] }) => void }) => {
  queryClient.invalidateQueries({ queryKey: [...employeeDirectoryQueryKey] });
};
