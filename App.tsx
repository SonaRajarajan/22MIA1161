/**
 * @file App.tsx
 * @description Root application component. Sets up Material UI theme,
 *              routing between All Notifications and Priority Inbox pages.
 */

import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import {
  ThemeProvider, createTheme, CssBaseline,
  AppBar, Toolbar, Typography, Box, Tab, Tabs, Container,
  Badge,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import StarIcon from "@mui/icons-material/Star";
import AllNotificationsPage from "./pages/AllNotificationsPage";
import PriorityInboxPage from "./pages/PriorityInboxPage";
import { logInfo } from "./utils/logger";

// ── Material UI Theme ────────────────────────────────────────────────────────
const theme = createTheme({
  palette: {
    primary: { main: "#1565C0" },
    warning: { main: "#F9A825" },
    background: { default: "#F5F7FA" },
  },
  typography: {
    fontFamily: "'Segoe UI', 'Roboto', sans-serif",
    h5: { letterSpacing: -0.5 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
});

// ── Nav Tabs (reads current route for active tab) ─────────────────────────────
function NavTabs() {
  const location = useLocation();
  const currentTab = location.pathname === "/priority" ? 1 : 0;

  return (
    <Tabs
      value={currentTab}
      textColor="inherit"
      indicatorColor="secondary"
      sx={{ "& .MuiTab-root": { fontWeight: 600, minHeight: 64 } }}
    >
      <Tab
        icon={<NotificationsIcon />}
        iconPosition="start"
        label="All Notifications"
        component={Link}
        to="/"
      />
      <Tab
        icon={<StarIcon />}
        iconPosition="start"
        label="Priority Inbox"
        component={Link}
        to="/priority"
      />
    </Tabs>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
function AppShell() {
  useEffect(() => {
    logInfo("page", "Application mounted — Campus Notification Platform loaded");
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      <AppBar position="sticky" elevation={1}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 2 }}>
            <Badge color="warning" variant="dot">
              <NotificationsIcon />
            </Badge>
            <Typography variant="h6" fontWeight={800} sx={{ mr: 2, letterSpacing: -0.5 }}>
              CampusNotify
            </Typography>
            <NavTabs />
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Routes>
          <Route path="/" element={<AllNotificationsPage />} />
          <Route path="/priority" element={<PriorityInboxPage />} />
        </Routes>
      </Container>
    </Box>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ThemeProvider>
  );
}
