"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkPlus, Pencil, Trash2 } from "lucide-react";
import { Button, FormField, IconButton, Modal, Select, Tooltip, toast } from '@/components/design-system';
import {
  deleteComparisonPreset,
  loadComparisonPresets,
  saveComparisonPreset,
  updateComparisonPreset,
  type ComparisonPreset,
  type ComparisonPresetConfig,
} from "@/lib/company-price-comparison-presets";

type CompanyPriceComparisonPresetsProps = {
  currentConfig: ComparisonPresetConfig;
  onApply: (config: ComparisonPresetConfig) => void;
};

export default function CompanyPriceComparisonPresets({
  currentConfig,
  onApply,
}: CompanyPriceComparisonPresetsProps) {
  const [presets, setPresets] = useState<ComparisonPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  const refreshPresets = () => {
    setPresets(loadComparisonPresets());
  };

  useEffect(() => {
    refreshPresets();
  }, []);

  const handleOpenSaveDialog = (preset?: ComparisonPreset) => {
    setEditingPresetId(preset?.id || null);
    setPresetName(preset?.name || "");
    setOpenSaveDialog(true);
  };

  const handleSavePreset = () => {
    try {
      if (editingPresetId) {
        updateComparisonPreset(editingPresetId, {
          name: presetName,
          config: currentConfig,
        });
        toast.success("Preset updated");
      } else {
        const preset = saveComparisonPreset(presetName, currentConfig);
        setSelectedPresetId(preset.id);
        toast.success("Preset saved");
      }

      refreshPresets();
      setOpenSaveDialog(false);
      setPresetName("");
      setEditingPresetId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save preset",
      );
    }
  };

  const handleApplyPreset = () => {
    const preset = presets.find((item) => item.id === selectedPresetId);
    if (!preset) {
      toast.error("Select a preset to load");
      return;
    }

    onApply(preset.config);
    toast.success(`Loaded "${preset.name}"`);
  };

  const handleDeletePreset = (presetId: string) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    if (!confirm(`Delete preset "${preset.name}"?`)) return;

    deleteComparisonPreset(presetId);
    if (selectedPresetId === presetId) setSelectedPresetId("");
    refreshPresets();
    toast.success("Preset deleted");
  };

  return (
    <>
      <div style={{padding: '12px', borderRadius: '16px', border: "1px solid var(--border)", background: "var(--panel)"}}>
        <div style={{display: "flex", justifyContent: "space-between", gap: '8px', alignItems: "center", flexWrap: "wrap", marginBottom: '8px'}}>
          <div style={{display: "flex", alignItems: "center", gap: '6px'}}>
            <Bookmark className="w-4 h-4" />
            <div style={{fontWeight: 700}}>Saved Comparison Presets</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<BookmarkPlus className="w-4 h-4" />}
            onClick={() => handleOpenSaveDialog()}
          >
            Save Current
          </Button>
        </div>

        {presets.length === 0 ? (
          <div style={{fontSize: "0.84rem", color: "var(--text-secondary)"}}>
            Save your company selection, filters, and view settings to reload
            common comparisons quickly.
          </div>
        ) : (
          <div style={{display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: '8px', alignItems: "center"}}>
            <Select label="Saved preset" value={selectedPresetId} onChange={(val) => setSelectedPresetId(String(val))} size="small" options={[{ value: "", label: 'Select a preset' }, ...presets.map((preset) => ({ value: preset.id, label: preset.name }))]} />
            <div style={{display: "flex", gap: '6px', flexWrap: "wrap"}}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyPreset}
                disabled={!selectedPresetId}
              >
                Load
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const preset = presets.find(
                    (item) => item.id === selectedPresetId,
                  );
                  if (preset) handleOpenSaveDialog(preset);
                }}
                disabled={!selectedPresetId}
              >
                Update
              </Button>
            </div>
          </div>
        )}

        {presets.length > 0 && (
          <div style={{display: "grid", gap: '6px', marginTop: '10px'}}>
            {presets.slice(0, 5).map((preset) => (
              <div key={preset.id} style={{display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: '8px', alignItems: "center", padding: '8px', borderRadius: '12px', border: "1px solid var(--border)", background: "var(--background)"}}>
                <div style={{minWidth: 0}}>
                  <div style={{fontWeight: 600, fontSize: "0.84rem"}}>
                    {preset.name}
                  </div>
                  <div style={{fontSize: "0.72rem", color: "var(--text-secondary)"}}>
                    {preset.config.selectedCompanyIds.length} companies •{" "}
                    {preset.config.viewMode.replace("-", " ")} • updated{" "}
                    {new Date(preset.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div style={{display: "flex", gap: '2px'}}>
                  <Tooltip title="Load preset">
                    <IconButton  onClick={() => onApply(preset.config)} variant="ghost" size="sm" ariaLabel="Load preset" icon={<Bookmark className="w-4 h-4" />}></IconButton>
                  </Tooltip>
                  <Tooltip title="Rename / update preset">
                    <IconButton  onClick={() => handleOpenSaveDialog(preset)} variant="ghost" size="sm" ariaLabel="Rename preset" icon={<Pencil className="w-4 h-4" />}></IconButton>
                  </Tooltip>
                  <Tooltip title="Delete preset">
                    <IconButton  onClick={() => handleDeletePreset(preset.id)} variant="ghost" size="sm" ariaLabel="Delete preset" className="!text-[var(--error)]" icon={<Trash2 className="w-4 h-4" />}></IconButton>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={openSaveDialog} onClose={() => setOpenSaveDialog(false)} size="sm" title={editingPresetId ? "Update Preset" : "Save Comparison Preset"} actions={<><Button variant="outline" onClick={() => setOpenSaveDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
          >
            {editingPresetId ? "Update" : "Save"}
          </Button></>} showCloseButton={false}><div style={{marginTop: '8px'}}><FormField label="Preset name" autoFocus value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="e.g. Shipping carriers - West Coast lanes" size="small" /></div></Modal>
    </>
  );
}
