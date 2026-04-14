import type { ReactNode } from 'react';
import { Card } from './ui/card';

export const StatCard = ({ label, value, helper, icon }: { label: string; value: string | number; helper: string; icon: ReactNode }) => (
  <Card className="space-y-3 bg-[rgba(255,255,255,0.045)]">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-white/55">{label}</span>
      <span className="text-secondary">{icon}</span>
    </div>
    <div>
      <p className="text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-white/45">{helper}</p>
    </div>
  </Card>
);
