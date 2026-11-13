'use client';


import { Suspense, useState, forwardRef, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { Badge as BadgeIcon, Building as LocationCityIcon, ChevronDown, Eye as Visibility, EyeOff as VisibilityOff, Globe as PublicIcon, House as HomeIcon, Lock as LockIcon, Mail as EmailIcon, Phone as PhoneIcon, User as PersonIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

import { Breadcrumbs, Button, FormPageSkeleton, IconButton, PageHeader, toast, MilestoneStepper } from '@/components/design-system';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
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


/** Bare select with the Jacxi field look (no label) — filter dropdowns. Keeps the native event onChange. */
function BareSelect({ options, placeholder, error = false, size = 'small', leftIcon, className, style, ...rest }: BareSelectProps) {
  return (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{leftIcon}</span>
      )}
      <select
        {...rest}
        aria-invalid={error || undefined}
        style={style}
        className={[
          'w-full appearance-none rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors',
          size === 'small' ? 'px-2.5 py-1.5 text-[0.8125rem]' : 'px-3 py-2 text-[0.875rem]',
          leftIcon ? 'pl-9' : '',
          'pr-9',
          error
            ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-2 focus:ring-[rgba(var(--error-rgb),0.2)]'
            : 'border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]',
          rest.disabled ? 'opacity-50' : '',
          className,
        ].filter(Boolean).join(' ')}
      >
        {placeholder && (
          <option value="" disabled>{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={String(option.value)} disabled={option.disabled}>{option.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" aria-hidden="true" />
    </div>
  );
}

type BareSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  options: { value: string | number; label: string; disabled?: boolean }[];
  placeholder?: string;
  error?: boolean;
  size?: 'small' | 'medium';
  leftIcon?: ReactNode;
};


const steps = ['Basic Info', 'Contact Details', 'Security'];

function CreateUserPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { data: session, status } = useSession();
	const accountType = searchParams.get('accountType') === 'user' ? 'user' : 'customer';
	const defaultRole = accountType === 'user' ? 'admin' : 'user';
	const successRedirect = accountType === 'user' ? '/dashboard/users' : '/dashboard/customers';
	const [activeStep, setActiveStep] = useState(0);
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		password: '',
		confirmPassword: '',
		role: defaultRole,
		phone: '',
		address: '',
		city: '',
		country: '',
	});
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	if (status === 'loading') {
		return <FormPageSkeleton />;
	}

	const role = session?.user?.role;
	const canCreateCustomers = hasPermission(role, 'customers:manage');
	const canCreateInternalUsers = hasPermission(role, 'users:manage');
	const hasAccess = accountType === 'user' ? canCreateInternalUsers : canCreateCustomers;

	if (!session || !hasAccess) {
		return (
			<DashboardSurface>
				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', paddingTop: '8px'}}>
					<Breadcrumbs />
				</JXBox>
				<DashboardPanel>
					<div className="py-12 text-center">
						<h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Access Restricted</h2>
						<p className="text-sm text-[var(--text-secondary)] mb-6">You do not have permission to create this account type.</p>
						<Link href="/dashboard">
							<Button variant="primary">Go to Dashboard</Button>
						</Link>
					</div>
				</DashboardPanel>
			</DashboardSurface>
		);
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};

	const handleNext = () => {
		// Validation for each step
		if (activeStep === 0) {
			if (!formData.name || !formData.email || !formData.role) {
				toast.error('Please fill in all required fields');
				return;
			}
		} else if (activeStep === 2) {
			if (!formData.password || !formData.confirmPassword) {
				toast.error('Please enter and confirm password');
				return;
			}
			if (formData.password !== formData.confirmPassword) {
				toast.error('Passwords do not match');
				return;
			}
			if (formData.password.length < 6) {
				toast.error('Password must be at least 6 characters');
				return;
			}
			// Submit form
			handleSubmit();
			return;
		}
		setActiveStep((prevActiveStep) => prevActiveStep + 1);
	};

	const handleBack = () => {
		setActiveStep((prevActiveStep) => prevActiveStep - 1);
	};

	const handleSubmit = async () => {
		setIsLoading(true);

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: formData.name,
					email: formData.email,
					password: formData.password,
					role: formData.role,
					phone: formData.phone,
					address: formData.address,
					city: formData.city,
					country: formData.country,
				}),
			});

			const data = await response.json().catch(() => ({}));

			if (response.ok) {
				if (data?.user) {
					try {
						sessionStorage.setItem('jacxi.createdUser', JSON.stringify(data.user));
					} catch {}

					if (typeof BroadcastChannel !== 'undefined') {
						try {
							const bc = new BroadcastChannel('jacxi-users');
							bc.postMessage({ action: 'created', user: data.user });
							bc.close();
						} catch {}
					}
				}

				toast.success('User created successfully');
				setTimeout(() => router.push(successRedirect), 800);
			} else {
				const msg = data?.message || 'Registration failed';
				toast.error(msg);
				setIsLoading(false);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'An error occurred. Please try again.';
			toast.error(message);
			setIsLoading(false);
		}
	};

	return (
		<DashboardSurface>
			<PageHeader
				showBreadcrumbs
				title={accountType === 'user' ? 'Create Internal User' : 'Create Customer'}
				description={accountType === 'user' ? 'Create a new internal admin or team account' : 'Create a new customer account'}
				actions={
					<Link href={successRedirect}>
						<Button variant="outline" size="sm" className="border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]">
							Back
						</Button>
					</Link>
				}
			/>

			<div className="max-w-3xl">
				<DashboardPanel>
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginBottom: '32px'}}>
						<MilestoneStepper steps={steps.map((label, index) => ({ id: String(index), label: label }))} currentStepId={String(activeStep)} />
					</JXBox>

					{/* Form Content */}
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, minHeight: '280px'}}>
						{activeStep === 0 && (
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '20px'}} className="grid-cols-1 grid sm:grid-cols-[1fr_1fr]">
								{/* Name */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, gridColumn: '1 / -1'}}>
									<label className="text-sm leading-relaxed" htmlFor="name" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>Full Name</label>
									<div className="min-w-0 flex-1"><BareInput id="name" name="name" type="text" value={formData.name} onChange={handleChange} required placeholder="Enter full name" leftIcon={<PersonIcon className="h-[20px] w-[20px]" style={{color: 'var(--text-secondary)'}} />} /></div>
								</JXBox>
								{/* Email */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, gridColumn: '1 / -1'}}>
									<label className="text-sm leading-relaxed" htmlFor="email" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>Email</label>
									<div className="min-w-0 flex-1"><BareInput id="email" name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="Enter email address" leftIcon={<EmailIcon className="h-[20px] w-[20px]" style={{color: 'var(--text-secondary)'}} />} /></div>
								</JXBox>
								{/* Role */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, gridColumn: '1 / -1'}}>
									<label className="text-sm leading-relaxed" htmlFor="role" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>Role</label>
									{accountType === 'customer' ? (
										<div className="min-w-0 flex-1"><BareInput id="role" name="role" value="Customer" disabled leftIcon={<BadgeIcon className="h-[20px] w-[20px]" style={{color: 'var(--text-secondary)'}} />} /></div>
									) : (
										<div className="min-w-0 flex-1"><BareSelect options={[{ value: "admin", label: 'Admin' }, { value: "manager", label: 'Manager' }, { value: "finance", label: 'Finance' }, { value: "operations", label: 'Operations' }, { value: "customer_service", label: 'Customer Service' }]} value={formData.role} id="role" name="role" leftIcon={<BadgeIcon className="h-[20px] w-[20px]" style={{color: 'var(--text-secondary)'}} />} onChange={handleChange as unknown as React.ChangeEventHandler<HTMLSelectElement>} /></div>
									)}
								</JXBox>
							</JXBox>
						)}

						{activeStep === 1 && (
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '20px'}} className="grid-cols-1 grid sm:grid-cols-[1fr_1fr]">
								{/* Phone */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, gridColumn: '1 / -1'}}>
									<label className="text-sm leading-relaxed" htmlFor="phone" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>Phone</label>
									<div className="min-w-0 flex-1"><BareInput id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Enter phone number" leftIcon={<PhoneIcon className="h-[20px] w-[20px]" style={{color: 'var(--text-secondary)'}} />} /></div>
								</JXBox>
								{/* Address */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, gridColumn: '1 / -1'}}>
									<label className="text-sm leading-relaxed" htmlFor="address" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>Address</label>
									<div className="min-w-0 flex-1"><BareInput id="address" name="address" type="text" value={formData.address} onChange={handleChange} placeholder="Enter address" leftIcon={<HomeIcon className="h-[20px] w-[20px]" style={{color: 'var(--text-secondary)'}} />} /></div>
								</JXBox>
								{/* City */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
									<label className="text-sm leading-relaxed" htmlFor="city" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>City</label>
									<div className="min-w-0 flex-1"><BareInput id="city" name="city" type="text" value={formData.city} onChange={handleChange} placeholder="Enter city" leftIcon={<LocationCityIcon className="h-[20px] w-[20px]" style={{color: 'var(--text-secondary)'}} />} /></div>
								</JXBox>
								{/* Country */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
									<label className="text-sm leading-relaxed" htmlFor="country" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>Country</label>
									<div className="min-w-0 flex-1"><BareInput id="country" name="country" type="text" value={formData.country} onChange={handleChange} placeholder="Enter country" leftIcon={<PublicIcon className="h-[20px] w-[20px]" style={{color: 'var(--text-secondary)'}} />} /></div>
								</JXBox>
							</JXBox>
						)}

						{activeStep === 2 && (
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '20px'}} className="grid-cols-1 grid sm:grid-cols-[1fr_1fr]">
								{/* Password */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, gridColumn: '1 / -1'}}>
									<label className="text-sm leading-relaxed" htmlFor="password" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>Password</label>
									<div className="min-w-0 flex-1"><BareInput id="password" name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} required placeholder="Enter password (min. 6 characters)" leftIcon={<LockIcon className="h-[20px] w-[20px]" style={{color: 'var(--text-secondary)'}} />} rightElement={<IconButton icon={showPassword ? <VisibilityOff className="h-[20px] w-[20px]" /> : <Visibility className="h-[20px] w-[20px]" />} ariaLabel={showPassword ? 'Hide password' : 'Show password'} variant="ghost" size="md" onClick={() => setShowPassword(!showPassword)} style={{color: 'var(--accent-gold)'}} />} /></div>
								</JXBox>
								{/* Confirm Password */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, gridColumn: '1 / -1'}}>
									<label className="text-sm leading-relaxed" htmlFor="confirmPassword" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>Confirm Password</label>
									<div className="min-w-0 flex-1"><BareInput id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange} required placeholder="Confirm password" leftIcon={<LockIcon className="h-[20px] w-[20px]" style={{color: 'var(--text-secondary)'}} />} rightElement={<IconButton icon={showConfirmPassword ? <VisibilityOff className="h-[20px] w-[20px]" /> : <Visibility className="h-[20px] w-[20px]" />} ariaLabel={showConfirmPassword ? 'Hide password' : 'Show password'} variant="ghost" size="md" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{color: 'var(--accent-gold)'}} />} /></div>
								</JXBox>
							</JXBox>
						)}
					</JXBox>

					{/* Actions */}
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'row', paddingTop: '32px', gap: '16px', borderTop: '1px solid var(--border)', marginTop: '24px'}}>
						<Button
							variant="outline"
							disabled={activeStep === 0}
							onClick={handleBack}
							style={{color: 'var(--text-secondary)'}}
						>
							Back
						</Button>
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, flex: '1 1 auto'}} />
						{activeStep === 0 && (
							<Button
								variant="ghost"
								onClick={() => router.push(successRedirect)}
								style={{color: 'var(--text-secondary)', marginRight: '8px'}}
							>
								Cancel
							</Button>
						)}
						<Button
							onClick={handleNext}
							variant="primary"
							disabled={isLoading}
							style={{backgroundColor: 'var(--accent-gold)', color: '#000000', fontWeight: 600}}
						>
							{activeStep === steps.length - 1 ? (isLoading ? 'Creating...' : 'Create Account') : 'Next'}
						</Button>
					</JXBox>
				</DashboardPanel>
			</div>
		</DashboardSurface>
	);
}

// useSearchParams() must sit under a Suspense boundary or static
// prerendering fails (missing-suspense-with-csr-bailout).
export default function CreateUserPage() {
  return (
    <Suspense fallback={<div aria-busy="true" style={{ minHeight: '50vh' }} />}>
      <CreateUserPageContent />
    </Suspense>
  );
}
