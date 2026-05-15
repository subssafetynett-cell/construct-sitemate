const { isGlobalSiteAccess, buildSiteListWhere } = require("./siteAccess");

/**
 * Prisma `where` for form responses visible on the dashboard.
 */
function buildDashboardResponseWhere(actor) {
  if (!actor?.id) return { id: { in: [] } };

  if (isGlobalSiteAccess(actor)) {
    return {};
  }

  const role = actor.role || "worker";

  if (role === "company_admin" && actor.clientId) {
    return { submittedBy: { clientId: actor.clientId } };
  }

  if (["site_manager", "supervisor"].includes(role) && actor.clientId) {
    return { submittedBy: { clientId: actor.clientId } };
  }

  return { submittedById: actor.id };
}

function buildDashboardUserCountWhere(actor) {
  if (!actor) return null;
  if (isGlobalSiteAccess(actor)) return {};
  if (actor.role === "company_admin" && actor.clientId) {
    return { clientId: actor.clientId };
  }
  return null;
}

function getDashboardScopeMeta(actor) {
  if (!actor) {
    return {
      label: "Not signed in",
      role: "worker",
      capabilities: {
        showSites: false,
        showUsers: false,
        showCompliance: false,
      },
    };
  }

  const role = actor.role || "worker";
  const global = isGlobalSiteAccess(actor);

  if (global) {
    return {
      label: "All organisations",
      role,
      capabilities: { showSites: true, showUsers: true, showCompliance: true },
    };
  }

  if (role === "company_admin") {
    return {
      label: actor.companyname || "Your company",
      role,
      capabilities: { showSites: true, showUsers: true, showCompliance: true },
    };
  }

  if (role === "site_manager") {
    return {
      label: actor.companyname ? `${actor.companyname} · your sites` : "Your sites",
      role,
      capabilities: { showSites: true, showUsers: false, showCompliance: true },
    };
  }

  if (role === "supervisor") {
    return {
      label: actor.companyname || "Your organisation",
      role,
      capabilities: { showSites: false, showUsers: false, showCompliance: true },
    };
  }

  return {
    label: "Your submissions",
    role,
    capabilities: { showSites: false, showUsers: false, showCompliance: true },
  };
}

module.exports = {
  buildDashboardResponseWhere,
  buildDashboardUserCountWhere,
  buildSiteListWhere,
  getDashboardScopeMeta,
};
