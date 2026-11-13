'use client';

import { JXBox, JXTypography } from '@jacxishippingorg/jx-ui-react';
import { cn } from '@/lib/utils';

interface MobileCardProps {
  title: string;
  subtitle?: string;
  status?: React.ReactNode;
  image?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  actions?: React.ReactNode;
}

export function MobileCard({ 
  title, 
  subtitle, 
  status, 
  image, 
  children, 
  onClick,
  actions 
}: MobileCardProps) {
  return (
    <JXBox
      surface="elevated"
      padding="md"
      radius="lg"
      onClick={onClick}
      className={cn(
        "!bg-[var(--panel)] !border-[var(--border)] mb-3 shadow-none",
        onClick && "cursor-pointer active:!bg-[var(--background)] transition-colors"
      )}
      style={{ fontFamily: 'inherit' }}
    >
      <div className="flex gap-3">
        {image && (
          <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
            <img src={image} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <JXTypography variant="h3" className="!text-base !font-semibold !text-[var(--text-primary)] truncate pr-2">
                {title}
              </JXTypography>
              {subtitle && (
                <JXTypography variant="body" className="!text-sm !text-[var(--text-secondary)] truncate">
                  {subtitle}
                </JXTypography>
              )}
            </div>
            {status}
          </div>
          
          {children && (
            <div className="mt-3 text-sm text-[var(--text-secondary)]">
              {children}
            </div>
          )}
          
          {actions && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex justify-end gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </JXBox>
  );
}

