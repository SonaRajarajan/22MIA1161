/**
 * @file pages/AllNotificationsPage.tsx
 * @description Displays all notifications with type filtering, pagination, and mark-all-read.
 */

import React, { useState } from "react";
import {
  Box, Typography, ToggleButton, ToggleButtonGroup, Button,
  CircularProgress, Alert, Pagination, Stack, Divider, Chip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { useNotifications } from "../hooks/useNotifications";
import NotificationCard from "../components/NotificationCard";
import { Log } from "../utils/logger";

const FILTERS = ["All", "Placement", "Result", "Event"] as const;

const AllNotificationsPage: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [page, setPage] = useState<number>(1);

  const { notifications, pagination, loading, error, readIds, markAsRead, markAllRead, refresh } =
    useNotifications({ typeFilter, page, limit: 15 });

  const handleFilterChange = (_: React.MouseEvent<HTMLElement>, val: string | null) => {
    if (val) {
      setTypeFilter(val);
      setPage(1);
      Log("frontend", "info", "page", `Filter changed to: ${val}`);
    }
  };

  const unreadCount = notifications.filter(n => !readIds.has(n.ID)).length;

  return (
    <Box sx={{ maxWidth: 780, mx: "auto", p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <NotificationsNoneIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            All Notifications
          </Typography>
          {unreadCount > 0 && (
            <Chip label={`${unreadCount} unread`} color="primary" size="small" />
          )}
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<DoneAllIcon />}
            onClick={markAllRead}
            disabled={unreadCount === 0}
            variant="outlined"
          >
            Mark all read
          </Button>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={refresh}
            variant="outlined"
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Type Filter */}
      <ToggleButtonGroup
        value={typeFilter}
        exclusive
        onChange={handleFilterChange}
        size="small"
        sx={{ mb: 2, flexWrap: "wrap", gap: 0.5 }}
      >
        {FILTERS.map(f => (
          <ToggleButton key={f} value={f} sx={{ px: 2, borderRadius: "20px !important" }}>
            {f}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Content */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && !loading && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {!loading && !error && notifications.length === 0 && (
        <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
          <NotificationsNoneIcon sx={{ fontSize: 64, opacity: 0.3 }} />
          <Typography mt={1}>No notifications found.</Typography>
        </Box>
      )}

      {!loading && !error && notifications.map(n => (
        <NotificationCard
          key={n.ID}
          notification={n}
          isRead={readIds.has(n.ID)}
          onMarkRead={markAsRead}
        />
      ))}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={pagination.totalPages}
            page={page}
            onChange={(_, p) => {
              setPage(p);
              Log("frontend", "info", "page", `Pagination: moved to page ${p}`);
            }}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      {pagination && (
        <Typography variant="caption" color="text.disabled" sx={{ display: "block", textAlign: "center", mt: 1 }}>
          Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, pagination.totalItems)} of {pagination.totalItems} notifications
        </Typography>
      )}
    </Box>
  );
};

export default AllNotificationsPage;
