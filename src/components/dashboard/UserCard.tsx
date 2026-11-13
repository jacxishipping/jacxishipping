"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Eye, EyeOff, Copy, Check, Package, Key } from 'lucide-react';
import { Slide, Tooltip } from '@mui/material';
import { JXBox, JXTypography, SpringButton } from '@jacxishippingorg/jx-ui-react';
import { Button } from '@/components/design-system';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt?: string;
  _count?: {
    shipments: number;
  };
}

interface UserCardProps {
  user: UserData;
  index: number;
  highlighted?: boolean;
  showEmail: boolean;
  copiedEmail: string | null;
  onToggleEmail: (id: string) => void;
  onCopyEmail: (text: string, id: string) => void;
  onDelete: (id: string) => void;
  onResetPassword?: (user: UserData) => void;
}

const formatRole = (role: string) => {
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const maskEmail = (email: string) => {
  const [username, domain] = email.split("@");
  if (username.length <= 3) {
    return `${username[0]}***@${domain}`;
  }
  return `${username.substring(0, 3)}***@${domain}`;
};

export default function UserCard({
  user,
  index,
  highlighted = false,
  showEmail,
  copiedEmail,
  onToggleEmail,
  onCopyEmail,
  onDelete,
  onResetPassword,
}: UserCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 60);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <Slide in={visible} direction="up" timeout={600}>
      <div>
        <JXBox
          surface="elevated"
          padding="none"
          className="p-3 md:p-4 !rounded-lg transition-all duration-200 hover:-translate-y-1.5"
          style={{
            backgroundColor: "var(--panel)",
            boxShadow: highlighted
              ? "0 36px 48px rgba(56,189,248,0.12)"
              : "0 18px 32px rgba(var(--text-primary-rgb), 0.08)",
            border: highlighted ? "1px solid rgba(56,189,248,0.14)" : "none",
            fontFamily: "inherit",
          }}
        >
          <div className="flex items-center gap-4 mb-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(6,182,212,0.06)" }}
            >
              <User
                style={{ width: 20, height: 20, color: "var(--accent-gold)" }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <JXTypography
                variant="body"
                className="!truncate !text-[0.9rem] !font-bold !text-[var(--text-primary)]"
              >
                {user.name || "Unnamed User"}
              </JXTypography>
              <JXTypography
                variant="caption"
                className="!block !truncate !text-[var(--text-secondary)]"
              >
                {formatRole(user.role)}
              </JXTypography>
            </div>
            <div>
              <Tooltip title={showEmail ? "Hide email" : "Show email"}>
                <span className="inline-flex">
                  <SpringButton
                    type="button"
                    variant="outline"
                    tone="primary"
                    onClick={() => onToggleEmail(user.id)}
                    aria-label={showEmail ? "Hide email" : "Show email"}
                    style={{ fontFamily: "inherit" }}
                    className="!h-7 !w-7 !min-h-0 !min-w-0 !rounded-md !border-0 !bg-transparent !p-1 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--border-rgb),0.25)] !shadow-none"
                  >
                    {showEmail ? (
                      <EyeOff style={{ width: 16, height: 16 }} />
                    ) : (
                      <Eye style={{ width: 16, height: 16 }} />
                    )}
                  </SpringButton>
                </span>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <JXTypography
              variant="caption"
              className="!min-w-[90px] !text-[var(--text-secondary)]"
            >
              Email
            </JXTypography>
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <JXTypography
                variant="code"
                className="!truncate !border-0 !bg-transparent !p-0 !text-[var(--text-primary)]"
              >
                {showEmail ? user.email : maskEmail(user.email)}
              </JXTypography>
              {showEmail && (
                <Tooltip title={copiedEmail === user.id ? "Email copied" : "Copy email"}>
                  <span className="inline-flex">
                    <SpringButton
                      type="button"
                      variant="outline"
                      tone="primary"
                      onClick={() => onCopyEmail(user.email, user.id)}
                      aria-label={copiedEmail === user.id ? "Email copied" : "Copy email"}
                      style={{ fontFamily: "inherit" }}
                      className="!h-7 !w-7 !min-h-0 !min-w-0 !rounded-md !border-0 !bg-transparent !p-1 !shadow-none"
                    >
                      {copiedEmail === user.id ? (
                        <Check style={{ color: 'green', width: 16, height: 16 }} />
                      ) : (
                        <Copy style={{ color: 'var(--accent-gold)', width: 16, height: 16 }} />
                      )}
                    </SpringButton>
                  </span>
                </Tooltip>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <JXTypography
              variant="caption"
              className="!min-w-[90px] !text-[var(--text-secondary)]"
            >
              Shipments
            </JXTypography>
            <div className="flex items-center gap-1">
              <Package
                style={{ width: 14, height: 14, color: "var(--text-secondary)" }}
              />
              <JXTypography
                variant="body"
                className="!text-[0.875rem] !font-semibold !text-[var(--text-primary)]"
              >
                {user._count?.shipments ?? 0}
              </JXTypography>
            </div>
          </div>

          {user.createdAt && (
            <div
              className="mt-2 pt-2"
              style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}
            >
              <JXTypography variant="caption" className="!text-[var(--text-secondary)]">
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </JXTypography>
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-end mt-2">
            <Button
              href={`/dashboard/users/${user.id}`}
              variant="outline"
              size="sm"
              icon={<VisibilityIcon />}
              sx={{ textTransform: "none", fontSize: "0.7rem" }}
            >
              View
            </Button>
            {onResetPassword && (
              <Button
                variant="outline"
                size="sm"
                icon={<Key style={{ width: 14, height: 14 }} />}
                onClick={() => onResetPassword(user)}
                className="!normal-case !text-[0.7rem]"
              >
                Password
              </Button>
            )}
            <Button
              href={`/dashboard/users/${user.id}/edit`}
              variant="ghost"
              size="sm"
              icon={<EditIcon />}
              sx={{ textTransform: "none", fontSize: "0.7rem" }}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<DeleteIcon />}
              onClick={() => onDelete(user.id)}
              className="!text-[var(--error)]"
            >
              Delete
            </Button>
          </div>
        </JXBox>
      </div>
    </Slide>
  );
}
