import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Building2, MapPin, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import { companyProfile } from '../../lib/company';
import { getRoleHomePath, portalConfigByRole } from '../../lib/constants';
import { BrandLogo } from '../../components/BrandLogo';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { getApiErrorMessage } from '../../lib/utils';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaToken: z.string().length(6).optional().or(z.literal('')),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const samplePortalAccess = [
  {
    label: 'Super Admin / CEO',
    email: 'zia.aslam@metalabstech.com',
    password: 'Meta@12345',
  },
  {
    label: 'HR Portal',
    email: 'hr.portal@metalabstech.com',
    password: 'Meta@12345',
  },
  {
    label: 'Manager Portal',
    email: 'manager.portal@metalabstech.com',
    password: 'Meta@12345',
  },
  {
    label: 'Employee Portal',
    email: 'employee.portal@metalabstech.com',
    password: 'Meta@12345',
  },
  {
    label: 'Recruiter Portal',
    email: 'recruiter.portal@metalabstech.com',
    password: 'Meta@12345',
  },
] as const;

export const LoginPage = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'zia.aslam@metalabstech.com',
      password: 'Meta@12345',
      mfaToken: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const { data } = await api.post('/auth/login', {
        ...values,
        mfaToken: values.mfaToken || undefined,
      });
      return data.data;
    },
    onSuccess: (payload) => {
      setSession(payload.accessToken, payload.user);
      navigate(getRoleHomePath(payload.user.role));
    },
  });

  const loginErrorMessage = loginMutation.isError ? getApiErrorMessage(loginMutation.error, 'Unable to sign in.') : null;

  return (
    <div className="grid min-h-[calc(100vh-5rem)] gap-10 xl:grid-cols-[1.08fr,0.92fr]">
      <div className="flex items-center">
        <div className="max-w-2xl">
          <BrandLogo className="mb-8" />
          <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-secondary">
            {companyProfile.legalName} Workforce OS
          </p>
          <h1 className="text-5xl font-semibold leading-tight text-white">A real HRMS for the teams building Meta Labs Tech.</h1>
          <p className="mt-5 max-w-xl text-lg text-white/68">
            {companyProfile.description} Run HR for Lahore and Dubai teams with self-service attendance, localized payroll, approvals, and recruitment pipelines.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/80">
              <Sparkles className="h-4 w-4 text-accent" />
              Role-based portals
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/80">
              <MapPin className="h-4 w-4 text-accent" />
              Lahore + Dubai offices
            </div>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Object.values(portalConfigByRole).map((portal) => (
              <div key={portal.key} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-secondary">{portal.label}</p>
                <p className="mt-2 text-sm text-white/60">{portal.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {companyProfile.offices.map((office) => (
              <div key={office.label} className="rounded-[1.75rem] border border-white/10 bg-white/6 p-4 shadow-panel">
                <p className="text-xs uppercase tracking-[0.25em] text-secondary">{office.label}</p>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  {office.city}, {office.country}
                </h3>
                <p className="mt-2 text-sm text-white/60">{office.address}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] p-6">
            <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr] lg:items-center">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-secondary">NEXUS</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">Professional people operations, designed around the company brand.</h2>
                <p className="mt-3 text-sm text-white/58">This workspace now follows the official Meta Labs Tech visual identity instead of a generic HR dashboard shell.</p>
              </div>
              <img src={companyProfile.assets.hero} alt={`${companyProfile.legalName} hero`} className="max-h-64 w-full object-contain" />
            </div>
          </div>
        </div>
      </div>
      <Card className="mx-auto flex w-full max-w-xl flex-col justify-center bg-gradient-to-b from-white/10 to-white/[0.03]">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-primary p-3 text-white shadow-glow">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-secondary">Secure Access</p>
            <h2 className="text-2xl font-semibold text-white">Sign in to NEXUS</h2>
            <p className="mt-1 text-sm text-white/50">{companyProfile.website}</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit((values) => loginMutation.mutate(values))}>
          <div>
            <Input placeholder="Email address" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <Input type="password" placeholder="Password" {...register('password')} />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>
          <div>
            <Input placeholder="MFA token (optional)" {...register('mfaToken')} />
            {errors.mfaToken && <p className="mt-1 text-xs text-red-500">{errors.mfaToken.message}</p>}
          </div>
          {loginMutation.isError && <p className="text-sm text-red-400">{loginErrorMessage || 'Unable to sign in.'}</p>}
          <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
            {!loginMutation.isPending ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
          </Button>
        </form>
        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">Portal Credentials</p>
          <div className="mt-4 space-y-3">
            {samplePortalAccess.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setValue('email', account.email, { shouldValidate: true });
                  setValue('password', account.password, { shouldValidate: true });
                  setValue('mfaToken', '');
                }}
                className="flex w-full items-start justify-between rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
              >
                <div>
                  <p className="text-sm font-medium text-white">{account.label}</p>
                  <p className="mt-1 text-xs text-white/55">{account.email}</p>
                </div>
                <span className="text-xs text-secondary">Use</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-white/45">Every provisioned employee gets a unique login from the Access portal. Sample credentials above are for seeded demo accounts only.</p>
        </div>
      </Card>
    </div>
  );
};
