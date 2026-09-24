"use client";

import { TextField, TextFieldProps, Typography, Box, InputAdornment } from '@mui/material';
import { ReactNode } from 'react';

interface FormFieldProps extends Omit<TextFieldProps, 'variant'> {
	label: string;
	helperText?: string;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
}

export default function FormField({
	label,
	helperText,
	leftIcon,
	rightIcon,
	...textFieldProps
}: FormFieldProps) {
	const helperTextId = textFieldProps.id ? `${textFieldProps.id}-helper-text` : undefined;

	return (
		<Box>
			<Typography
				component="label"
				htmlFor={textFieldProps.id}
				sx={{
					display: 'block',
					fontSize: '0.875rem',
					fontWeight: 500,
					color: textFieldProps.error ? 'var(--error)' : 'var(--text-primary)',
					mb: 1,
				}}
			>
				{label}
				{textFieldProps.required && (
					<Typography
						component="span"
						sx={{ color: 'var(--error)', ml: 0.5 }}
					>
						*
					</Typography>
				)}
			</Typography>
			<TextField
				{...textFieldProps}
				aria-describedby={[
					helperText ? helperTextId : undefined,
					textFieldProps['aria-describedby']
				].filter(Boolean).join(' ') || undefined}
				fullWidth
				InputProps={{
					...textFieldProps.InputProps,
					startAdornment: leftIcon ? (
						<InputAdornment position="start">
							{leftIcon}
						</InputAdornment>
					) : textFieldProps.InputProps?.startAdornment,
					endAdornment: rightIcon ? (
						<InputAdornment position="end">
							{rightIcon}
						</InputAdornment>
					) : textFieldProps.InputProps?.endAdornment,
				}}
				sx={{
					'& .MuiOutlinedInput-root': {
						bgcolor: 'var(--background)',
						borderRadius: 2,
						color: 'var(--text-primary)',
						'& fieldset': {
							borderColor: 'rgba(var(--border-rgb), 0.9)',
						},
						'&:hover fieldset': {
							borderColor: 'var(--border)',
						},
						'&.Mui-focused fieldset': {
							borderColor: 'var(--accent-gold)',
							borderWidth: 2,
						},
						'& input, & textarea': {
							color: 'var(--text-primary)',
							'&::placeholder': {
								color: 'var(--text-secondary)',
								opacity: 1,
							},
							'&:-webkit-autofill': {
								WebkitBoxShadow: '0 0 0 100px var(--background) inset',
								WebkitTextFillColor: 'var(--text-primary)',
							},
						},
						'& .MuiInputAdornment-root': {
							color: 'var(--text-secondary)',
						},
					},
					...textFieldProps.sx,
				}}
			/>
			{helperText && (
				<Typography
					id={helperTextId}
					sx={{
						fontSize: '0.75rem',
						color: textFieldProps.error ? 'var(--error)' : 'var(--text-secondary)',
						mt: 0.5,
					}}
				>
					{helperText}
				</Typography>
			)}
		</Box>
	);
}
