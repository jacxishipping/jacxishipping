'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Brain, CheckCircle2, FileText, Folder, Newspaper, Search as SearchIcon, ShieldCheck, Upload, Eye, Receipt, Printer, ExternalLink, Download } from 'lucide-react';
import { Box, Typography } from '@mui/material';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { 
    PageHeader, 
    StatsCard, 
    Button, 
    EmptyState, 
    FormField, 
    Breadcrumbs, 
    toast, 
    DashboardPageSkeleton, 
    Modal,
    Select,
    StatusBadge
} from '@/components/design-system';
import { FileUpload } from '@/components/ui/FileUpload';
import { AiDocumentOcrModal } from '@/components/documents/AiDocumentOcrModal';
import { AnnouncementGeneratorModal } from '@/components/documents/AnnouncementGeneratorModal';
import DocumentPreviewModal from '@/components/documents/DocumentPreviewModal';
import InvoicePreviewModal from '@/components/invoices/InvoicePreviewModal';
import { formatMoney as formatCurrency } from '@/lib/format';

interface Document {
    id: string;
    name: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    category: string;
    uploadedBy: string;
    createdAt: string;
    updatedAt?: string;
    status?: string;
}

type ExtractionResult = {
    suggestedName?: string;
    suggestedCategory?: string;
    description?: string;
    tags?: string[];
    summary?: string;
    extractedTextPreview?: string;
    failureReason?: string | null;
    extractionMethod?: string;
    ocrAttempted?: boolean;
    aiInteractionLogId?: string;
};

const DOCUMENT_CATEGORY_OPTIONS = [
    { value: 'INVOICE', label: 'Invoice' },
    { value: 'BILL_OF_LADING', label: 'Bill of Lading' },
    { value: 'CUSTOMS', label: 'Customs' },
    { value: 'INSURANCE', label: 'Insurance' },
    { value: 'TITLE', label: 'Title' },
    { value: 'INSPECTION_REPORT', label: 'Inspection Report' },
    { value: 'EXPORT_DOCUMENT', label: 'Export Document' },
    { value: 'PACKING_LIST', label: 'Packing List' },
    { value: 'CONTRACT', label: 'Contract' },
    { value: 'PHOTO', label: 'Photo' },
    { value: 'OTHER', label: 'Other' },
];

const DOCUMENT_CATEGORY_VALUES = new Set(DOCUMENT_CATEGORY_OPTIONS.map((option) => option.value));

function getSafeDocumentCategory(value: string | undefined, fallback: string) {
    return value && DOCUMENT_CATEGORY_VALUES.has(value)
        ? value
        : fallback;
}

type DocumentCategory = {
	id: string;
	title: string;
	description: string;
	icon: any;
	iconColor: string;
	iconBg: string;
	documents: Document[];
};

export default function DocumentsPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	
    // State
    const [documents, setDocuments] = useState<Document[]>([]);
	const [search, setSearch] = useState('');
	const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // Preview & Tab State
    const [activeTab, setActiveTab] = useState<'documents' | 'invoices'>('documents');
    const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
    const [previewInvoice, setPreviewInvoice] = useState<{ id: string; invoiceNumber?: string; customerName?: string; totalAmount?: number; status?: string } | null>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    // Upload & OCR State
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isOcrOpen, setIsOcrOpen] = useState(false);
    const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
    const [category, setCategory] = useState('OTHER');
    const [isProcessing, setIsProcessing] = useState(false);

	const fetchDocuments = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '50', // Fetch more to populate categories
                search: search
            });
            
            const response = await fetch(`/api/documents?${params}`);
            if (response.ok) {
                const data = await response.json();
                setDocuments(data.documents);
                setTotalPages(data.pagination.pages);
            }
        } catch (error) {
            console.error('Failed to fetch documents:', error);
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const fetchInvoices = async () => {
        setLoadingInvoices(true);
        try {
            const response = await fetch('/api/invoices?limit=40');
            if (response.ok) {
                const data = await response.json();
                setInvoices(data.invoices || []);
            }
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
        } finally {
            setLoadingInvoices(false);
        }
    };

	useEffect(() => {
		if (status === 'authenticated') {
			fetchDocuments();
            fetchInvoices();
		}
        // eslint-disable-next-line react-hooks/exhaustive-deps
	}, [status, page, search]); // Debounce search in real app

    const currentDocIndex = useMemo(() => {
        if (!previewDocument) return -1;
        return documents.findIndex(d => d.id === previewDocument.id);
    }, [previewDocument, documents]);

    const hasPrevDoc = currentDocIndex > 0;
    const hasNextDoc = currentDocIndex >= 0 && currentDocIndex < documents.length - 1;

    const handlePrevDoc = () => {
        if (hasPrevDoc) setPreviewDocument(documents[currentDocIndex - 1]);
    };

    const handleNextDoc = () => {
        if (hasNextDoc) setPreviewDocument(documents[currentDocIndex + 1]);
    };

    const handleFileUpload = async (file: File) => {
        try {
          // 1. Upload file to blob storage
          const formData = new FormData();
          formData.append('file', file);
    
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
    
          if (!uploadRes.ok) {
            const error = await uploadRes.json();
            throw new Error(error.message || 'File upload failed');
          }
    
          const { url } = await uploadRes.json();
    
          const extractRes = await fetch('/api/ai/document-extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'document-review',
                fileUrl: url,
                fileName: file.name,
                fileType: file.type,
                entityType: 'DOCUMENT',
                categoryHint: category,
            }),
          });

          const extracted = (await extractRes.json().catch(() => ({}))) as ExtractionResult & { error?: string };
          if (!extractRes.ok) {
            throw new Error(extracted.error || 'Document was uploaded, but AI extraction failed before it could be saved.');
          }

          const extractionNotes = [
            extracted.summary,
            extracted.failureReason ? `AI extraction note: ${extracted.failureReason}` : null,
            extracted.extractionMethod ? `Extraction method: ${extracted.extractionMethod}` : null,
            extracted.ocrAttempted ? 'OCR was attempted for this file.' : null,
            extracted.aiInteractionLogId ? `AI log: ${extracted.aiInteractionLogId}` : null,
          ].filter(Boolean).join('\n\n');
          const description = [extracted.description, extractionNotes].filter(Boolean).join('\n\n') || null;

          // 2. Create document record with reviewed AI metadata
          const payload = {
            name: extracted.suggestedName || file.name,
            fileUrl: url,
            fileType: file.type,
            fileSize: file.size,
            category: getSafeDocumentCategory(extracted.suggestedCategory, category),
            description,
            tags: Array.isArray(extracted.tags) ? extracted.tags : [],
            userId: session?.user?.id,
          };
    
          const createRes = await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
    
          if (!createRes.ok) {
            const error = await createRes.json();
            throw new Error(error.error || error.message || 'Failed to save document metadata');
          }
    
          if (extracted.failureReason) {
            toast.warning('Document saved with AI extraction note', { description: extracted.failureReason });
          } else {
            toast.success('Document saved with AI details');
          }

          fetchDocuments();
    
        } catch (error: any) {
          console.error('Upload error:', error);
          throw error;
        }
    };

	const categories = useMemo<DocumentCategory[]>(
		() => {
			const complianceTypes = ['CUSTOMS', 'INSURANCE', 'TITLE', 'INSPECTION_REPORT', 'CONTRACT'];
            const templateTypes = ['TEMPLATE', 'INVOICE', 'BILL_OF_LADING']; // Mapping some types to "Templates" concept if needed

			return [
				{
					id: 'templates',
					title: 'Company Documents',
					description: 'Invoices, Bills of Lading, and other operational documents.',
					icon: FileText,
					iconColor: 'var(--accent-gold)',
					iconBg: 'rgba(var(--accent-gold-rgb), 0.12)',
					documents: documents.filter(doc => templateTypes.includes(doc.category)),
				},
				{
					id: 'uploads',
					title: 'General Uploads',
					description: 'Miscellaneous files and photos uploaded to the system.',
					icon: Upload,
					iconColor: 'var(--info)',
					iconBg: 'rgba(var(--info-rgb), 0.12)',
					documents: documents.filter(doc => doc.category === 'OTHER' || doc.category === 'PHOTO'),
				},
				{
					id: 'compliance',
					title: 'Compliance & Security',
					description: 'Customs declarations, insurance policies, and titles.',
					icon: ShieldCheck,
					iconColor: 'var(--success)',
					iconBg: 'rgba(var(--success-rgb), 0.12)',
					documents: documents.filter(doc => complianceTypes.includes(doc.category)),
				},
			];
		},
		[documents]
	);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

	useEffect(() => {
		if (status === 'loading') return;
		const role = session?.user?.role;
		if (!session || role !== 'admin') {
			router.replace('/dashboard');
		}
	}, [session, status, router]);

	const role = session?.user?.role;
	if (status === 'loading' || !session || role !== 'admin') {
		return <DashboardPageSkeleton />;
	}

	return (
		<DashboardSurface>
			<PageHeader
				showBreadcrumbs
				title="Documents"
				description="Manage templates, uploads, and compliance documents"
				actions={
					<div className="flex items-center gap-2">
						<Button 
							variant="primary" 
							icon={<Newspaper className="w-4 h-4 text-slate-900" />} 
							size="sm" 
							onClick={() => setIsAnnouncementOpen(true)}
						>
							Create Announcement
						</Button>
						<Button 
							variant="outline" 
							icon={<Brain className="w-4 h-4 text-[var(--accent-gold)]" />} 
							size="sm" 
							onClick={() => setIsOcrOpen(true)}
						>
							AI Document OCR
						</Button>
						<Button variant="outline" icon={<Upload className="w-4 h-4" />} size="sm" onClick={() => setIsUploadOpen(true)}>
							Upload Document
						</Button>
					</div>
				}
			/>

			{/* Stats */}
			<DashboardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
				<div 
					onClick={() => setActiveTab('documents')} 
					className="cursor-pointer transition-transform hover:scale-[1.01]"
					role="button"
					tabIndex={0}
					onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveTab('documents'); }}
				>
					<StatsCard
						icon={<FileText style={{ fontSize: 18 }} />}
						title="Total Documents"
						value={documents.length}
						subtitle={activeTab === 'documents' ? 'Viewing Documents' : 'Click to View'}
					/>
				</div>
                <StatsCard
                    icon={<Folder style={{ fontSize: 18 }} />}
                    title="Categories"
                    value={categories.filter(c => c.documents.length > 0).length}
                    variant="info"
                    size="md"
                />
				<div 
					onClick={() => {
						setActiveTab('invoices');
						if (invoices.length === 0) fetchInvoices();
					}} 
					className="cursor-pointer transition-transform hover:scale-[1.01]"
					role="button"
					tabIndex={0}
					onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setActiveTab('invoices'); if (invoices.length === 0) fetchInvoices(); } }}
				>
					<StatsCard
						icon={<Receipt style={{ fontSize: 18 }} />}
						title="Official Invoices"
						value={invoices.length}
						variant="success"
						size="md"
						subtitle={activeTab === 'invoices' ? 'Viewing Invoices' : 'Click to Preview'}
					/>
				</div>
                <div 
                    onClick={() => setIsAnnouncementOpen(true)} 
                    className="cursor-pointer transition-transform hover:scale-[1.01]"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsAnnouncementOpen(true); }}
                >
                    <StatsCard
                        icon={<Newspaper style={{ fontSize: 18 }} />}
                        title="Announcements"
                        value="Letterhead"
                        variant="warning"
                        size="md"
                        subtitle="Click to Generate"
                    />
                </div>
			</DashboardGrid>

            {/* Official Announcement Generator Banner */}
            <div 
                className="relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all"
                style={{
                    backgroundColor: 'var(--panel)',
                    borderColor: 'var(--border)',
                    borderTop: '2px solid rgba(var(--accent-gold-rgb), 0.5)',
                }}
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[rgba(var(--accent-gold-rgb),0.12)] border border-[rgba(var(--accent-gold-rgb),0.25)] flex items-center justify-center text-[var(--accent-gold)] shrink-0">
                            <Newspaper className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-bold text-[var(--text-primary)]">Official Announcement & Circular Generator</h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                    Jacxi Shipping Letterhead
                                </span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
                                Generate official Jacxi Shipping announcements and news documents in PDF matching the company letterhead. Simply enter Date, Title, and Body text to print or export.
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        icon={<Newspaper className="w-4 h-4 text-slate-950" />}
                        onClick={() => setIsAnnouncementOpen(true)}
                        className="shrink-0"
                    >
                        Create Announcement
                    </Button>
                </div>
            </div>

			{/* Document vs Invoice Hub Tab Switcher */}
			<div className="flex items-center gap-2 border-b border-[var(--border)] pb-3 mt-2">
				<button
					type="button"
					onClick={() => setActiveTab('documents')}
					className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
						activeTab === 'documents'
							? 'bg-[var(--accent-gold)] text-white'
							: 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
					}`}
				>
					<FileText className="w-4 h-4" />
					<span>Company Documents ({documents.length})</span>
				</button>
				<button
					type="button"
					onClick={() => {
						setActiveTab('invoices');
						if (invoices.length === 0) fetchInvoices();
					}}
					className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
						activeTab === 'invoices'
							? 'bg-[var(--accent-gold)] text-white'
							: 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
					}`}
				>
					<Receipt className="w-4 h-4" />
					<span>Official Invoices ({invoices.length})</span>
				</button>
			</div>

			{/* TAB 1: ALL COMPANY & UPLOADED DOCUMENTS */}
			{activeTab === 'documents' && (
				<>
					{/* Search */}
					<DashboardPanel title="Search Documents" description="Find documents by name">
						<FormField
							label=""
							placeholder="Search documents..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							leftIcon={<SearchIcon style={{ fontSize: 20, color: 'var(--text-secondary)' }} />}
						/>
					</DashboardPanel>

					{/* Categories */}
					{documents.length === 0 && !loading ? (
						<DashboardPanel fullHeight>
							<EmptyState
								icon={<FileText />}
								title="No documents found"
								description={search ? `No documents match "${search}".` : "Upload your first document to get started."}
								action={
									<Button variant="primary" onClick={() => setIsUploadOpen(true)}>
										Upload Document
									</Button>
								}
							/>
						</DashboardPanel>
					) : (
						categories.filter(c => c.documents.length > 0).map((category) => {
							const Icon = category.icon;
							return (
								<DashboardPanel
									key={category.id}
									title={category.title}
									description={category.description}
									actions={
										<Box
											sx={{
												width: 40,
												height: 40,
												borderRadius: 2,
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												bgcolor: category.iconBg,
												color: category.iconColor,
											}}
										>
											<Icon style={{ fontSize: 20 }} />
										</Box>
									}
								>
									<DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
										{category.documents.map((document) => (
											<Box
												key={document.id}
												sx={{
													borderRadius: 2,
													border: '1px solid var(--border)',
													background: 'var(--panel)',
													boxShadow: '0 8px 20px rgba(var(--text-primary-rgb), 0.06)',
													p: 2.5,
													cursor: 'pointer',
													transition: 'all 0.2s ease',
													display: 'flex',
													flexDirection: 'column',
													justifyContent: 'space-between',
													'&:hover': {
														transform: 'translateY(-2px)',
														boxShadow: '0 16px 32px rgba(var(--text-primary-rgb), 0.1)',
														borderColor: category.iconColor,
													},
												}}
												onClick={() => setPreviewDocument(document)}
											>
												<div>
													<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1.5 }}>
														<Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', flex: 1, wordBreak: 'break-all' }}>
															{document.name}
														</Typography>
														<Box
															sx={{
																px: 1,
																py: 0.5,
																borderRadius: 1,
																fontSize: '0.65rem',
																fontWeight: 700,
																textTransform: 'uppercase',
																bgcolor: 'var(--surface-subtle)',
																border: '1px solid var(--border)',
																color: 'var(--text-secondary)',
																ml: 1,
																shrink: 0,
															}}
														>
															{document.fileType.split('/')[1] || 'FILE'}
														</Box>
													</Box>

													<Box sx={{ display: 'flex', gap: 2, mb: 1.5, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
														<Box
															sx={{
																px: 1.5,
																py: 0.5,
																borderRadius: 1,
																bgcolor: 'var(--surface-subtle)',
																border: '1px solid var(--border-subtle)',
																textTransform: 'capitalize',
																fontWeight: 600,
															}}
														>
															{document.category.replace('_', ' ').toLowerCase()}
														</Box>
														<span className="self-center font-mono">{formatSize(document.fileSize)}</span>
													</Box>
													
													<Box sx={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
														Uploaded by {document.uploadedBy} on {new Date(document.createdAt).toLocaleDateString()}
													</Box>
												</div>

												{/* Quick Preview & Download Actions */}
												<Box 
													sx={{ display: 'flex', gap: 1, mt: 2.5, pt: 1.5, borderTop: '1px solid var(--border)' }} 
													onClick={(e) => e.stopPropagation()}
												>
													<Button
														variant="primary"
														size="sm"
														icon={<Eye className="w-3.5 h-3.5 text-slate-900" />}
														onClick={() => setPreviewDocument(document)}
														className="flex-1"
													>
														Preview
													</Button>
													<Button
														variant="outline"
														size="sm"
														icon={<Download className="w-3.5 h-3.5" />}
														onClick={() => {
															const a = window.document.createElement('a');
															a.href = document.fileUrl;
															a.download = document.name;
															a.target = '_blank';
															window.document.body.appendChild(a);
															a.click();
															window.document.body.removeChild(a);
														}}
														title="Download File"
													>
														Download
													</Button>
												</Box>
											</Box>
										))}
									</DashboardGrid>
								</DashboardPanel>
							);
						})
					)}

					{/* Pagination Controls */}
					{totalPages > 1 && (
						<Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4, mb: 4 }}>
							<Button 
								variant="outline" 
								disabled={page === 1}
								onClick={() => setPage(p => Math.max(1, p - 1))}
							>
								Previous
							</Button>
							<Box sx={{ display: 'flex', alignItems: 'center' }}>
								Page {page} of {totalPages}
							</Box>
							<Button 
								variant="outline" 
								disabled={page === totalPages}
								onClick={() => setPage(p => Math.min(totalPages, p + 1))}
							>
								Next
							</Button>
						</Box>
					)}
				</>
			)}

			{/* TAB 2: OFFICIAL SYSTEM INVOICES & STATEMENTS */}
			{activeTab === 'invoices' && (
				<DashboardPanel
					title="Official Invoices"
					description="Real-time letterhead invoices generated in the system. Click Preview to view, print, or download official Jacxi Shipping invoices."
					actions={
						<Button
							variant="outline"
							size="sm"
							icon={<Receipt className="w-4 h-4" />}
							onClick={() => router.push('/dashboard/invoices')}
						>
							Manage Invoices
						</Button>
					}
				>
					{invoices.length === 0 && !loadingInvoices ? (
						<EmptyState
							icon={<Receipt />}
							title="No invoices found"
							description="No official customer invoices have been generated yet."
						/>
					) : (
						<DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
							{invoices.map((inv) => (
								<Box
									key={inv.id}
									sx={{
										borderRadius: 2,
										border: '1px solid var(--border)',
										background: 'var(--panel)',
										boxShadow: '0 8px 20px rgba(var(--text-primary-rgb), 0.06)',
										p: 2.5,
										cursor: 'pointer',
										transition: 'all 0.2s ease',
										display: 'flex',
										flexDirection: 'column',
										justifyContent: 'space-between',
										'&:hover': {
											transform: 'translateY(-2px)',
											boxShadow: '0 16px 32px rgba(var(--text-primary-rgb), 0.1)',
											borderColor: 'var(--accent-gold)',
										},
									}}
									onClick={() => setPreviewInvoice({
										id: inv.id,
										invoiceNumber: inv.invoiceNumber,
										customerName: inv.user?.name || inv.user?.email,
										totalAmount: inv.total,
										status: inv.status,
									})}
								>
									<div>
										<div className="flex items-center justify-between gap-2 mb-2">
											<span className="font-mono font-bold text-sm text-[var(--accent-gold)]">
												{inv.invoiceNumber}
											</span>
											<StatusBadge status={inv.status} size="sm" />
										</div>

										<Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', mb: 0.5 }}>
											{inv.user?.name || inv.user?.email || 'Customer'}
										</Typography>

										<div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mt-2">
											<span>Issue: {new Date(inv.issueDate || inv.createdAt).toLocaleDateString()}</span>
											<span className="font-mono font-extrabold text-sm text-[var(--text-primary)]">
												{formatCurrency(inv.total)}
											</span>
										</div>
									</div>

									{/* Action buttons */}
									<div 
										className="flex items-center gap-2 mt-4 pt-2 border-t border-[var(--border)]"
										onClick={(e) => e.stopPropagation()}
									>
										<Button
											variant="primary"
											size="sm"
											icon={<Eye className="w-3.5 h-3.5 text-slate-900" />}
											onClick={() => setPreviewInvoice({
												id: inv.id,
												invoiceNumber: inv.invoiceNumber,
												customerName: inv.user?.name || inv.user?.email,
												totalAmount: inv.total,
												status: inv.status,
											})}
											className="flex-1"
										>
											Preview
										</Button>
										<Button
											variant="outline"
											size="sm"
											icon={<Download className="w-3.5 h-3.5" />}
											onClick={() => {
												const a = window.document.createElement('a');
												a.href = `/api/invoices/${inv.id}/pdf?download=1`;
												a.download = `Invoice-${inv.invoiceNumber}.pdf`;
												window.document.body.appendChild(a);
												a.click();
												window.document.body.removeChild(a);
											}}
											title="Download PDF"
										>
											PDF
										</Button>
									</div>
								</Box>
							))}
						</DashboardGrid>
					)}
				</DashboardPanel>
			)}

            {/* Upload Modal */}
            <Modal
                open={isUploadOpen}
                onClose={() => !isProcessing && setIsUploadOpen(false)}
                title="Upload Document"
                description="AI will read trusted uploaded files, suggest the document name/category, and store searchable metadata."
                disableBackdropClick={true}
                showCloseButton={!isProcessing}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                            gap: 1.5,
                        }}
                    >
                        {[
                            {
                                icon: <Brain className="w-4 h-4" />,
                                title: 'AI review',
                                text: 'Suggests name, category, description, tags, and summary before saving.',
                            },
                            {
                                icon: <CheckCircle2 className="w-4 h-4" />,
                                title: 'File coverage',
                                text: 'Reads text PDFs, OCR-ready images, DOCX, XLSX, CSV, and plain text.',
                            },
                            {
                                icon: <AlertTriangle className="w-4 h-4" />,
                                title: 'Failure reason',
                                text: 'If AI falls back or extraction is partial, the exact reason is saved with the document.',
                            },
                        ].map((item) => (
                            <Box
                                key={item.title}
                                sx={{
                                    p: 1.5,
                                    border: '1px solid var(--border)',
                                    borderRadius: 2,
                                    bgcolor: 'var(--background)',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'var(--accent-gold)', mb: 0.75 }}>
                                    {item.icon}
                                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {item.title}
                                    </Typography>
                                </Box>
                                <Typography sx={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                                    {item.text}
                                </Typography>
                            </Box>
                        ))}
                    </Box>

                    <FormField label="Category">
                        <Select
                            label="Category"
                            value={category}
                            onChange={(e) => setCategory(String(e))}
                            disabled={isProcessing}
                            options={DOCUMENT_CATEGORY_OPTIONS}
                        />
                    </FormField>

                    <FileUpload 
                        multiple={true}
                        maxFiles={5}
                        maxSize={5}
                        uploadHandler={handleFileUpload}
                        onProcessingChange={setIsProcessing}
                        accept=".pdf,.jpg,.jpeg,.png,.csv,.doc,.docx,.xls,.xlsx"
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                        <Button 
                            variant="primary" 
                            onClick={() => setIsUploadOpen(false)}
                            disabled={isProcessing}
                        >
                            {isProcessing ? 'Uploading...' : 'Done'}
                        </Button>
                    </Box>
                </Box>
            </Modal>

            <AiDocumentOcrModal
                open={isOcrOpen}
                onClose={() => setIsOcrOpen(false)}
                onSuccess={fetchDocuments}
            />

            <AnnouncementGeneratorModal
                open={isAnnouncementOpen}
                onClose={() => setIsAnnouncementOpen(false)}
            />

			{/* In-app Document Preview Modal */}
			<DocumentPreviewModal
				open={Boolean(previewDocument)}
				document={previewDocument}
				onClose={() => setPreviewDocument(null)}
				hasPrev={hasPrevDoc}
				hasNext={hasNextDoc}
				onNavigatePrev={handlePrevDoc}
				onNavigateNext={handleNextDoc}
			/>

			{/* In-app Invoice Preview Modal */}
			<InvoicePreviewModal
				open={Boolean(previewInvoice)}
				invoiceId={previewInvoice?.id || null}
				invoiceNumber={previewInvoice?.invoiceNumber}
				customerName={previewInvoice?.customerName}
				totalAmount={previewInvoice?.totalAmount}
				status={previewInvoice?.status}
				onClose={() => setPreviewInvoice(null)}
			/>
		</DashboardSurface>
	);
}
