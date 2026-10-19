'use client';

import { Sparkles, Bot } from 'lucide-react';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import PhotoGallery from '@/components/shipments/PhotoGallery';
import Vehicle360Viewer from '@/components/shipments/Vehicle360Viewer';

type UploadProgressItem = {
  name: string;
  progress: number;
};

type ShipmentPhotosTabProps = {
  vehicleLabel: string;
  vehiclePhotos: string[];
  arrivalPhotos: string[];
  canUploadArrivalPhotos: boolean;
  uploading: boolean;
  uploadProgress: UploadProgressItem[];
  onVehiclePhotoClick: (index: number) => void;
  onArrivalPhotoClick: (index: number) => void;
  onDownloadSingle: (url: string, index: number) => void;
  onDownloadAll: (urls: string[], label: string) => void;
  onUploadArrivalPhotos: (files: File[]) => void | Promise<void>;
  onRemoveArrivalPhoto: (index: number) => void | Promise<void>;
  onOpenAiDamageScan?: () => void;
};

export default function ShipmentPhotosTab({
  vehicleLabel,
  vehiclePhotos,
  arrivalPhotos,
  canUploadArrivalPhotos,
  uploading,
  uploadProgress,
  onVehiclePhotoClick,
  onArrivalPhotoClick,
  onDownloadSingle,
  onDownloadAll,
  onUploadArrivalPhotos,
  onRemoveArrivalPhoto,
  onOpenAiDamageScan,
}: ShipmentPhotosTabProps) {
  const totalPhotos = vehiclePhotos.length + arrivalPhotos.length;

  return (
    <div className="space-y-6">
      {/* AI Damage Detection Quick-Action Banner */}
      {totalPhotos > 0 && onOpenAiDamageScan && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-background to-amber-500/5 border border-amber-500/30 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-[var(--text-primary)]">
                  Scan Photos for Vehicle Damage with AI
                </h4>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Vision AI
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Auto-identify scratches, dents, and panel defects across all {totalPhotos} photographs.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAiDamageScan}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:brightness-110 transition-all shadow-md shadow-amber-500/20"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Damage Scan</span>
          </button>
        </div>
      )}

      <DashboardPanel title={`Vehicle Photos${vehiclePhotos.length ? ` (${vehiclePhotos.length})` : ''}`}>
        <div className="space-y-4">
          {vehiclePhotos.length > 0 && (
            <Vehicle360Viewer
              photos={vehiclePhotos}
              vehicleLabel={vehicleLabel}
              onOpenFrame={onVehiclePhotoClick}
            />
          )}

          <PhotoGallery
            photos={vehiclePhotos.map((url) => ({ url, label: 'Vehicle' }))}
            onPhotoClick={onVehiclePhotoClick}
            onDownloadSingle={(url, index) => Promise.resolve(onDownloadSingle(url, index))}
            onDownloadAll={(urls) => Promise.resolve(onDownloadAll(urls, 'Vehicle Photos'))}
          />
        </div>
      </DashboardPanel>

      <DashboardPanel title={`Arrival Photos${arrivalPhotos.length ? ` (${arrivalPhotos.length})` : ''}`}>
        <PhotoGallery
          photos={arrivalPhotos.map((url) => ({ url, label: 'Arrival' }))}
          onPhotoClick={onArrivalPhotoClick}
          onDownloadSingle={(url, index) => Promise.resolve(onDownloadSingle(url, index))}
          onDownloadAll={(urls) => Promise.resolve(onDownloadAll(urls, 'Arrival Photos'))}
          canUpload={canUploadArrivalPhotos}
          onUpload={(files) => Promise.resolve(onUploadArrivalPhotos(files))}
          onDelete={canUploadArrivalPhotos ? (index) => Promise.resolve(onRemoveArrivalPhoto(index)) : undefined}
          uploading={uploading}
          uploadProgress={uploadProgress}
          uploadLabel="Add Arrival Photos"
        />
      </DashboardPanel>
    </div>
  );
}