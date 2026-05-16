/**
 * @file pages/PriorityInboxPage.tsx
 * @description Priority Inbox — displays top-N notifications ranked by
 *              weighted score (Placement > Result > Event) with recency decay.
 *              Supports configurable N and type filtering.
 */

import React, { useState } from "react";
import {
  Box, Typography, Divider, CircularProgress, Alert,
  Chip, Stack, ToggleButtonGroup, ToggleButton, Slider, Button,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import RefreshIcon from "@mui/icons-material/Refresh";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { usePriorityNotifications } from "../hooks/usePriorityNotifications";
import NotificationCard from "../components/NotificationCard";
import { Log } from "../utils/logger";

const FILTERS = ["All", "Placement", "Result", "Event"] as const;

const PriorityInboxPage: React.FC = () => {
  const [topN, setTopN] = useState<number>(10);
  const [typeFilter, setTypeFilter] = useState<string>("All");

  const { notifications, loading, error, readIds, markAsRead, refresh } =
    usePriorityNotifications({ topN, typeFilter });

  const handleFilterChange = (_: React.MouseEvent<HTMLElement>, val: string | null) => {
    if (val) {
      setTypeFilter(val);
      Log("frontend", "info", "page", `Priority filter changed: ${val}`);
    }
  };

  const unreadCount = notifications.filter(n => !readIds.has(n.ID)).length;

  return (
    <Box sx={{ maxWidth: 780, mx: "auto", p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <StarIcon sx={{ color: "#F9A825" }} />
          <Typography variant="h5" fontWeight={700}>
            Priority Inbox
          </Typography>
          {unreadCount > 0 && (
            <Chip label={`${unreadCount} unread`} color="warning" size="small" />
          )}
        </Box>
        <Button size="small" startIcon={<RefreshIcon />} onClick={refresh} variant="outlined">
          Refresh
        </Button>
      </Box>

      {/* Legend */}
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Chip icon={<EmojiEventsIcon />} label="Placement = Weight 3" size="small" sx={{ bgcolor: "#E3F2FD", color: "#1565C0" }} />
        <Chip label="Result = Weight 2" size="small" sx={{ bgcolor: "#E8F5E9", color: "#2E7D32" }} />
        <Chip label="Event = Weight 1" size="small" sx={{ bgcolor: "#FFF3E0", color: "#E65100" }} />
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Controls */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ sm: "center" }} mb={2}>
        {/* Top-N slider */}
        <Box sx={{ minWidth: 220 }}>
          <Typography variant="caption" fontWeight={600} gutterBottom>
            Show top {topN} notifications
          </Typography>
          <Slider
            value={topN}
            min={5}
            max={20}
            step={5}
            marks={[
              { value: 5, label: "5" },
              { value: 10, label: "10" },
              { value: 15, label: "15" },
              { value: 20, label: "20" },
            ]}
            onChange={(_, v) => {
              setTopN(v as number);
              Log("frontend", "info", "component", `Top-N slider changed to ${v}`);
            }}
            color="warning"
            size="small"
          />
        </Box>

        {/* Type filter */}
        <Box>
          <Typography variant="caption" fontWeight={600} gutterBottom display="block">
            Filter by type
          </Typography>
          <ToggleButtonGroup
            value={typeFilter}
            exclusive
            onChange={handleFilterChange}
            size="small"
          >
            {FILTERS.map(f => (
              <ToggleButton key={f} value={f} sx={{ px: 1.5 }}>{f}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Stack>

      {/* Content */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress color="warning" />
        </Box>
      )}

      {error && !loading && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {!loading && !error && notifications.length === 0 && (
        <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
          <StarIcon sx={{ fontSize: 64, opacity: 0.3, color: "#F9A825" }} />
          <Typography mt={1}>No priority notifications found.</Typography>
        </Box>
      )}

      {!loading && !error && notifications.map((n, idx) => (
        <Box key={n.ID} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          {/* Rank badge */}
          <Box sx={{
            minWidth: 28, height: 28, borderRadius: "50%",
            bgcolor: idx === 0 ? "#F9A825" : idx === 1 ? "#90A4AE" : idx === 2 ? "#A1887F" : "#EEEEEE",
            color: idx < 3 ? "white" : "text.secondary",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.75rem", fontWeight: 800, mt: 1.5, flexShrink: 0,
          }}>
            {idx + 1}
          </Box>
          <Box sx={{ flex: 1 }}>
            <NotificationCard
              notification={n}
              isRead={readIds.has(n.ID)}
              onMarkRead={markAsRead}
              priorityScore={n.priorityScore}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default PriorityInboxPage;
