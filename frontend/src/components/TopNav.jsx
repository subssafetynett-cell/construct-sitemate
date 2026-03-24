import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  InputBase,
  Badge,
  Drawer,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from "@mui/material";
import { Search, LogOut, User, Settings, Menu } from "lucide-react";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export default function TopNav({ pageTitle, onMobileMenuClick }) {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  // Update URL search param on input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    if (value) {
      setSearchParams({ search: value });
    } else {
      setSearchParams({});
    }
  };

  // Page title from route (simple example)
  const getPageTitle = (path) => {
    if (path === "/clients") return "Clients";
    if (path === "/users" || path.includes("/users")) return "Users";
    if (path === "/sites" || path === "/create-sites") return "Sites";
    if (path === "/enable-user") return "User Access";
    if (path === "/sitepack-management") return "Site Pack Management";
    if (path.includes("/general-forms/tool-box-talk")) return "Tool Box Talk Register";
    if (path.includes("/general-forms/rams-briefing")) return "RAMS Briefing Form";
    if (path.includes("/general-forms/site-induction")) return "Site Induction Register";
    if (path.includes("/general-forms/management-site-inspection")) return "Management Site Inspection Report";
    if (path === "/general-forms") return "General forms";
    if (path === "/forms" || path === "/form-build") return "Form Builder";
    return "Dashboard";
  };
  const title = pageTitle || getPageTitle(location.pathname);

  const hideSearch = ["/enable-user"].includes(location.pathname);

  // State for offcanvas
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const navigate = useNavigate();

  // Get user from local storage
  const getUser = () => {
    try {
      const userStr = localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  };
  const user = getUser();

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    navigate("/login");
  };

  // User initials
  const getInitials = () => {
    if (!user) return "?";
    const first = user.firstName ? user.firstName.charAt(0).toUpperCase() : "";
    const last = user.lastName ? user.lastName.charAt(0).toUpperCase() : "";
    return first + last || user.username?.charAt(0).toUpperCase() || "U";
  };

  return (
    <Box
      sx={{
        px: { xs: 1.5, md: 2.5 },
        py: { xs: 1, md: 1.5 },
        bgcolor: isDarkMode ? "#111827" : "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: "20px",
        boxShadow: isDarkMode ? "0px 4px 20px rgba(0, 0, 0, 0.4)" : "none",
      }}
    >
      {/* LEFT: MENU ICON + PAGE TITLE */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={onMobileMenuClick}
          sx={{ display: { md: "none" }, color: isDarkMode ? "#F9FAFB" : "#111827" }}
        >
          <Menu />
        </IconButton>
        <Typography
          sx={{
            fontSize: { xs: "1.1rem", md: "1.5rem" },
            fontWeight: 600,
            color: isDarkMode ? "#F9FAFB" : "#111827",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: { xs: "180px", sm: "none" }
          }}
        >
          {title}
        </Typography>
      </Box>

      {/* RIGHT: SEARCH + AVATAR */}
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, md: 3 } }}>
        {/* SEARCH */}
        {!hideSearch && (
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: 1.5,
              px: 2,
              py: 0.5,
              bgcolor: isDarkMode ? "#1B212C" : "#E9E7E0",
              borderRadius: 3,
              width: 320,
            }}
          >
            <Search size={20} color="#6B7280" />
            <InputBase
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              sx={{
                fontSize: "0.95rem",
                color: isDarkMode ? "#F9FAFB" : "#374151",
                width: "100%",
              }}
            />
          </Box>
        )}

        {/* AVATAR */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* Avatar with ring */}
          <Box
            onClick={() => setDrawerOpen(true)}
            sx={{
              p: 0.25,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #F59E0B 0%, #EAB308 100%)",
              cursor: "pointer",
            }}
          >
            <Avatar
              sx={{
                width: 38,
                height: 38,
                bgcolor: "#2563EB",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              {getInitials()}
            </Avatar>
          </Box>
        </Box>
      </Box>

      {/* OFFCANVAS DRAWER */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 320,
            bgcolor: isDarkMode ? "#111827" : "#FFFFFF",
            color: isDarkMode ? "#F9FAFB" : "#111827",
            p: 3,
            pt: 6, // More space on top
            borderLeft: isDarkMode ? "1px solid #374151" : "none"
          }
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                fontSize: "1.5rem",
                bgcolor: "#2563EB",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.4)"
              }}
            >
              {getInitials()}
            </Avatar>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="body2" sx={{ color: isDarkMode ? "#9CA3AF" : "#6B7280", fontSize: "0.85rem" }}>
                {user?.email}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2, borderColor: isDarkMode ? "#374151" : "#E5E7EB" }} />

          <List sx={{ px: 0 }}>
            <ListItem
              button
              onClick={() => { setDrawerOpen(false); navigate("/profile"); }}
              sx={{
                borderRadius: 3,
                mb: 1,
                color: isDarkMode ? "#F9FAFB" : "#374151",
                "&:hover": { bgcolor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: isDarkMode ? "#9CA3AF" : "#6B7280" }}>
                <User size={20} />
              </ListItemIcon>
              <ListItemText primary="Profile" primaryTypographyProps={{ fontWeight: 500 }} />
            </ListItem>

            <ListItem
              button
              onClick={() => { setDrawerOpen(false); navigate("/account-settings"); }}
              sx={{
                borderRadius: 3,
                mb: 1,
                color: isDarkMode ? "#F9FAFB" : "#374151",
                "&:hover": { bgcolor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: isDarkMode ? "#9CA3AF" : "#6B7280" }}>
                <Settings size={20} />
              </ListItemIcon>
              <ListItemText primary="Account Settings" primaryTypographyProps={{ fontWeight: 500 }} />
            </ListItem>
          </List>

          <Box sx={{ mt: 6 }}>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              onClick={handleLogout}
              startIcon={<LogOut size={18} />}
              sx={{
                borderRadius: 50,
                textTransform: "none",
                fontWeight: 600,
                borderColor: isDarkMode ? "#EF4444" : "rgba(239, 68, 68, 0.5)",
                color: "#EF4444",
                "&:hover": {
                  bgcolor: "rgba(239, 68, 68, 0.05)",
                  borderColor: "#EF4444"
                }
              }}
            >
              Logout
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box >
  );
}
