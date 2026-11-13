'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Image as ImageIcon, 
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, FormField, IconButton, Modal, Select } from '@/components/design-system';
import { FileUpload } from '@/components/ui/FileUpload';
import DocumentPreviewModal from '@/components/documents/DocumentPreviewModal';

interface Document {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  uploadedBy: string;
  createdAt: string;
  type: string;
  size: number;
  isPublic?: boolean;
}

interface DocumentManagerProps {
  documents: Document[];
  entityId: string;
  entityType: 'shipment' | 'container';
  readOnly?: boolean;
  onDocumentsChange?: () => void;
}

type ExtractionReview = {
  fileUrl: string;
  fileType: string;
  fileSize: number;
  name: string;
  category: string;
  description: string;
  tags: string[];
  summary: string;
  extractedTextPreview: string;
  failureReason?: string | null;
  extractionMethod?: string;
  ocrAttempted?: boolean;
  aiInteractionLogId?: string;
  isCompanyDocument: boolean;
};

type EditingStatusDocument = {
  id: string;
  name: string;
  isPublic: boolean;
};

export function DocumentManager({
  documents: initialDocs,
  entityId,
  entityType,
  readOnly = false,
  onDocumentsChange,
}: DocumentManagerProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>(initialDocs);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [category, setCategory] = useState('OTHER');
  const [isProcessing, setIsProcessing] = useState(false);
  const [review, setReview] = useState<ExtractionReview | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const [reviewTags, setReviewTags] = useState('');
  const [isCompanyDocument, setIsCompanyDocument] = useState(false);
  const [statusEditor, setStatusEditor] = useState<EditingStatusDocument | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  const previewDocIndex = previewDoc ? documents.findIndex((d) => d.id === previewDoc.id) : -1;
  const hasPrevDoc = previewDocIndex > 0;
  const hasNextDoc = previewDocIndex >= 0 && previewDocIndex < documents.length - 1;
  const handlePrevDoc = () => {
    if (hasPrevDoc) setPreviewDoc(documents[previewDocIndex - 1]);
  };
  const handleNextDoc = () => {
    if (hasNextDoc) setPreviewDoc(documents[previewDocIndex + 1]);
  };

  useEffect(() => {
    setDocuments(initialDocs);
  }, [initialDocs]);

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
          entityType: entityType.toUpperCase(),
          entityId,
          categoryHint: category,
        }),
      });

      const extracted = await extractRes.json().catch(() => ({}));
      if (!extractRes.ok) {
        throw new Error(extracted.error || 'Failed to extract document metadata');
      }

      setReview({
        fileUrl: url,
        fileType: file.type,
        fileSize: file.size,
        name: extracted.suggestedName || file.name,
        category: extracted.suggestedCategory || category,
        description: extracted.description || '',
        tags: Array.isArray(extracted.tags) ? extracted.tags : [],
        summary: extracted.summary || 'No summary available.',
        extractedTextPreview: extracted.extractedTextPreview || 'No extracted text available.',
        failureReason: extracted.failureReason || null,
        extractionMethod: extracted.extractionMethod,
        ocrAttempted: Boolean(extracted.ocrAttempted),
        aiInteractionLogId: extracted.aiInteractionLogId,
        isCompanyDocument,
      });
      setReviewTags(Array.isArray(extracted.tags) ? extracted.tags.join(', ') : '');
      setIsUploadOpen(false);

    } catch (error: any) {
      console.error('Upload error:', error);
      throw error; // Re-throw so FileUpload shows error state
    }
  };

  const saveReviewedDocument = async () => {
    if (!review) return;

    try {
      setSavingReview(true);
      const payload = {
        name: review.name,
        description: review.description,
        fileUrl: review.fileUrl,
        fileType: review.fileType,
        fileSize: review.fileSize,
        ...(entityType === 'container'
          ? {
              type: review.category,
              notes: `AI extraction review${review.aiInteractionLogId ? ` (${review.aiInteractionLogId})` : ''}: ${review.summary}`,
            }
          : {
              category: review.category,
              shipmentId: entityId,
              isPublic: !review.isCompanyDocument,
              tags: reviewTags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            }),
      };

      const endpoint = entityType === 'container' ? `/api/containers/${entityId}/documents` : '/api/documents';
      const createRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const createdData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        throw new Error(createdData.error || createdData.message || 'Failed to save document metadata');
      }

      const createdDoc = createdData.document;
      if (createdDoc) {
        setDocuments((prev) => [
          {
            id: createdDoc.id,
            name: createdDoc.name,
            fileUrl: createdDoc.fileUrl,
            fileType: createdDoc.fileType,
            fileSize: createdDoc.fileSize,
            category: createdDoc.category || createdDoc.type || review.category,
            uploadedBy: createdDoc.uploadedBy,
            createdAt: (createdDoc.createdAt || createdDoc.uploadedAt || new Date().toISOString()).toString(),
            type: createdDoc.fileType || createdDoc.type || review.fileType,
            size: createdDoc.fileSize || review.fileSize,
            isPublic: createdDoc.isPublic,
          },
          ...prev,
        ]);
      }

      setReview(null);
      setReviewTags('');
      setIsCompanyDocument(false);
      onDocumentsChange?.();
      router.refresh();
      toast.success('Document saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save document');
    } finally {
      setSavingReview(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const endpoint = entityType === 'container'
        ? `/api/containers/${entityId}/documents?documentId=${docId}`
        : `/api/documents/${docId}`; // Assuming shipment docs use this

      const response = await fetch(endpoint, { method: 'DELETE' });

      if (!response.ok) throw new Error('Failed to delete document');

      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      onDocumentsChange?.();
      toast.success('Document deleted');
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const handleOpenStatusEditor = (doc: Document) => {
    setStatusEditor({
      id: doc.id,
      name: doc.name,
      isPublic: doc.isPublic !== false,
    });
  };

  const handleSaveStatus = async () => {
    if (!statusEditor) return;

    try {
      setSavingStatus(true);
      const response = await fetch(`/api/documents/${statusEditor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: statusEditor.isPublic }),
      });

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to update document status');
      }

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === statusEditor.id
            ? {
                ...doc,
                isPublic: statusEditor.isPublic,
              }
            : doc
        )
      );

      setStatusEditor(null);
      onDocumentsChange?.();
      router.refresh();
      toast.success('Document status updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update document status');
    } finally {
      setSavingStatus(false);
    }
  };

  const getIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
        <h6 style={{fontWeight: 600}} className="text-[0.95rem] font-semibold leading-tight">
          Documents
        </h6>
        {!readOnly && (
          <Button onClick={() => setIsUploadOpen(true)} style={{backgroundColor: 'var(--accent-gold)', color: 'var(--background)'}} variant="primary" size="md" icon={<Upload size={18} />} iconPosition="start">
            Upload
          </Button>
        )}
      </div>

      {documents.length === 0 ? (
        <div style={{padding: '32px', textAlign: 'center', backgroundColor: 'var(--background)', borderStyle: 'dashed'}} className="rounded-xl border border-[var(--border)] bg-[var(--panel)]">
          <FileText className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-2 opacity-50" />
          <p style={{color: 'var(--text-secondary)'}}>
            No documents attached yet
          </p>
        </div>
      ) : (
        <ul style={{backgroundColor: 'var(--panel)', borderRadius: '16px', border: '1px solid var(--border)'}} className="list-none">
          {documents.map((doc, index) => (
            <div key={doc.id}>
              <li>
                <span className="flex shrink-0 items-center justify-center text-[var(--text-secondary)]">
                  {getIcon(doc.type)}
                </span>
                <div><span className="block text-[0.875rem] font-medium text-[var(--text-primary)]">{
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <p style={{fontWeight: 500}} className="text-[0.875rem] font-medium">
                            {doc.name}
                        </p>
                        <span style={{fontSize: '0.65rem', height: 20}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{doc.category.replace('_', ' ')}</span>
                        {doc.isPublic === false ? (
                          <span style={{fontSize: '0.65rem', height: 20}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[rgba(var(--warning-rgb),0.4)] bg-[rgba(var(--warning-rgb),0.12)] text-[var(--warning-dark)]">"Company Only"</span>
                        ) : null}
                    </div>
                  }</span><span className="block text-[0.75rem] text-[var(--text-secondary)]">{
                    <span className="text-[0.75rem]" style={{color: 'var(--text-secondary)'}}>
                      {formatSize(doc.size)} • Uploaded by {doc.uploadedBy} • {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                  }</span></div>
                <span className="ml-auto flex shrink-0 items-center">
                  {!readOnly && entityType === 'shipment' && (
                    <IconButton  style={{marginRight: '8px'}} onClick={() => handleOpenStatusEditor(doc)} variant="ghost" size="md" ariaLabel="edit status" icon={<span style={{fontWeight: 600}} className="text-[0.75rem]">
                        Edit Status
                      </span>}></IconButton>
                  )}
                  <IconButton  style={{marginRight: '8px', color: 'var(--accent-gold)'}} onClick={() => setPreviewDoc(doc)} title="Preview document" variant="ghost" size="md" ariaLabel="preview" icon={<Eye className="w-4 h-4" />}></IconButton>
                  <IconButton  style={{marginRight: '8px'}} href={doc.fileUrl} target="_blank" variant="ghost" size="md" ariaLabel="download" icon={<Download className="w-4 h-4" />}></IconButton>
                  {!readOnly && (
                    <IconButton  onClick={() => handleDelete(doc.id)} variant="ghost" size="md" ariaLabel="delete" className="!text-[var(--error)]" icon={<Trash2 className="w-4 h-4" />}></IconButton>
                  )}
                </span>
              </li>
              {index < documents.length - 1 && <li role="separator" className="border-t border-[var(--border)]" />}
            </div>
          ))}
        </ul>
      )}

      {/* Upload Modal */}
      <Modal
        open={isUploadOpen}
        onClose={() => {
          if (!isProcessing) {
            setIsUploadOpen(false);
            setIsCompanyDocument(false);
          }
        }}
        title="Upload Documents"
        description="Assign the right category first, then upload a single file. The document becomes searchable once processing finishes."
        disableBackdropClick={true}
        showCloseButton={!isProcessing}
      >
        <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
            <div style={{padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderRadius: '24px', backgroundColor: 'var(--background)'}} className="rounded-xl border border-[var(--border)] bg-[var(--panel)]">
              <p style={{fontWeight: 700, color: 'var(--text-primary)'}} className="text-[0.875rem] font-medium">
                Supported formats
              </p>
              <p style={{color: 'var(--text-secondary)', lineHeight: 1.6}} className="text-[0.875rem]">
                PDF, JPG, PNG, DOC, DOCX, XLS, and XLSX. Upload one document at a time so the category and extracted details stay accurate.
              </p>
            </div>
            
            <FormField label="Document Category">
                <Select
                    label="Category"
                    value={category}
                    onChange={(e) => setCategory(String(e))}
                    disabled={isProcessing}
                    options={[
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
                    ]}
                />
            </FormField>

            {entityType === 'shipment' && (
              <div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]"><input type="checkbox" checked={isCompanyDocument} onChange={(event) => setIsCompanyDocument(event.target.checked)} className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50" /><span>Company document (hide from customer)</span></label>
                <span style={{color: 'var(--text-secondary)'}} className="text-[0.75rem]">
                  Checked documents are visible to internal users only.
                </span>
              </div>
            )}

            <div style={{border: '1px solid var(--border)', borderRadius: '24px', padding: '16px', backgroundColor: 'var(--panel)'}}>
              <FileUpload 
                multiple={false}
                maxFiles={1}
                uploadHandler={handleFileUpload}
                onProcessingChange={setIsProcessing}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              />
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '16px'}}>
                <Button onClick={() => {
                      setIsUploadOpen(false);
                      setIsCompanyDocument(false);
                    }} disabled={isProcessing} style={{color: 'var(--text-secondary)'}} variant="primary" size="md">
                    {isProcessing ? 'Uploading...' : 'Done'}
                </Button>
            </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(statusEditor)}
        onClose={() => !savingStatus && setStatusEditor(null)}
        title="Edit Document Status"
        description="Update visibility for this shipment document."
        disableBackdropClick={true}
        showCloseButton={!savingStatus}
      >
        {statusEditor && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            <p style={{color: 'var(--text-secondary)'}} className="text-[0.875rem]">
              {statusEditor.name}
            </p>

            <FormField label="Visibility Status">
              <Select
                label="Status"
                value={statusEditor.isPublic ? 'CUSTOMER_VISIBLE' : 'COMPANY_ONLY'}
                onChange={(value) =>
                  setStatusEditor((prev) =>
                    prev
                      ? {
                          ...prev,
                          isPublic: String(value) === 'CUSTOMER_VISIBLE',
                        }
                      : prev
                  )
                }
                options={[
                  { value: 'CUSTOMER_VISIBLE', label: 'Customer Visible' },
                  { value: 'COMPANY_ONLY', label: 'Company Only' },
                ]}
              />
            </FormField>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '16px'}}>
              <Button onClick={() => setStatusEditor(null)} disabled={savingStatus} variant="outline" size="md">
                Cancel
              </Button>
              <Button onClick={handleSaveStatus} disabled={savingStatus} variant="primary" size="md">
                {savingStatus ? 'Saving...' : 'Save Status'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(review)}
        onClose={() => !savingReview && setReview(null)}
        title="Review Extracted Document Details"
        disableBackdropClick={true}
        showCloseButton={!savingReview}
      >
        {review && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            <div style={{padding: '16px', backgroundColor: 'var(--background)'}} className="rounded-xl border border-[var(--border)] bg-[var(--panel)]">
              <p style={{fontWeight: 600, marginBottom: '8px'}} className="text-[0.875rem] font-medium">
                AI Summary
              </p>
              <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px'}}>
                {review.extractionMethod && (
                  <span className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{`Extraction: ${review.extractionMethod}`}</span>
                )}
                {review.ocrAttempted && (
                  <span className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[rgba(var(--warning-rgb),0.4)] bg-[rgba(var(--warning-rgb),0.12)] text-[var(--warning-dark)]">"OCR attempted"</span>
                )}
              </div>
              <p style={{color: 'var(--text-secondary)', marginBottom: '12px'}} className="text-[0.875rem]">
                {review.summary}
              </p>
              <span style={{color: 'var(--text-secondary)'}} className="text-[0.75rem]">
                {review.extractedTextPreview}
              </span>
            </div>

            {review.failureReason && (
              <div style={{padding: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.35)'}} className="rounded-xl border border-[var(--border)] bg-[var(--panel)]">
                <AlertTriangle className="w-4 h-4" style={{ color: 'rgb(180, 83, 9)', marginTop: 2 }} />
                <p style={{color: 'rgb(146, 64, 14)'}} className="text-[0.875rem]">
                  {review.failureReason}
                </p>
              </div>
            )}

            <FormField label="Document Name" value={review.name} onChange={(event) => setReview((prev) => (prev ? { ...prev, name: event.target.value } : prev))} size="small" />

            <FormField label="Document Category">
              <Select
                label="Category"
                value={review.category}
                onChange={(value) => setReview((prev) => (prev ? { ...prev, category: String(value) } : prev))}
                options={[
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
                ]}
              />
            </FormField>

            <FormField label="Description" value={review.description} onChange={(event) => setReview((prev) => (prev ? { ...prev, description: event.target.value } : prev))} multiline minRows={3} size="small" />

            {entityType === 'shipment' && (
              <>
                <FormField label="Tags" value={reviewTags} onChange={(event) => setReviewTags(event.target.value)} helperText="Comma-separated tags" size="small" />
                <div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]"><input type="checkbox" checked={review.isCompanyDocument} onChange={(event) =>
                          setReview((prev) => (prev ? { ...prev, isCompanyDocument: event.target.checked } : prev))
                        } className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50" /><span>Company document (hide from customer)</span></label>
                  <span style={{color: 'var(--text-secondary)'}} className="text-[0.75rem]">
                    Checked documents are stored as internal-only and hidden from customer shipment views.
                  </span>
                </div>
              </>
            )}

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '16px'}}>
              <Button onClick={() => {
                  setReview(null);
                  setIsCompanyDocument(false);
                }} disabled={savingReview} variant="outline" size="md">
                Cancel
              </Button>
              <Button onClick={saveReviewedDocument} disabled={savingReview} variant="primary" size="md">
                {savingReview ? 'Saving...' : 'Save Document'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* In-app Document Preview Modal */}
      <DocumentPreviewModal
        open={Boolean(previewDoc)}
        document={previewDoc ? {
          id: previewDoc.id,
          name: previewDoc.name,
          fileUrl: previewDoc.fileUrl,
          fileType: previewDoc.fileType || previewDoc.type || '',
          fileSize: previewDoc.fileSize || previewDoc.size || 0,
          category: previewDoc.category,
          uploadedBy: previewDoc.uploadedBy,
          createdAt: previewDoc.createdAt,
        } : null}
        onClose={() => setPreviewDoc(null)}
        hasPrev={hasPrevDoc}
        hasNext={hasNextDoc}
        onNavigatePrev={handlePrevDoc}
        onNavigateNext={handleNextDoc}
      />
    </div>
  );
}

