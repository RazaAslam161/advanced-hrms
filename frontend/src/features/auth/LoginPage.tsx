import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, MoonStar, SunMedium, Volume2, VolumeX } from 'lucide-react';
import { api } from '../../lib/api';
import { companyProfile } from '../../lib/company';
import { getRoleHomePath } from '../../lib/constants';
import { BrandLogo } from '../../components/BrandLogo';
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

export const LoginPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const { darkMode, soundEnabled, toggleDarkMode, toggleSoundEnabled } = useUIStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const { data } = await api.post('/auth/login', values);
      return data.data;
    },
    onSuccess: (payload) => {
      playUiTone('success', true);
      queryClient.removeQueries({ queryKey: ['current-profile'] });
      setSession(payload.accessToken, payload.user);
      navigate(getRoleHomePath(payload.user.role));
    },
  });

  const loginErrorMessage = loginMutation.isError ? getApiErrorMessage(loginMutation.error, 'Unable to sign in.') : null;

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4 flex gap-2">
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

      <div className="w-full max-w-[420px] rounded-3xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] p-8 shadow-panel">
        <div className="flex flex-col items-center text-center">
          <BrandLogo centered />
          <h1 className="mt-7 text-3xl font-bold text-[color:var(--color-heading)]">Welcome Back</h1>
          <p className="mt-1.5 text-sm theme-muted">Sign in to your {companyProfile.platformName} workspace</p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit((values) => loginMutation.mutate(values))}>
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-[color:var(--color-text)]">
              Email address
            </label>
            <Input id="login-email" data-testid="login-email" placeholder="you@metalabstech.com" {...register('email')} />
            {errors.email ? <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p> : null}
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-[color:var(--color-text)]">
              Password
            </label>
            <div className="relative">
              <Input
                id="login-password"
                data-testid="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                className="pr-11"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 theme-muted transition hover:text-[color:var(--color-text)]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password ? <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p> : null}
          </div>

          {loginMutation.isError ? <p className="text-sm text-rose-400">{loginErrorMessage || 'Unable to sign in.'}</p> : null}

          <Button data-testid="login-submit" className="w-full justify-center" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </div>

      <p className="absolute bottom-4 text-center text-[11px] tracking-[0.18em] theme-muted">
        Developed by Raza &amp; Sufyan
      </p>
    </div>
  );
};
