"use client";

import { ReactNode } from 'react';
import Button, { type ButtonProps } from './Button';

interface ActionButtonProps extends Omit<ButtonProps, 'variant' | 'size' | 'loading'> {
	variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
	size?: 'sm' | 'md' | 'lg' | 'small' | 'medium' | 'large';
	loading?: boolean;
	icon?: ReactNode;
	iconPosition?: 'start' | 'end';
}

export default function ActionButton({
	variant = 'primary',
	size,
	loading,
	icon,
	iconPosition = 'start',
	children,
	...buttonProps
}: ActionButtonProps) {
	const mappedSize =
		size === 'small' ? 'sm' : size === 'medium' ? 'md' : size === 'large' ? 'lg' : size;

	return (
		<Button
			{...buttonProps}
			size={mappedSize}
			loading={loading}
			variant={variant}
			icon={icon}
			iconPosition={iconPosition}
		>
			{children}
		</Button>
	);
}
