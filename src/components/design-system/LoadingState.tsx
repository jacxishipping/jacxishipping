"use client";

import { JXBox, JXTypography } from '@jacxishippingorg/jx-ui-react';
import { CompactSkeleton } from './PageSkeletons';

interface LoadingStateProps {
	message?: string;
	fullScreen?: boolean;
}

export default function LoadingState({ message = 'Loading...', fullScreen = false }: LoadingStateProps) {
	if (fullScreen) {
		return (
			<JXBox
				padding="none"
				border={false}
				className="min-h-screen w-full"
				style={{ backgroundColor: 'var(--background)', fontFamily: 'inherit' }}
			>
				<div className="mx-auto max-w-[800px] p-8 pt-20">
					<CompactSkeleton />
					<div className="mt-8">
						<CompactSkeleton />
					</div>
				</div>
			</JXBox>
		);
	}

	return (
		<JXBox
			padding="none"
			border={false}
			className="!bg-transparent flex min-h-[200px] w-full flex-col items-center justify-center"
			style={{ fontFamily: 'inherit' }}
		>
			<div className="w-full max-w-[400px]">
				<CompactSkeleton />
			</div>
			{message && message !== 'Loading...' && (
				<JXTypography variant="caption" className="mt-4 !text-[var(--text-secondary)]">
					{message}
				</JXTypography>
			)}
		</JXBox>
	);
}
