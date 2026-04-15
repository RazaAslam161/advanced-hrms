import { AlertTriangle, Inbox, LoaderCircle } from 'lucide-react';
import { Card } from './ui/card';

export const LoadingState = ({ label = 'Loading data...' }: { label?: string }) => (
  <Card className="flex min-h-56 items-center justify-center gap-3">
    <LoaderCircle className="h-5 w-5 animate-spin text-secondary" />
    <p className="text-sm text-white/65">{label}</p>
  </Card>
);

export const ErrorState = ({ label = 'Something went wrong.' }: { label?: string }) => (
  <Card className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
    <AlertTriangle className="h-10 w-10 text-amber-500" />
    <p className="text-sm text-white/65">{label}</p>
  </Card>
);

export const EmptyState = ({ label = 'Nothing to show yet.' }: { label?: string }) => (
  <Card className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
    <Inbox className="h-10 w-10 text-white/35" />
    <p className="text-sm text-white/65">{label}</p>
  </Card>
);
