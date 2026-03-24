import React, { useState, useEffect } from "react";
import { useCompanyLogo } from "../hooks/useCompanyLogo";
import {
  Box,
  Typography,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
  Avatar,
  Button,
} from "@mui/material";

import {
  Users,
  UserCog,
  FileText,
  Building2,
  AlertTriangle,
  Shield,
  ClipboardCheck,
  ChevronDown,
  LayoutDashboard,
  TrendingUp,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

import { Link as RouterLink, useLocation } from "react-router-dom";

/* === COLORS === */
const ACTIVE_COLOR = "#1B212C";
const ACTIVE_BG = "hsl(38, 70%, 55%)";
const TEXT_COLOR = "#9CA3AF";
const BG_COLOR = "#1B212C";

/* === DASHBOARD GROUP === */
const DASHBOARD_GROUP = {
  id: "dashboard",
  heading: "Dashboard",
  icon: <LayoutDashboard size={20} />,
  items: [
    { id: "concern-report", label: "Concern report dashboard", to: "/concern-reports" },
    { id: "audit-report", label: "Audit report dashboard", to: "/audit-reports" },
  ],
};

/* === MENU GROUPS === */
const MENU_GROUPS = [
  { id: "clients", heading: "Clients", icon: <Users size={20} />, to: "/clients" },
  {
    id: "user-access",
    heading: "User access",
    icon: <UserCog size={20} />,
    items: [
      { id: "enable-user", label: "Enable user access", to: "/enable-user" },
    ],
  },
  { id: "general-forms", heading: "General forms", icon: <FileText size={20} />, to: "/general-forms" },
  {
    id: "form-build",
    heading: "Form Builder",
    icon: <FileText size={20} />,
    to: "/forms",
  },
  {
    id: "sites",
    heading: "Sites",
    icon: <Building2 size={20} />,
    items: [
      { id: "create-sites", label: "Create Sites", to: "/create-sites" },
      { id: "sitepack-management", label: "Sitepack Management", to: "/sitepack-management" },
    ],
  },
  { id: "users", heading: "Users", icon: <Users size={20} />, to: "/users" },
  {
    id: "report-concern",
    heading: "Report concern",
    icon: <AlertTriangle size={20} />,
    items: [
      { id: "health-safety", label: "Health and Safety concern", to: "/report-health-safety" },
      { id: "sustainability", label: "Sustainability concern", to: "/report-environmental" },
      { id: "quality", label: "Quality concern", to: "/report-quality" },
      { id: "positive", label: "Positive observation", to: "/report-positive" },
      {
        id: "concern-and-positive",
        label: "Concern and positive feedback report",
        to: "/concern-positive-report",
      },
    ],
  },
  {
    id: "health-inspection",
    heading: "Health and Safety inspection",
    icon: <ClipboardCheck size={20} />,
    items: [
      {
        id: "weekly-supervisor",
        label: "Weekly supervisor health & safety inspection",
        to: "/weekly-supervisor",
      },
      {
        id: "weekly-reports",
        label: "Weekly supervisor reports",
        to: "/weekly-reports",
      },
    ],
  },
  {
    id: "sheq",
    heading: "SHEQ Inspection service",
    icon: <Shield size={20} />,
    items: [
      { id: "sheq-report", label: "SHEQ Inspection service report", to: "/sheq-report" },
      { id: "sheq-install", label: "SHEQ Inspection installation", to: "/sheq-install" },
      { id: "sheq-install-report", label: "SHEQ Inspection installation report", to: "/sheq-install-report" },
    ],
  },
  {
    id: "lift-sector",
    heading: "Lift sector dashboard",
    icon: <TrendingUp size={20} />,
    items: [
      { id: "client-level", label: "Client level analysis", to: "/lift-sector-client" },
      { id: "site-level", label: "Site level analysis", to: "/lift-sector-site" },
    ],
  },
];

export default function Sidebar({ sx = {} }) {
  const logoUrl = useCompanyLogo();
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState(null);

  const toggleGroup = (id) => {
    setOpenGroup((prev) => (prev === id ? null : id));
  };

  const isActive = (to) => {
    const path = location.pathname || "";
    return path === to || path.startsWith(to + "/");
  };

  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    currentUser = null;
  }

  const isSafetynett = (currentUser?.companyname || currentUser?.company || "")
    .toString().trim().toLowerCase() === "safetynett";

  const getInitials = () =>
    currentUser?.firstName
      ? (currentUser.firstName[0] + (currentUser.lastName?.[0] || "")).toUpperCase()
      : "JD";

  const name = currentUser?.firstName
    ? `${currentUser.firstName} ${currentUser.lastName || ""}`
    : "John Doe";


  useEffect(() => {
    for (const group of MENU_GROUPS) {
      if (group.items?.some((item) => isActive(item.to))) {
        setOpenGroup(group.id);
        return;
      }
    }
  }, [location.pathname]);

  return (
    <Box
      component="nav"
      sx={{
        width: 280,
        height: "100%",
        bgcolor: BG_COLOR,
        color: TEXT_COLOR,
        display: "flex",
        flexDirection: "column",
        borderRadius: "20px",
        // DO NOT make the aside itself the scroll container

        ...sx,
      }}
    >
      {/* LOGO */}
      <Box sx={{ p: 2, pb: 1.5, mb: 2, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
        <Box
          component="img"
          src={logoUrl}
          alt="SafetyNett Logo"
          sx={{
            height: 28,
            width: "auto",
            objectFit: "contain"
          }}
        />
      </Box>

      {/* MENU */}
      <Box sx={{
        flex: 1,
        overflowY: "auto",
        px: 1.5,
        "&::-webkit-scrollbar": { display: "none" },
        scrollbarWidth: "none",
        msOverflowStyle: "none"
      }}>
        {/* Dashboard Group */}
        {/* Dashboard Group */}
        {false && (
        <Box sx={{ mb: 2 }}>
          {(() => {
            const isDashboardActive = DASHBOARD_GROUP.items.some((item) => isActive(item.to));

            return (
              <ListItemButton
                onClick={() => toggleGroup(DASHBOARD_GROUP.id)}
                sx={{
                  borderRadius: 3,
                  mb: 0.5,
                  py: 0.75,
                  px: 1.5,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
                  bgcolor: isDashboardActive ? ACTIVE_BG : (openGroup === DASHBOARD_GROUP.id ? "rgba(255,255,255,0.05)" : "transparent"),
                  color: isDashboardActive ? ACTIVE_COLOR : TEXT_COLOR,
                }}
              >
                <ListItemIcon sx={{
                  color: isDashboardActive ? ACTIVE_COLOR : (openGroup === DASHBOARD_GROUP.id ? "#E89F17" : TEXT_COLOR),
                  minWidth: 36,
                  '& svg': { fontSize: 20 }
                }}>
                  {DASHBOARD_GROUP.icon}
                </ListItemIcon>
                <ListItemText primary={DASHBOARD_GROUP.heading} primaryTypographyProps={{ fontSize: '0.875rem' }} />
                <ChevronDown
                  size={20}
                  color={isDashboardActive ? ACTIVE_COLOR : TEXT_COLOR}
                  style={{
                    transform: openGroup === DASHBOARD_GROUP.id ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </ListItemButton>
            );
          })()}

          <Collapse in={openGroup === DASHBOARD_GROUP.id}>
            <Box sx={{ ml: 3, pl: 1, borderLeft: "1px solid #4B5563" }}>
              {DASHBOARD_GROUP.items.map((item) => {
                const active = isActive(item.to);
                return (
                  <ListItemButton
                    key={item.id}
                    component={RouterLink}
                    to={item.to}
                    sx={{
                      borderRadius: 3,
                      mb: 0.5,
                      py: 0.5,
                      px: 1.5,
                      bgcolor: "transparent",
                      color: active ? "#E89F17" : TEXT_COLOR,
                      "&:hover": {
                        bgcolor: "rgba(255,255,255,0.05)",
                      },
                    }}
                  >
                    <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.8125rem' }} />
                  </ListItemButton>
                );
              })}
            </Box>
          </Collapse>
        </Box>
        )}

        {/* Menu Groups */}
        {MENU_GROUPS.filter(group => {
          if (group.id === "clients" || group.id === "user-access" || group.id === "users") return isSafetynett;
          return true;
        }).map((group) => {
          const expanded = openGroup === group.id;

          if (!group.items) {
            const active = isActive(group.to);
            return (
              <ListItemButton
                key={group.id}
                component={RouterLink}
                to={group.to}
                sx={{
                  mb: 0.5,
                  py: 0.75,
                  px: 1.5,
                  borderRadius: 3,
                  bgcolor: active ? ACTIVE_BG : "transparent",
                  color: active ? ACTIVE_COLOR : TEXT_COLOR,
                  "&:hover": {
                    bgcolor: active ? ACTIVE_BG : "rgba(255,255,255,0.05)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 36, '& svg': { fontSize: 20 } }}>{group.icon}</ListItemIcon>
                <ListItemText primary={group.heading} primaryTypographyProps={{ fontSize: '0.875rem' }} />
              </ListItemButton>
            );
          }

          const isGroupActive = group.items.some((item) => isActive(item.to));

          return (
            <Box key={group.id}>
              <ListItemButton
                onClick={() => toggleGroup(group.id)}
                sx={{
                  borderRadius: 3,
                  mb: 0.5,
                  py: 0.75,
                  px: 1.5,
                  bgcolor: isGroupActive ? ACTIVE_BG : "transparent",
                  color: isGroupActive ? ACTIVE_COLOR : TEXT_COLOR,
                  "&:hover": { bgcolor: isGroupActive ? ACTIVE_BG : "rgba(255,255,255,0.05)" }
                }}
              >
                <ListItemIcon sx={{ color: isGroupActive ? ACTIVE_COLOR : TEXT_COLOR, minWidth: 36, '& svg': { fontSize: 20 } }}>
                  {group.icon}
                </ListItemIcon>
                <ListItemText primary={group.heading} primaryTypographyProps={{ fontSize: '0.875rem' }} />
                <ChevronDown
                  size={20}
                  color={isGroupActive ? ACTIVE_COLOR : TEXT_COLOR}
                  style={{
                    transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </ListItemButton>

              <Collapse in={expanded}>
                <Box sx={{ ml: 3, pl: 1, borderLeft: "1px solid #4B5563" }}>
                  {group.items.map((item) => {
                    const active = isActive(item.to);
                    return (
                      <ListItemButton
                        key={item.id}
                        component={RouterLink}
                        to={item.to}
                        sx={{
                          borderRadius: 3,
                          mb: 0.5,
                          py: 0.5,
                          px: 1.5,
                          bgcolor: "transparent",
                          color: active ? "#E89F17" : TEXT_COLOR,
                          "&:hover": {
                            bgcolor: "rgba(255,255,255,0.05)",
                          },
                        }}
                      >
                        <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.8125rem' }} />
                      </ListItemButton>
                    );
                  })}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>

      {/* FOOTER */}
      <Box sx={{ p: 1.5 }}>
        {/* User Profile Card */}
        <Box sx={{ bgcolor: "#27303E", borderRadius: 2.5, p: 1.5, mb: 1 }}>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <Avatar sx={{ bgcolor: "#E89F17", color: "#111827", width: 36, height: 36, fontSize: '0.875rem' }}>
              {getInitials()}
            </Avatar>
            <Box>
              <Typography color="#FFF" fontWeight={600} fontSize="0.875rem">
                {name}
              </Typography>
              <Typography variant="caption" color={TEXT_COLOR} fontSize="0.75rem" sx={{ textTransform: 'capitalize' }}>
                {currentUser?.role || "User"}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Theme Toggle Card */}
        <Box sx={{ bgcolor: isDarkMode ? "#111827" : "#27303E", borderRadius: 2.5, p: 0.5 }}>
          <Box sx={{ bgcolor: isDarkMode ? "#1B212C" : "#111827", borderRadius: 50, p: 0.4, display: "flex" }}>
            <Button
              onClick={() => isDarkMode && toggleTheme()}
              startIcon={<Sun size={14} />}
              sx={{
                flex: 1,
                borderRadius: 50,
                bgcolor: !isDarkMode ? "#E89F17" : "transparent",
                color: !isDarkMode ? "#111827" : TEXT_COLOR,
                textTransform: "none",
                fontSize: "0.7rem",
                py: 0.4,
                minHeight: 0,
                "&:hover": { bgcolor: !isDarkMode ? "#cc8b14" : "rgba(255,255,255,0.05)" },
              }}
            >
              Light
            </Button>
            <Button
              onClick={() => !isDarkMode && toggleTheme()}
              startIcon={<Moon size={14} />}
              sx={{
                flex: 1,
                borderRadius: 50,
                bgcolor: isDarkMode ? "#E89F17" : "transparent",
                color: isDarkMode ? "#111827" : TEXT_COLOR,
                textTransform: "none",
                fontSize: "0.7rem",
                py: 0.4,
                minHeight: 0,
                "&:hover": { bgcolor: isDarkMode ? "#cc8b14" : "rgba(255,255,255,0.05)" },
              }}
            >
              Dark
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
