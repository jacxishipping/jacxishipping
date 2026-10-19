'use client';

import React, { useState, useEffect } from 'react';
import { Ship, Package, Check, AlertCircle, X, Search } from 'lucide-react';
import Modal from '@/components/design-system/Modal';
import { Button, FormField, toast } from '@/components/design-system';

interface ActiveContainer {
  id: string;
  containerNumber: string;
  vesselName: string | null;
  destinationPort: string | null;
  currentCount: number;
  maxCapacity: number;
  status: string;
}

interface BatchAssignContainerModalProps {
  open: boolean;
  onClose: () => void;
  selectedShipmentIds: string[];
  onSuccess?: () => void;
}

export function BatchAssignContainerModal({
  open,
  onClose,
  selectedShipmentIds,
  onSuccess,
}: BatchAssignContainerModalProps) {
  const [containers, setContainers] = useState<ActiveContainer[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedContainerId, setSelectedContainerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      fetchActiveContainers();
      setSelectedContainerId('');
      setSearchQuery('');
    }
  }, [open]);

  const fetchActiveContainers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/containers?status=active&limit=50', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setContainers(data.containers || []);
      } else {
        toast.error('Failed to load active containers');
      }
    } catch {
      toast.error('Error fetching containers');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!selectedContainerId) {
      toast.error('Please select a destination container');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/bulk/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assignContainer',
          shipmentIds: selectedShipmentIds,
          data: { containerId: selectedContainerId },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to assign shipments');
      }

      toast.success('Shipments assigned to container', {
        description: `${selectedShipmentIds.length} vehicle(s) moved to In Transit.`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign container');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredContainers = containers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.containerNumber.toLowerCase().includes(q) ||
      (c.vesselName && c.vesselName.toLowerCase().includes(q)) ||
      (c.destinationPort && c.destinationPort.toLowerCase().includes(q))
    );
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-[var(--accent-gold)]" />
          <span>Assign {selectedShipmentIds.length} Vehicle(s) to Container</span>
        </div>
      }
      description="Select an open container consolidation unit for ocean departure"
      size="md"
      actions={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmAssignment}
            disabled={!selectedContainerId || submitting}
            icon={<Check className="w-4 h-4" />}
          >
            {submitting ? 'Assigning...' : `Assign ${selectedShipmentIds.length} Vehicles`}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Search Filter */}
        <FormField
          label="Search Containers"
          placeholder="Filter by container #, vessel, destination port..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-[var(--text-secondary)]" />}
        />

        {/* Containers List */}
        <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {loading ? (
            <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
              Loading available containers...
            </div>
          ) : filteredContainers.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-[var(--border)] rounded-xl text-xs text-[var(--text-secondary)]">
              No active containers with available capacity found.
            </div>
          ) : (
            filteredContainers.map((container) => {
              const isSelected = selectedContainerId === container.id;
              const availableSlots = Math.max(0, container.maxCapacity - container.currentCount);
              const willExceed = selectedShipmentIds.length > availableSlots;

              return (
                <div
                  key={container.id}
                  onClick={() => setSelectedContainerId(container.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)] ring-1 ring-[var(--accent-gold)]'
                      : 'border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent-gold)]/50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                        {container.containerNumber}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]">
                        {container.status}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-2 flex-wrap">
                      {container.vesselName && <span>🚢 {container.vesselName}</span>}
                      {container.destinationPort && <span>📍 {container.destinationPort}</span>}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-semibold text-xs text-[var(--text-primary)]">
                      {container.currentCount} / {container.maxCapacity} Loaded
                    </div>
                    <div className={`text-[10px] font-medium ${willExceed ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {availableSlots} slot{availableSlots === 1 ? '' : 's'} free
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
