'use client';

import { useEffect, useState, use, forwardRef, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Key,
  Copy,
  RefreshCw,
  Trash2,
  PhoneCall,
  Eye,
  EyeOff,
  Sparkles,
  Shield,
  Check,
} from 'lucide-react';
import { 
  DashboardSurface, 
  DashboardPanel 
} from '@/components/dashboard/DashboardSurface';
import { Alert, Breadcrumbs, Button, FormField, IconButton, LoadingState, PageHeader, toast } from '@/components/design-system';
import { formatLoginCode, loginCodeToVoiceDigits } from '@/lib/loginCode';
import { hasPermission } from '@/lib/rbac';

/** Bare input with the Jacxi field look (no label) — search fields, table-cell editors. */
const BareInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, BareInputProps>(function BareInput(
  { leftIcon, rightIcon, rightElement, error = false, helperText, size = 'small', multiline = false, rows, minRows, inputProps, className, style, ...rest },
  ref,
) {
  const controlClass = [
    'w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)]',
    size === 'small' ? 'px-2.5 py-1.5 text-[0.8125rem]' : 'px-3 py-2 text-[0.875rem]',
    leftIcon ? 'pl-9' : '',
    rightIcon || rightElement ? 'pr-9' : '',
    error
      ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-2 focus:ring-[rgba(var(--error-rgb),0.2)]'
      : 'border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]',
    rest.disabled ? 'opacity-50' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <div>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{leftIcon}</span>
        )}
        {multiline ? (
          <textarea
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            {...(inputProps as unknown as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            rows={rows ?? minRows ?? 3}
            aria-invalid={error || undefined}
            style={style}
            className={`${controlClass} min-h-[80px] resize-y leading-[1.5]`}
          />
        ) : (
          <input
            {...rest}
            {...inputProps}
            ref={ref as React.Ref<HTMLInputElement>}
            aria-invalid={error || undefined}
            style={style}
            className={controlClass}
          />
        )}
        {rightIcon && (
          <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{rightIcon}</span>
        )}
        {rightElement && (
          <span className="absolute right-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{rightElement}</span>
        )}
      </div>
      {helperText && (
        <p className="mt-0.5 text-[0.75rem]" style={{ color: error ? 'var(--error)' : 'var(--text-secondary)' }}>{helperText}</p>
      )}
    </div>
  );
});

type BareInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Interactive element on the right (e.g. password visibility toggle). */
  rightElement?: ReactNode;
  error?: boolean;
  helperText?: ReactNode;
  size?: 'small' | 'medium';
  multiline?: boolean;
  rows?: number;
  minRows?: number;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
};


const userSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    role: z.enum(['user', 'admin', 'manager', 'customer_service']),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.password && data.password.trim() !== '') {
        return data.password.trim().length >= 6;
      }
      return true;
    },
    {
      message: 'Password must be at least 6 characters long',
      path: ['password'],
    }
  )
  .refine(
    (data) => {
      if (data.password && data.password.trim() !== '') {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }
  );

type UserFormData = z.infer<typeof userSchema>;

function generateSecurePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join('');
}

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginCode, setLoginCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const voiceAccessCode = loginCode ? loginCodeToVoiceDigits(loginCode) : null;

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const watchPassword = watch('password');

  useEffect(() => {
    if (status === 'loading') return;
    
    // Auth check: admin or users/customers manager
    const canManage =
      session?.user?.role === 'admin' ||
      hasPermission(session?.user?.role, 'users:manage') ||
      hasPermission(session?.user?.role, 'customers:manage');

    if (!session || !canManage) {
      router.replace('/dashboard');
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${id}`);
        if (response.ok) {
          const data = await response.json();
          reset({
            name: data.user.name || '',
            email: data.user.email,
            phone: data.user.phone || '',
            address: data.user.address || '',
            city: data.user.city || '',
            country: data.user.country || '',
            role: data.user.role,
            password: '',
            confirmPassword: '',
          });
          setLoginCode(data.user.loginCode || null);
        } else {
          setError('Failed to fetch user details');
        }
      } catch (error) {
        setError('An error occurred while fetching user');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id, session, status, router, reset]);

  const handleGeneratePassword = () => {
    const pwd = generateSecurePassword();
    setValue('password', pwd, { shouldValidate: true });
    setValue('confirmPassword', pwd, { shouldValidate: true });
    setShowPassword(true);
    setShowConfirmPassword(true);
    setCopiedPassword(false);
    toast.info('Secure password generated');
  };

  const handleCopyGeneratedPassword = async () => {
    const pwd = getValues('password');
    if (!pwd) return;
    try {
      await navigator.clipboard.writeText(pwd);
      setCopiedPassword(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopiedPassword(false), 2500);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      setError(null);
      const payload: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country,
        role: data.role,
      };

      if (data.password && data.password.trim() !== '') {
        payload.password = data.password.trim();
      }

      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(
          data.password && data.password.trim() !== ''
            ? 'User profile and password updated successfully'
            : 'User profile updated successfully'
        );
        router.push(`/dashboard/users/${id}`);
        router.refresh();
      } else {
        const result = await response.json();
        setError(result.message || 'Failed to update user');
      }
    } catch (error) {
      setError('An error occurred while updating user');
    }
  };

  const handleCopyLoginCode = () => {
    if (!loginCode) return;
    navigator.clipboard.writeText(loginCode);
    toast.success('Login code copied to clipboard');
  };

  const handleCopyVoiceAccessCode = () => {
    if (!voiceAccessCode) return;
    navigator.clipboard.writeText(voiceAccessCode);
    toast.success('Voice access code copied to clipboard');
  };

  const handleGenerateLoginCode = async () => {
    setGeneratingCode(true);
    try {
      const response = await fetch('/api/users/login-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate login code');
      }

      setLoginCode(data.loginCode);
      toast.success('Login code generated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate login code';
      toast.error(message);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleDeleteLoginCode = async () => {
    if (!confirm('Are you sure you want to remove this login code? The user will no longer be able to use it to login.')) {
      return;
    }

    setGeneratingCode(true);
    try {
      const response = await fetch(`/api/users/login-code?userId=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove login code');
      }

      setLoginCode(null);
      toast.success('Login code removed successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove login code';
      toast.error(message);
    } finally {
      setGeneratingCode(false);
    }
  };

  if (loading || status === 'loading') {
    return <LoadingState />;
  }

  return (
    <DashboardSurface>
      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px'}}>
        <Breadcrumbs />
      </JXBox>

      <PageHeader
        title="Edit User"
        description="Update user profile information and security credentials"
        actions={
          <Link href={`/dashboard/users/${id}`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
              Cancel
            </Button>
          </Link>
        }
      />

      <DashboardPanel className="max-w-2xl mx-auto">
        {error && (
          <Alert severity="error" icon={<AlertCircle className="w-5 h-5" />} variant="subtle" className="mb-6">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            label="Full Name"
            placeholder="John Doe"
            error={!!errors.name}
            helperText={errors.name?.message}
            {...register('name')}
          />

          <FormField
            label="Email Address"
            placeholder="john@example.com"
            type="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            {...register('email')}
          />

          <FormField
            label="Phone Number"
            placeholder="+1 (555) 000-0000"
            error={!!errors.phone}
            helperText={errors.phone?.message}
            {...register('phone')}
          />

          <FormField
            label="Address"
            placeholder="123 Main St"
            error={!!errors.address}
            helperText={errors.address?.message}
            {...register('address')}
          />

          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '24px'}} className="grid-cols-1 grid md:grid-cols-[1fr_1fr]">
            <FormField
              label="City"
              placeholder="New York"
              error={!!errors.city}
              helperText={errors.city?.message}
              {...register('city')}
            />

            <FormField
              label="Country"
              placeholder="United States"
              error={!!errors.country}
              helperText={errors.country?.message}
              {...register('country')}
            />
          </JXBox>

          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
            <p className="text-sm font-medium" style={{marginBottom: '8px', fontWeight: 600}}>Role</p>
            <select
              {...register('role')}
              className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none transition-all"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="customer_service">Customer Service</option>
            </select>
            {errors.role && (
              <span className="text-xs text-[var(--text-secondary)] text-[var(--error)]" style={{marginTop: '4px', display: 'block'}}>
                {errors.role.message}
              </span>
            )}
          </JXBox>

          <div aria-hidden="true" className="my-4 border-t border-[var(--border)]" style={{marginTop: '24px', marginBottom: '24px', borderColor: 'var(--border)'}} />

          {/* Password Management Section */}
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <p className="text-sm font-medium" style={{fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'}}>
                <Shield className="w-4 h-4 text-[var(--accent-gold)]" />
                Password & Security
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={handleGeneratePassword}
              >
                Generate Strong Password
              </Button>
            </JXBox>

            <span className="text-xs text-[var(--text-secondary)]" style={{color: 'var(--text-secondary)', display: 'block'}}>
              Leave blank to keep existing password. If entering a new password, it must be at least 6 characters.
            </span>

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '24px'}} className="grid-cols-1 grid md:grid-cols-[1fr_1fr]">
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                <span className="text-xs text-[var(--text-secondary)]" style={{color: 'var(--text-secondary)', marginBottom: '4px', display: 'block'}}>
                  New Password
                </span>
                <div className="min-w-0 flex-1"><BareInput type={showPassword ? 'text' : 'password'} placeholder="Enter new password" error={!!errors.password} helperText={errors.password?.message} rightElement={<IconButton icon={showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} ariaLabel={showPassword ? 'Hide password' : 'Show password'} variant="ghost" size="sm" onClick={() => setShowPassword((prev) => !prev)} title={showPassword ? 'Hide password' : 'Show password'} />} size="small" /></div>
              </JXBox>

              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                <span className="text-xs text-[var(--text-secondary)]" style={{color: 'var(--text-secondary)', marginBottom: '4px', display: 'block'}}>
                  Confirm New Password
                </span>
                <div className="min-w-0 flex-1"><BareInput type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm new password" error={!!errors.confirmPassword} helperText={errors.confirmPassword?.message} rightElement={<IconButton icon={showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} ariaLabel={showConfirmPassword ? 'Hide password' : 'Show password'} variant="ghost" size="sm" onClick={() => setShowConfirmPassword((prev) => !prev)} title={showConfirmPassword ? 'Hide password' : 'Show password'} />} size="small" /></div>
              </JXBox>
            </JXBox>

            {watchPassword && (
              <JXBox padding="none" border={false} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--background)', borderRadius: '16px', border: '1px solid var(--border)'}}>
                <span className="text-xs text-[var(--text-secondary)]" style={{color: 'var(--text-secondary)'}}>
                  A new password is ready to be set upon saving.
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  onClick={handleCopyGeneratedPassword}
                >
                  {copiedPassword ? 'Copied' : 'Copy Password'}
                </Button>
              </JXBox>
            )}
          </JXBox>

          <div aria-hidden="true" className="my-4 border-t border-[var(--border)]" style={{marginTop: '24px', marginBottom: '24px', borderColor: 'var(--border)'}} />

          {/* Login Code Management Section */}
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
            <p className="text-sm font-medium" style={{marginBottom: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Key className="w-4 h-4" />
              Login Code Management
            </p>
            
            {loginCode ? (
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                  <span className="text-xs text-[var(--text-secondary)]" style={{color: 'var(--text-secondary)', marginBottom: '8px', display: 'block'}}>
                    Current Login Code
                  </span>
                  <JXBox padding="none" border={false} style={{display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--background)', border: '2px solid var(--accent-gold)', borderRadius: '16px', padding: '16px'}}>
                    <Key className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '0.2em', flex: 1}}>
                      {formatLoginCode(loginCode)}
                    </JXBox>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Copy className="w-4 h-4" />}
                      onClick={handleCopyLoginCode}
                      type="button"
                    >
                      Copy
                    </Button>
                  </JXBox>
                </JXBox>
                
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '16px'}}>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<RefreshCw className="w-4 h-4" />}
                    onClick={handleGenerateLoginCode}
                    disabled={generatingCode}
                    type="button"
                  >
                    {generatingCode ? 'Regenerating...' : 'Regenerate Code'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={handleDeleteLoginCode}
                    disabled={generatingCode}
                    type="button"
                  >
                    Remove Code
                  </Button>
                </JXBox>

                <span className="text-xs text-[var(--text-secondary)]" style={{color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.5}}>
                  This user can login using this code at <JXBox padding="none" border={false} component="span" style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--accent-gold)', fontWeight: 500}}>/auth/simple-login</JXBox>
                </span>

                <Alert severity="info" icon={<PhoneCall className="w-4 h-4" />} variant="subtle">
                  The call agent asks for an 8-digit phone keypad code. If this access code contains letters, share the keypad version below with the customer for phone support.
                </Alert>

                {voiceAccessCode ? (
                  <JXBox padding="none" border={false} style={{display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px'}}>
                    <span className="text-xs text-[var(--text-secondary)]" style={{color: 'var(--text-secondary)', display: 'block'}}>
                      Voice keypad code for the call agent
                    </span>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '0.2em', flex: 1}}>
                        {formatLoginCode(voiceAccessCode)}
                      </JXBox>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Copy className="w-4 h-4" />}
                        onClick={handleCopyVoiceAccessCode}
                        type="button"
                      >
                        Copy Voice Code
                      </Button>
                    </JXBox>
                    <span className="text-xs text-[var(--text-secondary)]" style={{color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.6}}>
                      Standard phone mapping: ABC = 2, DEF = 3, GHI = 4, JKL = 5, MNO = 6, PQRS = 7, TUV = 8, WXYZ = 9.
                    </span>
                  </JXBox>
                ) : null}
              </JXBox>
            ) : (
              <JXBox padding="none" border={false} style={{textAlign: 'center', paddingTop: '24px', paddingBottom: '24px', backgroundColor: 'var(--background)', borderRadius: '16px', border: '1px dashed var(--border)'}}>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px'}}>
                  No login code set for this user
                </p>
                <span className="text-xs text-[var(--text-secondary)]" style={{color: 'var(--text-secondary)', display: 'block', marginBottom: '16px', lineHeight: 1.5}}>
                  Generate a login code first to enable both simple login and phone-call access for this user.
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Key className="w-4 h-4" />}
                  onClick={handleGenerateLoginCode}
                  disabled={generatingCode}
                  type="button"
                >
                  {generatingCode ? 'Generating...' : 'Generate Login Code'}
                </Button>
              </JXBox>
            )}
          </JXBox>

          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', gap: '16px', paddingTop: '16px'}}>
            <Link href={`/dashboard/users/${id}`} style={{ textDecoration: 'none' }}>
              <Button variant="ghost" type="button">Cancel</Button>
            </Link>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={isSubmitting}
              icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </JXBox>
        </form>
      </DashboardPanel>
    </DashboardSurface>
  );
}
