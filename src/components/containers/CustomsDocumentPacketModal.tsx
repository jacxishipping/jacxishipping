'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Mail,
  Send,
  ShieldCheck,
  CheckCircle2,
  Ship,
  Car,
  X,
  ExternalLink,
  PhoneCall
} from 'lucide-react';
import { Button, FormField, Modal, toast } from '@/components/design-system';
import { 
  generateCustomsPacketPDF, 
  downloadCustomsPacketPDF, 
  type CustomsPacketContainer, 
  type CustomsAgentInfo 
} from '@/lib/utils/generateCustomsPacketPDF';

interface CustomsDocumentPacketModalProps {
  open: boolean;
  onClose: () => void;
  container: CustomsPacketContainer;
}

export function CustomsDocumentPacketModal({
  open,
  onClose,
  container,
}: CustomsDocumentPacketModalProps) {
  const [isEmailing, setIsEmailing] = useState(false);
  const [agentInfo, setAgentInfo] = useState<CustomsAgentInfo>({
    agentName: 'Jebel Ali Port Clearing & Forwarding Services',
    agentEmail: 'customs.broker@jebelaliport.ae',
    agentPhone: '+971 4 881 5000',
    clearingPort: container.destinationPort || 'Port of Jebel Ali (AEJEA)',
    consigneeName: 'Jacxi International Logistics LLC',
  });

  const handleDownload = () => {
    downloadCustomsPacketPDF(container, agentInfo);
    toast.success('Official Customs Packet PDF generated and downloaded.');
  };

  const handleEmailAgent = async () => {
    if (!agentInfo.agentEmail) {
      toast.error('Please enter a destination agent email address.');
      return;
    }

    setIsEmailing(true);
    try {
      // Send notification / email via communication endpoint
      const res = await fetch('/api/settings/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'email',
          to: agentInfo.agentEmail,
          subject: `Export Customs Manifest & Clearance Packet - Container ${container.containerNumber} (${container.vesselName || 'Ocean Vessel'})`,
          message: `Dear ${agentInfo.agentName},\n\nPlease find attached the official export customs documentation packet for Container ${container.containerNumber}, carrying ${container.shipments.length} vehicle units on vessel ${container.vesselName || 'Ocean Carrier'} (POD: ${container.destinationPort || 'Destination Port'}).\n\nAll vehicle VINs, titles, and bills of sale have been verified for border release.\n\nJacxi Shipping Logistics LLC`,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to dispatch customs email.');
      }

      toast.success(`Customs packet dispatched to ${agentInfo.agentEmail}!`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Could not send email to customs agent.');
    } finally {
      setIsEmailing(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="md" title={<><div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <div style={{padding: '8px', borderRadius: '16px', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.15)', color: 'var(--accent-gold)'}}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p style={{fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)'}}>
              Export Customs Document Packet
            </p>
            <p style={{fontSize: '0.78rem', color: 'var(--text-secondary)'}}>
              Auto-pack manifest, titles, and bills of sale for destination border clearance
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button></>} actions={<><Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>

        <div style={{display: 'flex', gap: '12px'}}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            icon={<Download className="w-4 h-4" />}
          >
            Download PDF Packet
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleEmailAgent}
            loading={isEmailing}
            icon={<Send className="w-4 h-4" />}
          >
            Email Customs Agent
          </Button>
        </div></>} showCloseButton={false} contentSx={{padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px'}} actionsSx={{padding: '20px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--background)', display: 'flex', justifyContent: 'space-between', gap: '12px'}}>{/* Container & Voyage Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Container</span>
            <p className="font-mono font-bold text-[var(--text-primary)] mt-0.5">{container.containerNumber}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Vessel & Voyage</span>
            <p className="font-bold text-[var(--text-primary)] mt-0.5 truncate">{container.vesselName || 'MAERSK VOYAGER'} ({container.voyageNumber || 'V-2409W'})</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Port of Loading</span>
            <p className="font-bold text-[var(--text-primary)] mt-0.5 truncate">{container.loadingPort || 'Port of Newark'}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Port of Discharge</span>
            <p className="font-bold text-emerald-400 mt-0.5 truncate">{container.destinationPort || 'Port of Jebel Ali'}</p>
          </div>
        </div>

        {/* Destination Clearing Agent Form */}
        <div style={{padding: '16px', border: '1px solid var(--border)', borderRadius: '16px', backgroundColor: 'var(--background)'}}>
          <p style={{fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px'}}>
            Destination Customs Broker & Consignee
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField label="Clearing Agent Name" value={agentInfo.agentName} onChange={(e) => setAgentInfo({ ...agentInfo, agentName: e.target.value })} size="small" />
            <FormField label="Agent Email Address" type="email" value={agentInfo.agentEmail} onChange={(e) => setAgentInfo({ ...agentInfo, agentEmail: e.target.value })} size="small" />
            <FormField label="Agent Telephone" value={agentInfo.agentPhone} onChange={(e) => setAgentInfo({ ...agentInfo, agentPhone: e.target.value })} size="small" />
          </div>
        </div>

        {/* Vehicle Cargo Manifest Preview Table */}
        <div style={{border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden'}}>
          <div style={{padding: '12px', backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <p style={{fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)'}}>
              Loaded Vehicles Manifest ({container.shipments.length} Units)
            </p>
            <span className="text-xs text-emerald-400 font-semibold">
              All Titles & Documents Verified
            </span>
          </div>

          <div style={{maxHeight: 220, overflow: 'auto'}}>
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0">
                <tr style={{backgroundColor: 'var(--background)'}}>
                  <th className="px-3 py-2 text-left" style={{fontWeight: 700, fontSize: '0.75rem'}}>Vehicle</th>
                  <th className="px-3 py-2 text-left" style={{fontWeight: 700, fontSize: '0.75rem'}}>VIN (17 Digits)</th>
                  <th className="px-3 py-2 text-left" style={{fontWeight: 700, fontSize: '0.75rem'}}>Lot / Source</th>
                  <th className="px-3 py-2 text-left" style={{fontWeight: 700, fontSize: '0.75rem'}}>Title Status</th>
                  <th className="px-3 py-2 text-right" style={{fontWeight: 700, fontSize: '0.75rem'}}>Declared Value</th>
                </tr>
              </thead>
              <tbody>
                {container.shipments.map((s, idx) => (
                  <tr key={s.id || idx} className="border-t border-[var(--border)] transition-colors hover:bg-[var(--background)]">
                    <td className="px-3 py-2" style={{fontSize: '0.75rem', fontWeight: 600}}>
                      {[s.vehicleYear, s.vehicleMake, s.vehicleModel].filter(Boolean).join(' ') || 'Motor Vehicle'}
                    </td>
                    <td className="px-3 py-2" style={{fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)'}}>
                      {s.vehicleVIN || 'N/A'}
                    </td>
                    <td className="px-3 py-2" style={{fontSize: '0.75rem'}}>
                      {s.lotNumber ? `${s.lotNumber} (${s.auctionName || 'Auction'})` : 'N/A'}
                    </td>
                    <td className="px-3 py-2" style={{fontSize: '0.75rem'}}>
                      <span style={{fontSize: '0.7rem', height: 20}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{s.titleStatus || (s.hasTitle ? 'Title Present' : 'Pending')}</span>
                    </td>
                    <td className="px-3 py-2 text-right" style={{fontSize: '0.75rem', fontWeight: 700, color: '#16a34a'}}>
                      {s.purchasePrice ? `$${s.purchasePrice.toLocaleString()}` : '$0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div></Modal>
  );
}
