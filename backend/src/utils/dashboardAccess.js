const { isGlobalSiteAccess, buildSiteListWhere } = require("./siteAccess");

/**
 * Site IDs assigned to this site manager (managerId = user id).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} managerUserId
 * @returns {Promise<string[]>}
 */
async function getManagedSiteIds(prisma, managerUserId) {
  if (!managerUserId) return [];
  const sites = await prisma.site.findMany({
    where: { managerId: managerUserId },
    select: { id: true },
  });
  return sites.map((s) => s.id);
}

/**
 * Prisma `where` for form responses visible on the dashboard.
 * Site managers: only submissions tied to their assigned sites (answers.siteId),
 * plus their own submissions without a site context.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ id: string, role?: string, clientId?: string | null }} actor
 */
async function buildDashboardResponseWhere(prisma, actor) {
  if (!actor?.id) return { id: { in: [] } };

  if (isGlobalSiteAccess(actor)) {
    return {};
  }

  const role = actor.role || "worker";

  if (role === "company_admin" && actor.clientId) {
    return { submittedBy: { clientId: actor.clientId } };
  }

  if (role === "site_manager") {
    const siteIds = await getManagedSiteIds(prisma, actor.id);
    const orClauses = [{ submittedById: actor.id }];

    for (const siteId of siteIds) {
      orClauses.push({
        answers: {
          path: ["siteId"],
          equals: siteId,
        },
      });
    }

    if (orClauses.length === 1 && siteIds.length === 0) {
      // No sites assigned — only own submissions
      return { submittedById: actor.id };
    }

    return { OR: orClauses };
  }

  if (role === "supervisor" && actor.clientId) {
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
  getManagedSiteIds,
};
