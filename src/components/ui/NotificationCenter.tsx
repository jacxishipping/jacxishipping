"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, Check, Package, Ship, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import Drawer from '@/components/design-system/Drawer';
import { IconButton } from '@/components/design-system';
import { JacxiButton } from '@/components/design-system/JacxiButton';
import Tooltip from '@/components/design-system/Tooltip';
import { toast } from '@/components/design-system';

interface Notification {
  id: string;
  title: string;
  description: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  origin: "system" | "direct";
  createdAt: string;
  read: boolean;
  link?: string;
  sender?: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  } | null;
}

interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
}

export function NotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = (await response.json()) as NotificationsResponse;
        if (Array.isArray(data.data)) {
          setNotifications(data.data);
          setUnreadCount(
            typeof data.unreadCount === "number"
              ? data.unreadCount
              : data.data.filter((notification) => !notification.read).length,
          );
        } else {
          console.error("Invalid notification data:", data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const stream = new EventSource("/api/notifications/stream");
    const refreshFromStream = () => {
      fetchNotifications();
    };

    stream.addEventListener("notification", refreshFromStream);
    stream.addEventListener("connected", refreshFromStream);
    stream.onerror = () => {
      fetchNotifications();
    };

    // Keep a slower polling fallback for environments where SSE is interrupted.
    const interval = setInterval(fetchNotifications, 60000);

    return () => {
      clearInterval(interval);
      stream.removeEventListener("notification", refreshFromStream);
      stream.removeEventListener("connected", refreshFromStream);
      stream.close();
    };
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (error) {
      // Revert on error? rarely needed for read status
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (notifications.find((n) => n.id === id && !n.read)) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await fetch(`/api/notifications?id=${id}`, {
        method: "DELETE",
      });
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "SUCCESS":
        return <Check className="w-4 h-4 text-green-500" />;
      case "WARNING":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "ERROR":
        return <AlertCircle className="w-4 h-4 text-[var(--error)]" />;
      default:
        return <Bell className="w-4 h-4 text-[var(--accent-gold)]" />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getSenderLabel = (notification: Notification) => {
    if (!notification.sender) {
      return null;
    }

    return notification.sender.name || notification.sender.email;
  };

  const getOriginLabel = (notification: Notification) =>
    notification.origin === "system" ? "System update" : "Direct message";

  const getOriginStyles = (notification: Notification) => {
    if (notification.origin === "system") {
      return {
        color: "#1D4ED8",
        backgroundColor: "rgba(29, 78, 216, 0.10)",
        borderColor: "rgba(29, 78, 216, 0.18)",
      };
    }

    return {
      color: "var(--accent-gold)",
      backgroundColor: "rgba(var(--accent-gold-rgb), 0.12)",
      borderColor: "rgba(var(--accent-gold-rgb), 0.2)",
    };
  };

  return (
    <>
      <Tooltip title="Notifications">
        <span className="relative inline-flex">
          {/* Same treatment as every other header icon button (Settings,
              Export, Quick Actions): transparent, secondary text, neutral
              hover. IconButton defaults to variant="primary", i.e. a solid
              gold square — that was the odd one out in the top bar. */}
          <JacxiButton
            type="button"
            variant="outline"
            tone="primary"
            onClick={() => setOpen(true)}
            aria-label="Notifications"
            style={{ fontFamily: 'inherit' }}
            className="!h-9 !w-9 !min-h-0 !min-w-0 !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--border-rgb),0.4)] hover:!text-[var(--text-primary)] !shadow-none"
          >
            <Bell className="w-5 h-5" />
          </JacxiButton>
          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} unread notifications`}
              className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--error)] px-1 text-[0.625rem] font-bold leading-none text-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>
      </Tooltip>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title={
          <span className="flex items-center gap-3">
            <span>
              <span className="block text-[1.125rem] font-bold leading-[1.3] text-[var(--text-primary)]">
                Notifications
              </span>
              <span className="block text-[0.8125rem] leading-[1.4] text-[var(--text-secondary)]">
                {unreadCount} unread
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Tooltip title="Refresh">
                <span className="inline-flex">
                  <IconButton
                    variant="ghost"
                    onClick={fetchNotifications}
                    ariaLabel="Refresh notifications"
                    icon={<RefreshCw className="w-4 h-4" />}
                    size="sm"
                  />
                </span>
              </Tooltip>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="whitespace-nowrap text-xs text-[var(--accent-gold)] hover:underline"
                >
                  Mark all read
                </button>
              )}
            </span>
          </span>
        }
      >

        {/* Notifications List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 text-[var(--text-secondary)] animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-3 py-8 text-center">
              <Bell className="w-12 h-12 text-[var(--text-secondary)] opacity-50 mb-3" />
              <p className="text-[0.875rem] text-[var(--text-secondary)]">
                No notifications yet
              </p>
            </div>
          ) : (
            notifications.map((notification, index) => (
              <div key={notification.id}>
                <div
                  className="cursor-pointer p-3 transition-colors hover:bg-[var(--background)]"
                  style={{
                    backgroundColor: notification.read
                      ? "transparent"
                      : "rgba(var(--accent-gold-rgb), 0.05)",
                  }}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.link) {
                      setOpen(false);
                      router.push(notification.link);
                    }
                  }}
                >
                  <div className="flex gap-2">
                    <div className="mt-0.5 shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex flex-wrap items-center gap-1">
                            <p
                              className="text-[0.875rem] text-[var(--text-primary)]"
                              style={{ fontWeight: notification.read ? 500 : 700 }}
                            >
                              {notification.title}
                            </p>
                            <span
                              className="inline-flex items-center rounded-full border border-solid px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.04em]"
                              style={getOriginStyles(notification)}
                            >
                              {getOriginLabel(notification)}
                            </span>
                          </div>
                        </div>
                        <Tooltip title="Delete">
                          <span className="-mt-1 inline-flex">
                            <IconButton
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              ariaLabel="Delete notification"
                              icon={<X className="w-4 h-4 opacity-50 hover:opacity-100" />}
                            />
                          </span>
                        </Tooltip>
                      </div>
                      <p className="mt-0.5 text-[0.8125rem] text-[var(--text-secondary)]">
                        {notification.description}
                      </p>
                      {getSenderLabel(notification) && (
                        <p className="mt-1 text-[0.75rem] text-[var(--text-secondary)]">
                          {notification.origin === "system"
                            ? "Triggered by "
                            : "From "}
                          {getSenderLabel(notification)}
                        </p>
                      )}
                      <p className="mt-0.5 text-[0.75rem] text-[var(--text-secondary)]">
                        {formatTimestamp(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
                {index < notifications.length - 1 && (
                  <hr className="border-[var(--border)]" />
                )}
              </div>
            ))
          )}
        </div>
      </Drawer>
    </>
  );
}
