/**
 * @file hooks/usePriorityNotifications.ts
 * @description Custom React hook that fetches top-N priority notifications from the backend.
 */

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { PrioritisedNotification, PriorityApiResponse } from "../utils/types";
import { Log } from "../utils/logger";

interface UsePriorityOptions {
  topN?: number;
  typeFilter?: string;
}

interface UsePriorityReturn {
  notifications: PrioritisedNotification[];
  loading: boolean;
  error: string | null;
  readIds: Set<string>;
  markAsRead: (id: string) => void;
  refresh: () => void;
}

export function usePriorityNotifications(options: UsePriorityOptions = {}): UsePriorityReturn {
  const { topN = 10, typeFilter } = options;

  const [notifications, setNotifications] = useState<PrioritisedNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    Log("frontend", "info", "hook",
      `usePriorityNotifications: fetching — topN=${topN}, filter=${typeFilter ?? "all"}`
    );

    try {
      const params: Record<string, string | number> = { n: topN };
      if (typeFilter && typeFilter !== "All") params.type = typeFilter;

      const response = await axios.get<PriorityApiResponse>(
        "/api/v1/notifications/priority",
        { params }
      );

      setNotifications(response.data.data.notifications);
      Log("frontend", "info", "hook",
        `usePriorityNotifications: success — top ${response.data.data.topN} returned`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch priority notifications";
      setError(msg);
      Log("frontend", "error", "hook", `usePriorityNotifications: failed — ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [topN, typeFilter, refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch();
  }, [fetch]);

  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => new Set(prev).add(id));
    Log("frontend", "debug", "state", `Priority notification read — id=${id}`);
  }, []);

  const refresh = useCallback(() => {
    Log("frontend", "debug", "hook", "usePriorityNotifications: manual refresh triggered");
    setRefreshTrigger(t => t + 1);
  }, []);

  return { notifications, loading, error, readIds, markAsRead, refresh };
}
