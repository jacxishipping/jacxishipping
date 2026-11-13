'use client';

import { useState } from 'react';
import { Key, Eye, EyeOff, Copy, Sparkles, Check } from 'lucide-react';
import { Alert, Button, IconButton, Modal, toast } from '@/components/design-system';

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string | null;
  userEmail: string;
  onSuccess?: () => void;
}

function generateSecurePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join('');
}

export default function ResetPasswordModal({
  open,
  onClose,
  userId,
  userName,
  userEmail,
  onSuccess,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const newPwd = generateSecurePassword();
    setPassword(newPwd);
    setShowPassword(true);
    setCopied(false);
    toast.info('Secure password generated');
  };

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setPassword('');
    setShowPassword(false);
    setCopied(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      toast.error('Please enter or generate a password');
      return;
    }

    if (trimmedPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/users/${userId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmedPassword }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      toast.success(data.message || 'Password updated successfully');
      handleClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  const formId = 'reset-password-form';

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="sm"
      title={
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <Key style={{ fontSize: 22, color: 'var(--accent-gold)' }} />
          <span>Reset Customer Password</span>
        </div>
      }
      description={`Assign a new login password for ${userName || userEmail}`}
      showCloseButton={!submitting}
      disableBackdropClick={submitting}
      actions={
        <>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" disabled={submitting || !password.trim()}>
            {submitting ? 'Saving...' : 'Update Password'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '8px'}}>
        <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--panel)', border: '1px solid var(--border)'}}>
          <span style={{color: 'var(--text-secondary)', display: 'block', marginBottom: '4px'}} className="text-[0.75rem]">
            Target Customer Account
          </span>
          <p style={{fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)'}}>
            {userName || 'Customer'}
          </p>
          <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace'}}>
            {userEmail}
          </p>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <p style={{fontWeight: 600, fontSize: '0.85rem'}} className="text-[0.875rem] font-medium">
              New Password *
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={handleGenerate}
              disabled={submitting}
            >
              Generate Strong
            </Button>
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password (min. 6 chars)"
              disabled={submitting}
              required
              className="ds-form-field-control w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] px-2.5 py-1.5 text-[0.8125rem] pr-20 border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]"
            />
            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
              {password && (
                <IconButton onClick={handleCopy} title="Copy password" style={{marginRight: '4px'}} variant="ghost" size="sm" ariaLabel="Copy password" icon={copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />} />
              )}
              <IconButton onClick={() => setShowPassword((prev) => !prev)} title={showPassword ? 'Hide password' : 'Show password'} variant="ghost" size="sm" ariaLabel={showPassword ? 'Hide password' : 'Show password'} icon={showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} />
            </div>
          </div>
        </div>

        {password && (
          <Alert className="text-[0.8rem]" severity="info">
            Remember to copy or share this password with the customer securely. They will use this password alongside their email ({userEmail}) to log in.
          </Alert>
        )}
      </form>
    </Modal>
  );
}
