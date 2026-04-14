import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Building2, Eye, EyeOff, MapPin, MoonStar, SunMedium, Volume2, VolumeX } from 'lucide-react';
import { api } from '../../lib/api';
import { companyProfile } from '../../lib/company';
import { getRoleHomePath } from '../../lib/constants';
import { BrandLogo } from '../../components/BrandLogo';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { playUiTone } from '../../lib/sound';
import { getApiErrorMessage } from '../../lib/utils';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const suggestedAccounts = [
  { label: 'Super Admin', email: 'zia.aslam@metalabstech.com', password: 'Meta@12345' },
  { label: 'HR Portal', email: 'hr.portal@metalabstech.com', password: 'Meta@12345' },
  { label: 'Manager Portal', email: 'manager.portal@metalabstech.com', password: 'Meta@12345' },
  { label: 'Employee Portal', email: 'employee.portal@metalabstech.com', password: 'Meta@12345' },
  { label: 'Recruiter Portal', email: 'recruiter.portal@metalabstech.com', password: 'Meta@12345' },
] as const;

export const LoginPage = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const { darkMode, soundEnabled, toggleDarkMode, toggleSoundEnabled } = useUIStore();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const hideSuggestionsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const emailValue = watch('email');

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const { data } = await api.post('/auth/login', values);
      return data.data;
    },
    onSuccess: (payload) => {
      playUiTone('success', true);
      setSession(payload.accessToken, payload.user);
      navigate(getRoleHomePath(payload.user.role));
    },
  });

  const loginErrorMessage = loginMutation.isError ? getApiErrorMessage(loginMutation.error, 'Unable to sign in.') : null;
  const filteredSuggestions = useMemo(() => {
    const query = emailValue.trim().toLowerCase();
    if (!query) {
      return suggestedAccounts;
    }

    return suggestedAccounts.filter(
      (account) => account.label.toLowerCase().includes(query) || account.email.toLowerCase().includes(query),
    );
  }, [emailValue]);

  const emailRegister = register('email');

  const openSuggestions = () => {
    if (hideSuggestionsTimeout.current) {
      clearTimeout(hideSuggestionsTimeout.current);
    }
    setShowSuggestions(true);
  };

  const scheduleHideSuggestions = () => {
    hideSuggestionsTimeout.current = setTimeout(() => {
      setShowSuggestions(false);
    }, 120);
  };

  const applySuggestion = (account: (typeof suggestedAccounts)[number]) => {
    setValue('email', account.email, { shouldValidate: true });
    setValue('password', account.password, { shouldValidate: true });
    playUiTone('soft', true);
    setShowSuggestions(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col">
      <div className="grid flex-1 gap-8 xl:grid-cols-[1.1fr,0.9fr]">
        <section className="flex items-center">
          <div className="w-full max-w-3xl">
            <div className="mb-6 flex justify-end gap-2">
              <Button
                variant="outline"
                className="h-10 w-10 rounded-full px-0"
                soundTone="none"
                aria-label={soundEnabled ? 'Mute interface sounds' : 'Enable interface sounds'}
                title={soundEnabled ? 'Mute interface sounds' : 'Enable interface sounds'}
                onClick={() => {
                  const nextEnabled = !soundEnabled;
                  toggleSoundEnabled();
                  playUiTone(nextEnabled ? 'success' : 'soft', true);
                }}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                className="h-10 w-10 rounded-full px-0"
                soundTone="none"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={() => {
                  toggleDarkMode();
                  playUiTone('soft', true);
                }}
              >
                {darkMode ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
              </Button>
            </div>

            <BrandLogo className="mb-10" />

            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.24em] text-secondary">Meta Labs Tech</p>
              <h1 className="mt-4 text-5xl font-semibold leading-tight text-white">
                A cleaner workspace for HR operations, payroll, approvals, and internal coordination.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-white/68">
                Sign in with your company account to access the records, approvals, updates, and workflows relevant to your role.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {companyProfile.offices.map((office) => (
                <div key={office.label} className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center gap-2 text-secondary">
                    <MapPin className="h-4 w-4" />
                    <p className="text-xs uppercase tracking-[0.22em]">{office.label}</p>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-white">
                    {office.city}, {office.country}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/58">{office.address}</p>
                  <p className="mt-3 text-sm text-white/72">{office.phone}</p>
                </div>
              ))}
            </div>

            <Card className="mt-8 bg-[rgba(255,255,255,0.035)]">
              <p className="text-xs uppercase tracking-[0.22em] text-secondary">Why teams use it</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-white/64">
                <p>
                  Employee records, leave approvals, payroll workflows, hiring activity, and internal announcements are handled in one place instead of being scattered across sheets and messages.
                </p>
                <p>
                  The product is designed to stay readable under daily use, with direct language, predictable actions, and role-based access that does not get in the way of the work itself.
                </p>
              </div>
            </Card>
          </div>
        </section>

        <div className="flex items-center justify-center">
          <Card className="w-full max-w-lg border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-8">
            <div className="mb-8 flex items-start gap-4">
              <div className="hero-float rounded-2xl bg-primary/18 p-3 text-white shadow-[0_18px_40px_rgba(127,99,244,0.24)]">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-secondary">Account Access</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">Sign in</h2>
                <p className="mt-2 text-sm leading-6 text-white/55">Use the login credentials issued to you by the Super Admin or HR team.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit((values) => loginMutation.mutate(values))}>
              <div className="relative">
                <Input
                  placeholder="Work email"
                  {...emailRegister}
                  onFocus={openSuggestions}
                  onBlur={(event) => {
                    emailRegister.onBlur(event);
                    scheduleHideSuggestions();
                  }}
                  onChange={(event) => {
                    emailRegister.onChange(event);
                    openSuggestions();
                  }}
                />
                {errors.email ? <p className="mt-1 text-xs text-rose-300">{errors.email.message}</p> : null}
                {showSuggestions && filteredSuggestions.length > 0 ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-xl border border-white/10 bg-[#1b1430] p-2 shadow-2xl">
                    <p className="px-2 pb-2 pt-1 text-[11px] uppercase tracking-[0.22em] text-white/38">Suggested sign-ins</p>
                    <div className="space-y-1">
                      {filteredSuggestions.map((account) => (
                        <button
                          key={account.email}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => applySuggestion(account)}
                          className="flex w-full items-start justify-between rounded-lg px-3 py-2 text-left transition hover:bg-white/8"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">{account.label}</p>
                            <p className="text-xs text-white/48">{account.email}</p>
                          </div>
                          <span className="text-xs text-secondary">Use</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} placeholder="Password" className="pr-11" {...register('password')} />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/42 transition hover:text-white/70"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((currentState) => !currentState)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {errors.password ? <p className="mt-1 text-xs text-rose-300">{errors.password.message}</p> : null}
              </div>

              {loginMutation.isError ? <p className="text-sm text-rose-300">{loginErrorMessage || 'Unable to sign in.'}</p> : null}

              <Button className="w-full justify-center" type="submit" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? 'Signing in...' : 'Continue'}
                {!loginMutation.isPending ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            </form>

            <div className="mt-8 rounded-xl border border-white/10 bg-black/10 p-4 text-sm leading-6 text-white/52">
              If you do not have access yet, contact the company administrator to issue your login credentials and role. Suggested sign-ins appear when you interact with the email field.
            </div>
          </Card>
        </div>
      </div>

      <p className="mt-8 text-center text-[11px] tracking-[0.18em] text-white/28">
        Developed by{' '}
        <a href="mailto:razaaslam5096@gmail.com" className="transition hover:text-white/45">
          Raza Aslam
        </a>
        {' '}|{' '}
        <a href="https://www.linkedin.com/in/raza-aslam-z144" target="_blank" rel="noreferrer" className="transition hover:text-white/45">
          LinkedIn
        </a>
      </p>
    </div>
  );
};
