import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { EmptyState } from './AsyncState';

export interface TableColumn<T extends { _id?: string }> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
}

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  return isMobile;
};

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
  const isMobile = useIsMobile();

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

  const renderValue = (item: T, column: TableColumn<T>) =>
    column.render ? column.render(item) : String(item[column.key as keyof T] ?? '-');

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-semibold text-[color:var(--color-heading)]">{title}</h3>
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${title.toLowerCase()}...`} className="md:max-w-xs" />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-subtle-bg)] p-4 text-sm theme-muted">
          No results match &ldquo;{search}&rdquo;.
        </p>
      ) : isMobile ? (
        <div className="space-y-3">
          {filtered.map((item, index) => (
            <div key={item._id ?? index} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-subtle-bg)] p-4">
              <dl className="space-y-2">
                {columns.map((column) => (
                  <div key={String(column.key)} className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-xs uppercase tracking-[0.14em] theme-muted">{column.header}</dt>
                    <dd className="text-right text-sm text-[color:var(--color-text)]">{renderValue(item, column)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[color:var(--color-border)] theme-muted">
                {columns.map((column) => (
                  <th key={String(column.key)} className="px-3 py-3 font-semibold">
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, index) => (
                <tr key={item._id ?? index} className="border-b border-[color:var(--color-table-row)] last:border-none">
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-3 py-3 align-top text-[color:var(--color-text)]">
                      {renderValue(item, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
