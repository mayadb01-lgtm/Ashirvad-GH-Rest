import React, { useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Collapse,
} from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const HomeDashboard = ({ navigation, onNavigate }) => {
  const [loading, setLoading] = useState(false);
  // Group items by headers (ignore those without header)
  const splitByHeaders = (nav) => {
    const groups = {};
    let currentGroup = null;
    nav.forEach((item) => {
      if (item.kind === "header") {
        currentGroup = item.title;
        groups[currentGroup] = [];
      } else if (currentGroup) {
        if (!groups[currentGroup]) groups[currentGroup] = [];
        groups[currentGroup].push(item);
      }
    });
    return groups;
  };

  // We need to pass the full navigation with headers to splitByHeaders for proper grouping
  const groups = splitByHeaders(navigation);

  const [openStates, setOpenStates] = React.useState({});

  const handleToggle = (segment) => {
    setOpenStates((prev) => ({
      ...prev,
      [segment]: !prev[segment],
    }));
  };

  const renderNavItems = (items, parentSegment = "") => (
    <List disablePadding>
      {items.map(({ segment, title, icon, children }) => {
        const fullSegment = parentSegment
          ? `${parentSegment}/${segment}`
          : segment;

        if (children && children.length > 0) {
          const isOpen = openStates[fullSegment] || true;
          return (
            <Box key={fullSegment}>
              <ListItemButton onClick={() => handleToggle(fullSegment)}>
                <ListItemIcon sx={{ color: "primary.main" }}>
                  {icon}
                </ListItemIcon>
                <ListItemText primary={title} />
                {isOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                <Box sx={{ pl: 4 }}>
                  {renderNavItems(children, fullSegment)}
                </Box>
              </Collapse>
            </Box>
          );
        }

        return (
          <ListItemButton
            key={fullSegment}
            onClick={() => onNavigate(fullSegment)}
            sx={{ pl: parentSegment ? 4 : 2 }}
          >
            <ListItemIcon sx={{ color: "primary.main" }}>{icon}</ListItemIcon>
            <ListItemText primary={title} />
          </ListItemButton>
        );
      })}
    </List>
  );

  const handleBackupEmail = async () => {
    setLoading(true);

    await toast
      .promise(
        fetch(
          `${import.meta.env.VITE_REACT_APP_SERVER_URL}/admin/send-backup`,
          {
            method: "GET",
            credentials: "include",
          }
        ),
        {
          loading: "Sending backup email...",
          success: "Backup email sent successfully!",
          error: "Failed to send backup email.",
        }
      )
      .catch((error) => {
        console.error("Error sending email:", error);
      });

    setLoading(false);
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Welcome to the Home Dashboard
      </Typography>
      <Typography
        variant="body1"
        gutterBottom
        color="text.secondary"
        maxWidth={600}
      >
        Use the sections below to navigate through the Guest House and
        Restaurant dashboards. or{" "}
        <Link
          to="#"
          onClick={(e) => {
            e.preventDefault();
            handleBackupEmail();
          }}
        >
          Here.
        </Link>
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 4,
          mt: 2,
          maxWidth: "100%",
        }}
      >
        {Object.entries(groups).map(([groupTitle, items]) => {
          // skip any group without items
          if (!items.length) return null;

          return (
            <Paper
              key={groupTitle}
              elevation={3}
              sx={{
                p: 2,
                flex: 1,
                borderRadius: 3,
                minWidth: 280,
                bgcolor: "background.paper",
              }}
            >
              <Typography
                variant="h5"
                gutterBottom
                fontWeight="bold"
                color="primary"
              >
                {groupTitle}
              </Typography>
              <Divider sx={{ mb: 1 }} />
              {renderNavItems(items)}
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
};

export default HomeDashboard;
