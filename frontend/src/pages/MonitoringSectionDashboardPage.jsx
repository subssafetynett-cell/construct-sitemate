import React from "react";
import { Typography } from "@mui/material";
import Layout from "../components/Layout";
import PageContent from "../components/PageContent";
import MonitoringDashboardOverview from "../components/MonitoringDashboardOverview";
import OhsDashboard from "../components/OhsDashboard";
import EnvironmentalDashboard from "../components/EnvironmentalDashboard";
import QualityDashboard from "../components/QualityDashboard";
import FoodSafetyDashboard from "../components/FoodSafetyDashboard";
import LiftRegulationsDashboard from "../components/LiftRegulationsDashboard";
import { DASHBOARD_THEME } from "../components/dashboard/dashboardUi";
import { getMonitoringSection } from "../constants/monitoringSections";

const T = DASHBOARD_THEME;

export default function MonitoringSectionDashboardPage({ section: sectionKey }) {
  const section = getMonitoringSection(sectionKey);

  if (!section) {
    return (
      <Layout>
        <PageContent>
          <Typography>Section not found.</Typography>
        </PageContent>
      </Layout>
    );
  }

  return (
    <Layout pageTitle={section.dashboardTitle} disablePadding>
      <div
        style={{
          background: T.bg,
          minHeight: "100vh",
          width: "100%",
          fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <PageContent sx={{ py: { xs: 2.5, md: 3.5 }, pb: { xs: 4, md: 5 } }}>
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: T.ink,
                letterSpacing: "-0.02em",
              }}
            >
              {section.dashboardTitle}
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: T.inkMid, maxWidth: 720 }}>
              {section.dashboardSubtitle}
            </p>
          </div>

          {sectionKey === "ohs" ? (
            <OhsDashboard />
          ) : sectionKey === "environmental" ? (
            <EnvironmentalDashboard />
          ) : sectionKey === "quality" ? (
            <QualityDashboard />
          ) : sectionKey === "food-safety" ? (
            <FoodSafetyDashboard />
          ) : sectionKey === "lift" ? (
            <LiftRegulationsDashboard />
          ) : (
            <MonitoringDashboardOverview sectionKey={sectionKey} />
          )}
        </PageContent>
      </div>
    </Layout>
  );
}
