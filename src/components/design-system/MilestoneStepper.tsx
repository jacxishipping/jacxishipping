"use client";

import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { Check } from 'lucide-react';
import React, { ReactNode } from 'react';

export interface MilestoneStep {
  id: string;
  label: string;
  description?: string;
  timestamp?: string;
  icon?: ReactNode;
}

export interface MilestoneStepperProps {
  steps: MilestoneStep[];
  currentStepId: string;
  status?: 'default' | 'completed' | 'cancelled' | 'delayed';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export default function MilestoneStepper({
  steps,
  currentStepId,
  status = 'default',
  orientation = 'horizontal',
  className,
}: MilestoneStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id.toLowerCase() === currentStepId.toLowerCase());
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  return (
    <JXBox
      padding="none"
      border={false}
      className={['w-full py-2 !rounded-none !bg-transparent', className].filter(Boolean).join(' ')}
      style={{ fontFamily: 'inherit' }}
    >
      <div
        className={[
          'relative flex justify-between gap-4',
          orientation === 'vertical'
            ? 'flex-col items-start'
            : 'flex-col items-start md:flex-row md:items-center md:gap-0',
        ].join(' ')}
      >
        {steps.map((step, idx) => {
          const isCompleted = idx < activeIndex || (idx === activeIndex && status === 'completed');
          const isCurrent = idx === activeIndex && status !== 'completed';

          return (
            <React.Fragment key={step.id}>
              {/* Connector line for horizontal */}
              {idx > 0 && orientation === 'horizontal' && (
                <div
                  className="mx-3 hidden h-0.5 flex-1 transition-colors duration-300 md:block"
                  style={{
                    backgroundColor: isCompleted ? 'var(--accent-gold, #D4AF37)' : 'var(--border, #E5E7EB)',
                  }}
                />
              )}

              {/* Step item */}
              <div className="relative z-10 flex items-center gap-3">
                {/* Step Circle / Badge */}
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[0.8125rem] font-bold transition-all duration-200"
                  style={
                    isCompleted
                      ? {
                          backgroundColor: 'var(--accent-gold, #D4AF37)',
                          color: '#FFFFFF',
                          boxShadow: '0 2px 8px rgba(212, 175, 55, 0.35)',
                        }
                      : isCurrent
                      ? {
                          backgroundColor: '#FFFFFF',
                          color: 'var(--accent-gold, #D4AF37)',
                          border: '2px solid var(--accent-gold, #D4AF37)',
                          boxShadow: '0 0 0 4px rgba(212, 175, 55, 0.15)',
                        }
                      : {
                          backgroundColor: 'var(--background, #F3F4F6)',
                          color: 'var(--text-secondary, #9CA3AF)',
                          border: '1px solid var(--border, #E5E7EB)',
                        }
                  }
                >
                  {isCompleted ? (
                    <Check style={{ width: 16, height: 16, strokeWidth: 3 }} />
                  ) : isCurrent ? (
                    <span
                      className="h-2 w-2 rounded-full animate-pulse"
                      style={{ backgroundColor: 'var(--accent-gold, #D4AF37)' }}
                    />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Step Text Info */}
                <div className="min-w-0">
                  <span
                    className={[
                      'block text-[0.8125rem] leading-[1.2]',
                      isCurrent || isCompleted
                        ? 'font-bold text-[var(--text-primary,#111827)]'
                        : 'font-medium text-[var(--text-secondary,#6B7280)]',
                    ].join(' ')}
                  >
                    {step.label}
                  </span>
                  {step.timestamp && (
                    <span
                      className="block text-[0.6875rem] text-[var(--text-secondary,#9CA3AF)]"
                    >
                      {step.timestamp}
                    </span>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </JXBox>
  );
}
