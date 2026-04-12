import type { Department } from '../types';
import { Card } from './ui/card';

export const OrgChart = ({ departments }: { departments: Department[] }) => (
  <Card>
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-white">Org Chart Snapshot</h3>
      <p className="text-sm text-white/50">Department structure for Meta Labs Tech teams.</p>
    </div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {departments.map((department) => (
        <div key={department._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="font-semibold text-white">{department.name}</p>
          <p className="text-sm text-white/45">{department.code}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-secondary">{department.status}</p>
        </div>
      ))}
    </div>
  </Card>
);
