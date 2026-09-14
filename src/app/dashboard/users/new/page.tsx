'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PhoneIcon from '@mui/icons-material/Phone';
import HomeIcon from '@mui/icons-material/Home';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import PublicIcon from '@mui/icons-material/Public';
import BadgeIcon from '@mui/icons-material/Badge';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Link from 'next/link';

import {
	Box,
	Paper,
	Typography,
	TextField,
	InputAdornment,
	IconButton,
	Button as MuiButton,
	MenuItem,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { toast, FormPageSkeleton } from '@/components/design-system';
import { hasPermission } from '@/lib/rbac';

const steps = ['Basic Info', 'Contact Details', 'Security'];

export default function CreateUserPage() {
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
			<Box sx={{ py: 12 }}>
				<Paper elevation={0} sx={{ maxWidth: 960, mx: 'auto', p: 6, textAlign: 'center', bgcolor: 'var(--text-primary)', color: 'white' }}>
					<Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>Access Restricted</Typography>
          <Typography sx={{ mb: 3 }}>You do not have permission to create this account type.</Typography>
					<Link href="/dashboard" style={{ textDecoration: 'none' }}>
					<MuiButton variant="contained" sx={{ bgcolor: 'var(--accent-gold)', color: 'var(--text-primary)', '&:hover': { bgcolor: 'var(--accent-gold)' } }}>
						Go to Dashboard
					</MuiButton>
					</Link>
				</Paper>
			</Box>
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
		<Box
			sx={{
				minHeight: '100vh',
				bgcolor: 'var(--background)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				py: { xs: 3, sm: 4 },
				px: { xs: 2, sm: 3, lg: 4 },
			}}
		>
			<motion.div
				// Start visible so SSR HTML is never blank; animation only from a small offset
				initial={{ opacity: 1, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				style={{ maxWidth: 800, width: '100%', position: 'relative', zIndex: 10, marginTop: -24 }}
			>
				<Paper
					elevation={0}
					sx={{
						position: 'relative',
						borderRadius: 4,
						background: 'var(--panel)',
						border: '1px solid rgba(var(--panel-rgb), 0.9)',
						boxShadow: '0 25px 60px rgba(var(--text-primary-rgb), 0.12)',
						p: { xs: 3, sm: 4 },
						overflow: 'hidden',
					}}
				>
					<Box sx={{ position: 'relative', zIndex: 1 }}>
						{/* Header */}
						<Box sx={{ textAlign: 'center', mb: 4 }}>
							<Typography
								variant="h3"
								sx={{
									fontSize: { xs: '1.875rem', sm: '2.25rem' },
									fontWeight: 700,
									color: 'var(--text-primary)',
									mb: 1,
								}}
							>
                {accountType === 'user' ? 'Create Internal User' : 'Create Customer'}
							</Typography>
							<Typography
								variant="body1"
								sx={{
									color: 'var(--text-secondary)',
								}}
							>
                {accountType === 'user' ? 'Create a new internal admin account' : 'Create a new customer account'}
							</Typography>
						</Box>

            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel
                    sx={{
                      '& .MuiStepLabel-label': { color: 'var(--text-secondary)' },
                      '& .MuiStepLabel-label.Mui-active': { color: 'var(--accent-gold)', fontWeight: 600 },
                      '& .MuiStepLabel-label.Mui-completed': { color: 'var(--accent-gold)' },
                      '& .MuiStepIcon-root': { color: 'var(--border)' },
                      '& .MuiStepIcon-root.Mui-active': { color: 'var(--accent-gold)' },
                      '& .MuiStepIcon-root.Mui-completed': { color: 'var(--accent-gold)' },
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>

						{/* Form Content */}
						<Box sx={{ mt: 2, minHeight: 300 }}>
              {activeStep === 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                  {/* Name */}
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography component="label" htmlFor="name" sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1 }}>Full Name</Typography>
                    <TextField
                      id="name" name="name" type="text" fullWidth value={formData.name} onChange={handleChange} required
                      placeholder="Enter full name"
                      InputProps={{ startAdornment: (<InputAdornment position="start"><PersonIcon sx={{ fontSize: 20, color: 'var(--text-secondary)' }} /></InputAdornment>) }}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2, color: 'var(--text-primary)' } }}
                    />
                  </Box>
                  {/* Email */}
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography component="label" htmlFor="email" sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1 }}>Email</Typography>
                    <TextField
                      id="email" name="email" type="email" fullWidth value={formData.email} onChange={handleChange} required
                      placeholder="Enter email address"
                      InputProps={{ startAdornment: (<InputAdornment position="start"><EmailIcon sx={{ fontSize: 20, color: 'var(--text-secondary)' }} /></InputAdornment>) }}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2, color: 'var(--text-primary)' } }}
                    />
                  </Box>
                  {/* Role */}
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography component="label" htmlFor="role" sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1 }}>Role</Typography>
                    {accountType === 'customer' ? (
                      <TextField
                        id="role"
                        name="role"
                        fullWidth
                        value="Customer"
                        disabled
                        InputProps={{ startAdornment: (<InputAdornment position="start"><BadgeIcon sx={{ fontSize: 20, color: 'var(--text-secondary)' }} /></InputAdornment>) }}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2, color: 'var(--text-primary)' } }}
                      />
                    ) : (
                      <TextField
                        id="role" name="role" select fullWidth value={formData.role} onChange={handleChange} required
                        InputProps={{ startAdornment: (<InputAdornment position="start"><BadgeIcon sx={{ fontSize: 20, color: 'var(--text-secondary)' }} /></InputAdornment>) }}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2, color: 'var(--text-primary)' } }}
                      >
                        <MenuItem value="admin">Admin</MenuItem>
                        <MenuItem value="manager">Manager</MenuItem>
                        <MenuItem value="finance">Finance</MenuItem>
                        <MenuItem value="operations">Operations</MenuItem>
                        <MenuItem value="customer_service">Customer Service</MenuItem>
                      </TextField>
                    )}
                  </Box>
                </Box>
              )}

              {activeStep === 1 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                  {/* Phone */}
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography component="label" htmlFor="phone" sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1 }}>Phone</Typography>
                    <TextField
                      id="phone" name="phone" type="tel" fullWidth value={formData.phone} onChange={handleChange}
                      placeholder="Enter phone number"
                      InputProps={{ startAdornment: (<InputAdornment position="start"><PhoneIcon sx={{ fontSize: 20, color: 'var(--text-secondary)' }} /></InputAdornment>) }}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2, color: 'var(--text-primary)' } }}
                    />
                  </Box>
                  {/* Address */}
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography component="label" htmlFor="address" sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1 }}>Address</Typography>
                    <TextField
                      id="address" name="address" type="text" fullWidth value={formData.address} onChange={handleChange}
                      placeholder="Enter address"
                      InputProps={{ startAdornment: (<InputAdornment position="start"><HomeIcon sx={{ fontSize: 20, color: 'var(--text-secondary)' }} /></InputAdornment>) }}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2, color: 'var(--text-primary)' } }}
                    />
                  </Box>
                  {/* City */}
                  <Box>
                    <Typography component="label" htmlFor="city" sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1 }}>City</Typography>
                    <TextField
                      id="city" name="city" type="text" fullWidth value={formData.city} onChange={handleChange}
                      placeholder="Enter city"
                      InputProps={{ startAdornment: (<InputAdornment position="start"><LocationCityIcon sx={{ fontSize: 20, color: 'var(--text-secondary)' }} /></InputAdornment>) }}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2, color: 'var(--text-primary)' } }}
                    />
                  </Box>
                  {/* Country */}
                  <Box>
                    <Typography component="label" htmlFor="country" sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1 }}>Country</Typography>
                    <TextField
                      id="country" name="country" type="text" fullWidth value={formData.country} onChange={handleChange}
                      placeholder="Enter country"
                      InputProps={{ startAdornment: (<InputAdornment position="start"><PublicIcon sx={{ fontSize: 20, color: 'var(--text-secondary)' }} /></InputAdornment>) }}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2, color: 'var(--text-primary)' } }}
                    />
                  </Box>
                </Box>
              )}

              {activeStep === 2 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                  {/* Password */}
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography component="label" htmlFor="password" sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1 }}>Password</Typography>
                    <TextField
                      id="password" name="password" type={showPassword ? 'text' : 'password'} fullWidth value={formData.password} onChange={handleChange} required
                      placeholder="Enter password (min. 6 characters)"
                      InputProps={{
                        startAdornment: (<InputAdornment position="start"><LockIcon sx={{ fontSize: 20, color: 'var(--text-secondary)' }} /></InputAdornment>),
                        endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: 'var(--accent-gold)' }}>{showPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}</IconButton></InputAdornment>)
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2, color: 'var(--text-primary)' } }}
                    />
                  </Box>
                  {/* Confirm Password */}
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography component="label" htmlFor="confirmPassword" sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1 }}>Confirm Password</Typography>
                    <TextField
                      id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} fullWidth value={formData.confirmPassword} onChange={handleChange} required
                      placeholder="Confirm password"
                      InputProps={{
                        startAdornment: (<InputAdornment position="start"><LockIcon sx={{ fontSize: 20, color: 'var(--text-secondary)' }} /></InputAdornment>),
                        endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" sx={{ color: 'var(--accent-gold)' }}>{showConfirmPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}</IconButton></InputAdornment>)
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2, color: 'var(--text-primary)' } }}
                    />
                  </Box>
                </Box>
              )}
						</Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 4, gap: 2 }}>
              <MuiButton
                color="inherit"
                disabled={activeStep === 0}
                onClick={handleBack}
                sx={{
                  color: 'var(--text-secondary)',
                  '&:disabled': { opacity: 0.5 },
                }}
              >
                Back
              </MuiButton>
              <Box sx={{ flex: '1 1 auto' }} />
              {activeStep === 0 && (
                 <MuiButton
                  onClick={() => router.push(successRedirect)}
                  color="inherit"
                  sx={{ color: 'var(--text-secondary)', mr: 1 }}
                >
                  Cancel
                </MuiButton>
              )}
              <MuiButton
                onClick={handleNext}
                variant="contained"
                disabled={isLoading}
                sx={{
                  bgcolor: 'var(--accent-gold)',
                  color: 'var(--background)',
                  '&:hover': { bgcolor: 'var(--accent-gold)' },
                }}
              >
                {activeStep === steps.length - 1 ? (isLoading ? 'Creating...' : 'Create Account') : 'Next'}
              </MuiButton>
            </Box>

					</Box>
				</Paper>
			</motion.div>
		</Box>
	);
}
