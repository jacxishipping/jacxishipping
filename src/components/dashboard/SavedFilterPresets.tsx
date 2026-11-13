'use client';

import React, { useState, useEffect } from 'react';
import { JXBox } from "@jacxishippingorg/jx-ui-react";
import { JacxiButton } from '@/components/design-system/JacxiButton';
import { Bookmark, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/design-system';

export interface FilterPreset<T = Record<string, any>> {
  id: string;
  name: string;
  filters: T;
  isDefault?: boolean;
}

interface SavedFilterPresetsProps<T extends Record<string, any>> {
  storageKey: string;
  currentFilters: T;
  onApplyPreset: (filters: T) => void;
  defaultPresets?: FilterPreset<T>[];
}

const EMPTY_DEFAULT_PRESETS: FilterPreset<any>[] = [];

export function SavedFilterPresets<T extends Record<string, any>>({
  storageKey,
  currentFilters,
  onApplyPreset,
  defaultPresets = EMPTY_DEFAULT_PRESETS,
}: SavedFilterPresetsProps<T>) {
  const [presets, setPresets] = useState<FilterPreset<T>[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Load presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`jacxi_filter_presets_${storageKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        const userCustomPresets = Array.isArray(parsed)
          ? parsed.filter((p: FilterPreset<T>) => !p.isDefault)
          : [];
        setPresets([...defaultPresets, ...userCustomPresets]);
      } else {
        setPresets(defaultPresets);
      }
    } catch {
      setPresets(defaultPresets);
    }
  }, [storageKey, defaultPresets]);

  // Save to localStorage
  const persistPresets = (newPresets: FilterPreset<T>[]) => {
    setPresets(newPresets);
    try {
      localStorage.setItem(`jacxi_filter_presets_${storageKey}`, JSON.stringify(newPresets));
    } catch {
      // ignore
    }
  };

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const newPreset: FilterPreset<T> = {
      id: `preset_${Date.now()}`,
      name: newPresetName.trim(),
      filters: currentFilters,
    };

    const updated = [...presets, newPreset];
    persistPresets(updated);
    setActivePresetId(newPreset.id);
    setNewPresetName('');
    setIsAdding(false);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = presets.filter((p) => p.id !== id);
    persistPresets(updated);
    if (activePresetId === id) {
      setActivePresetId(null);
    }
  };

  return (
    <JXBox
      padding="none"
      border={false}
      className="hidden sm:flex items-center gap-2 flex-wrap py-1 !rounded-none !bg-transparent"
      style={{ fontFamily: 'inherit' }}
    >
      <div className="flex items-center gap-1 mr-1">
        <Bookmark size={14} style={{ color: 'var(--accent-gold)' }} />
        <span className="text-[0.75rem] font-bold text-[var(--text-secondary)]">
          Saved Views:
        </span>
      </div>

      {presets.map((preset) => {
        const isActive = activePresetId === preset.id;
        return (
          <div
            key={preset.id}
            onClick={() => {
              setActivePresetId(preset.id);
              onApplyPreset(preset.filters);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.75rem] font-semibold cursor-pointer transition-all duration-150 hover:-translate-y-px hover:border-[var(--accent-gold)]"
            style={{
              backgroundColor: isActive ? 'var(--accent-gold)' : 'var(--panel)',
              color: isActive ? '#000000' : 'var(--text-primary)',
              border: isActive ? '1px solid var(--accent-gold)' : '1px solid var(--border)',
            }}
          >
            <span>{preset.name}</span>
            {!preset.isDefault && (
              <span
                onClick={(e) => handleDeletePreset(preset.id, e)}
                className="inline-flex items-center p-0.5 rounded opacity-70 hover:opacity-100 hover:bg-black/10"
              >
                <X size={12} />
              </span>
            )}
          </div>
        );
      })}

      {isAdding ? (
        <form onSubmit={handleSaveCurrent} className="inline-flex items-center gap-1">
          <input
            type="text"
            placeholder="View name..."
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            autoFocus
            style={{
              fontSize: '0.75rem',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid var(--accent-gold)',
              backgroundColor: 'var(--background)',
              color: 'var(--text-primary)',
              outline: 'none',
              width: 120,
            }}
          />
          <Button type="submit" variant="primary" size="sm" icon={<Check size={12} />} className="!px-2 !py-1">
            Save
          </Button>
          <JacxiButton
            type="button"
            variant="outline"
            tone="primary"
            onClick={() => setIsAdding(false)}
            aria-label="Cancel saving view"
            style={{ fontFamily: 'inherit' }}
            className="!h-7 !min-h-0 !px-2 !py-1 !rounded-md !border !border-[var(--border)] !bg-transparent !text-[var(--text-primary)] !shadow-none"
          >
            <X size={12} />
          </JacxiButton>
        </form>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          icon={<Plus size={12} />}
          className="!text-[0.72rem] !py-1 !px-2.5 !h-auto !rounded-lg !border-dashed"
        >
          Save Current Filter
        </Button>
      )}
    </JXBox>
  );
}
