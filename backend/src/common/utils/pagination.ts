export interface PaginationInput {
  page?: string | number;
  limit?: string | number;
}

export const resolvePagination = (input: PaginationInput) => {
  const page = Math.max(Number(input.page ?? 1), 1);
  const requestedLimit = Math.max(Number(input.limit ?? 20), 1);
  const limit = Math.min(requestedLimit, 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};
