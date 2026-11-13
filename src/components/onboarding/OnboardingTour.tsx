"use client";

import { useEffect, useRef } from 'react';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { Button } from '@/components/design-system';
import { HelpCircle } from 'lucide-react';

interface OnboardingTourProps {
  storageKey?: string;
  autoStart?: boolean;
  role?: string;
}

export default function OnboardingTour({
  storageKey = 'jacxi_tour_completed',
  autoStart = false,
  role,
}: OnboardingTourProps) {
  const driverObj = useRef<Driver | null>(null);
  const isCustomer = role === 'user';

  useEffect(() => {
    const customerSteps = [
      {
        element: '#dashboard-header',
        popover: {
          title: 'Welcome to Jacxi Shipping',
          description: 'This is your customer dashboard. Track your shipments, view invoices, and manage your account — all in one place.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#customer-milestone-alerts',
        popover: {
          title: 'Milestone Alerts',
          description: 'Stay informed about important updates — shipments in transit, payment reminders, and release notifications appear here.',
          side: 'bottom',
        },
      },
      {
        element: '#customer-shipment-pipeline',
        popover: {
          title: 'Shipment Progress',
          description: 'See where each shipment is in its journey — from On Hand all the way to Delivered. Active stage is highlighted in gold.',
          side: 'top',
        },
      },
      {
        element: '#customer-live-map',
        popover: {
          title: 'Live Tracking Map',
          description: 'View your in-transit shipments on an interactive map with estimated routes and current positions.',
          side: 'top',
        },
      },
      {
        element: '#customer-financial-summary',
        popover: {
          title: 'Financial Overview',
          description: 'Quickly check your account balance, recent invoices, and payment status at a glance.',
          side: 'left',
        },
      },
      {
        element: '#customer-quick-links',
        popover: {
          title: 'Quick Navigation',
          description: 'Access your shipments, invoices, tracking, and settings pages directly from here.',
          side: 'right',
        },
      },
    ];

    const adminSteps = [
      {
        element: '#dashboard-header',
        popover: {
          title: 'Welcome to Jacxi Shipping',
          description: 'This is your command center. Get a quick overview of your shipments, revenue, and active containers.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#stats-grid',
        popover: {
          title: 'Key Metrics',
          description: 'Monitor real-time performance indicators. These cards update automatically as operations progress.',
          side: 'bottom',
        },
      },
      {
        element: '#quick-actions',
        popover: {
          title: 'Quick Actions',
          description: 'Fast access to common tasks like creating shipments or containers. Saves you clicks!',
          side: 'left',
        },
      },
      {
        element: '#shipment-trends',
        popover: {
          title: 'Trends & Analytics',
          description: 'Visualize your shipping volume over the last 14 days to spot patterns.',
          side: 'top',
        },
      },
      {
        element: '#shipment-calculator',
        popover: {
          title: 'Cost Calculator',
          description: 'Estimate shipping costs instantly based on vehicle type and destination.',
          side: 'right',
        },
      },
    ];

    driverObj.current = driver({
      showProgress: true,
      animate: true,
      steps: isCustomer ? customerSteps : adminSteps,
      onDestroyed: () => {
        if (storageKey) {
          localStorage.setItem(storageKey, 'true');
        }
      },
    });

    if (autoStart) {
      const tourCompleted = localStorage.getItem(storageKey);
      if (!tourCompleted) {
        // Small delay to ensure elements are mounted
        setTimeout(() => {
          driverObj.current?.drive();
        }, 1000);
      }
    }
  }, [storageKey, autoStart, isCustomer]);

  const startTour = () => {
    driverObj.current?.drive();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={startTour}
      icon={<HelpCircle className="w-4 h-4" />}
      aria-label="Start interactive tour"
    >
      Tour
    </Button>
  );
}
