"use client";

import { JXBox, JXTypography } from '@jacxishippingorg/jx-ui-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
	icon: ReactNode;
	title: string;
	description?: string;
	action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
	return (
		<JXBox
			padding="none"
			border={false}
			className="animate-fade-in-up !bg-transparent flex min-h-[240px] flex-col items-center justify-center gap-3 py-8 text-center"
			style={{ fontFamily: 'inherit' }}
		>
			<div
				className="flex h-[72px] w-[72px] items-center justify-center rounded-full opacity-80 [&>svg]:text-[42px] sm:[&>svg]:text-[48px] md:[&>svg]:text-[56px]"
				style={{
					background: 'rgba(var(--accent-gold-rgb), 0.08)',
					border: '1px solid rgba(var(--accent-gold-rgb), 0.2)',
					color: 'var(--accent-gold-text)',
				}}
			>
				{icon}
			</div>
			<JXTypography
				variant="h3"
				className="!text-[0.98rem] sm:!text-[1rem] md:!text-[1.05rem] !font-semibold !text-[var(--text-primary)]"
			>
				{title}
			</JXTypography>
			{description && (
				<JXTypography
					variant="body"
					className="max-w-[400px] !text-[0.8rem] sm:!text-[0.85rem] md:!text-[0.9rem] !text-[var(--text-secondary)]"
				>
					{description}
				</JXTypography>
			)}
			{action && <div className="mt-2">{action}</div>}
		</JXBox>
	);
}
