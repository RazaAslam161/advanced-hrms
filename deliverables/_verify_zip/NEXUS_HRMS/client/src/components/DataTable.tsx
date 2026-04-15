import { useMemo, useState, type ReactNode } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { EmptyState } from './AsyncState';

export interface TableColumn<T extends { _id?: string }> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
}

export const DataTable = <T extends { _id?: string }>({
  title,
  items,
  columns,
}: {
  title: string;
  items: T[];
  columns: TableColumn<T>[];
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        JSON.stringify(item)
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [items, search],
  );

  if (items.length === 0) {
    return <EmptyState label={`No ${title.toLowerCase()} available yet.`} />;
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-white/50">Search, review, and export table data.</p>
        </div>
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${title.toLowerCase()}...`} className="md:max-w-xs" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/45">
              {columns.map((column) => (
                <th key={String(column.key)} className="px-3 py-3 font-semibold">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, index) => (
              <tr key={item._id ?? index} className="border-b border-white/5 last:border-none">
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-3 py-3 align-top text-white/85">
                    {column.render ? column.render(item) : String(item[column.key as keyof T] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
