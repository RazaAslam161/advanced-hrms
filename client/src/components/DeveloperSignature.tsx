import { Mail, Linkedin } from 'lucide-react';
import { cn } from '../lib/utils';

export const DeveloperSignature = ({ compact = false, className }: { compact?: boolean; className?: string }) => (
  <div className={cn('rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70', className)}>
    <p className="text-xs uppercase tracking-[0.24em] text-white/40">Developed By</p>
    <p className="mt-2 font-medium text-white">Raza Aslam</p>
    {!compact ? <p className="mt-1 text-sm text-white/55">Interface design and frontend implementation.</p> : null}
    <div className="mt-3 space-y-2 text-sm">
      <a href="mailto:razaaslam5096@gmail.com" className="flex items-center gap-2 text-white/75 transition hover:text-white">
        <Mail className="h-4 w-4" />
        razaaslam5096@gmail.com
      </a>
      <a href="https://www.linkedin.com/in/raza-aslam-z144" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-white/75 transition hover:text-white">
        <Linkedin className="h-4 w-4" />
        linkedin.com/in/raza-aslam-z144
      </a>
    </div>
  </div>
);
