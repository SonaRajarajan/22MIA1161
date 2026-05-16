/**
 * @file hooks/useNotifications.ts
 * @description Custom React hook that fetches all notifications from the backend API.
 *              Manages loading, error, and read-state tracking in local component state.
 */

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Notification, NotificationsApiResponse, PaginationInfo } from "../utils/types";
import { Log } from "../utils/logger";

interface UseNotificationsOptions {
  typeFilter?: string;
  page?: number;
  limit?: number;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  pagination: PaginationInfo | null;
  loading: boolean;
  error: string | null;
  readIds: Set<string>;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  refresh: () => void;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { typeFilter, page = 1, limit = 20 } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    Log("frontend", "info", "hook",
      `useNotifications: fetching — page=${page}, limit=${limit}, type=${typeFilter ?? "all"}`
    );

    try {
      const params: Record<string, string | number> = { page, limit };
      if (typeFilter && typeFilter !== "All") params.type = typeFilter;

      const response = await axios.get<NotificationsApiResponse>(
        "/api/v1/notifications",
        { params }
      );

      setNotifications(response.data.data.notifications);
      setPagination(response.data.data.pagination);

      Log("frontend", "info", "hook",
        `useNotifications: success — received ${response.data.data.notifications.length} notifications`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch notifications";
      setError(msg);
      Log("frontend", "error", "hook", `useNotifications: fetch failed — ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, page, limit, refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => new Set(prev).add(id));
    Log("frontend", "info", "state", `Notification marked as read in UI — id=${id}`);
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.ID));
      return next;
    });
    Log("frontend", "info", "state", `All ${notifications.length} notifications marked as read in UI`);
  }, [notifications]);

  const refresh = useCallback(() => {
    Log("frontend", "debug", "hook", "useNotifications: manual refresh triggered");
    setRefreshTrigger(t => t + 1);
  }, []);

  return { notifications, pagination, loading, error, readIds, markAsRead, markAllRead, refresh };
}
