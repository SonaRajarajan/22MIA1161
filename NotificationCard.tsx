/**
 * @file components/NotificationCard.tsx
 * @description A single notification card with type badge, read/unread state, and click handler.
 */

import React from "react";
import {
  Card, CardContent, Typography, Chip, Box, IconButton, Tooltip,
} from "@mui/material";
import WorkIcon from "@mui/icons-material/Work";
import EventIcon from "@mui/icons-material/Event";
import GradeIcon from "@mui/icons-material/Grade";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { Notification } from "../utils/types";
import { Log } from "../utils/logger";

interface Props {
  notification: Notification;
  isRead: boolean;
  onMarkRead: (id: string) => void;
  priorityScore?: number;
}

const TYPE_CONFIG = {
  Placement: { color: "#1565C0", bg: "#E3F2FD", icon: <WorkIcon fontSize="small" /> },
  Result:    { color: "#2E7D32", bg: "#E8F5E9", icon: <GradeIcon fontSize="small" /> },
  Event:     { color: "#E65100", bg: "#FFF3E0", icon: <EventIcon fontSize="small" /> },
};

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

const NotificationCard: React.FC<Props> = ({ notification, isRead, onMarkRead, priorityScore }) => {
  const cfg = TYPE_CONFIG[notification.Type] ?? TYPE_CONFIG.Event;

  const handleMarkRead = () => {
    if (!isRead) {
      Log("frontend", "info", "component",
        `User marked notification as read — id=${notification.ID}, type=${notification.Type}`
      );
      onMarkRead(notification.ID);
    }
  };

  return (
    <Card
      elevation={isRead ? 0 : 3}
      sx={{
        mb: 1.5,
        border: isRead ? "1px solid #E0E0E0" : `2px solid ${cfg.color}`,
        borderRadius: 2,
        transition: "all 0.2s ease",
        opacity: isRead ? 0.72 : 1,
        "&:hover": { boxShadow: 4, transform: "translateY(-1px)" },
        position: "relative",
        overflow: "visible",
      }}
    >
      {/* Unread indicator dot */}
      {!isRead && (
        <Box sx={{
          position: "absolute", top: -5, left: -5,
          width: 12, height: 12, borderRadius: "50%",
          backgroundColor: cfg.color, border: "2px solid white",
        }} />
      )}

      <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          {/* Type Badge */}
          <Chip
            icon={cfg.icon}
            label={notification.Type}
            size="small"
            sx={{
              backgroundColor: cfg.bg,
              color: cfg.color,
              fontWeight: 700,
              fontSize: "0.68rem",
              flexShrink: 0,
              mt: 0.3,
            }}
          />

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: isRead ? 400 : 600,
                color: isRead ? "text.secondary" : "text.primary",
                lineHeight: 1.4,
                textTransform: "capitalize",
              }}
            >
              {notification.Message}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.3, display: "block" }}>
              {formatTimestamp(notification.Timestamp)}
            </Typography>
            {priorityScore !== undefined && (
              <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 600 }}>
                Priority Score: {priorityScore.toFixed(4)}
              </Typography>
            )}
          </Box>

          {/* Mark as read */}
          {!isRead && (
            <Tooltip title="Mark as read">
              <IconButton size="small" onClick={handleMarkRead} sx={{ color: cfg.color }}>
                <CheckCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default NotificationCard;
