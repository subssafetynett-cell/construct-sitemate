const { isSafetynettCompanyName } = require("./company");

function isGlobalSiteAccess(user) {
  if (!user) return false;
  if (isSafetynettCompanyName(user.companyname || user.company)) return true;
  return user.role === "superadmin";
}

/** Prisma `where` fragment for listing sites for the current user. */
function buildSiteListWhere(user) {
  if (isGlobalSiteAccess(user)) {
    return {};
  }

  if (user.role === "company_admin" && user.clientId) {
    return { clientId: user.clientId };
  }

  if (user.role === "site_manager") {
    return { managerId: user.id };
  }

  // Other roles: no sites via this API
  return { id: { in: [] } };
}

function mergeSiteSearchWhere(accessWhere, search) {
  const term = (search || "").trim();
  if (!term) return accessWhere;

  const searchClause = {
    OR: [
      { name: { contains: term, mode: "insensitive" } },
      { address: { contains: term, mode: "insensitive" } },
    ],
  };

  if (!accessWhere || Object.keys(accessWhere).length === 0) {
    return searchClause;
  }

  return { AND: [accessWhere, searchClause] };
}

function resolveSiteClientId(req, managerClientId) {
  if (managerClientId) return managerClientId;
  if (req.user?.clientId) return req.user.clientId;
  return null;
}

async function userCanAccessSite(prisma, user, siteId) {
  if (!siteId || !user) return false;
  if (isGlobalSiteAccess(user)) return true;

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: {
      id: true,
      clientId: true,
      managerId: true,
      manager: { select: { clientId: true } },
    },
  });

  if (!site) return false;

  const siteClientId = site.clientId || site.manager?.clientId || null;

  if (user.role === "company_admin" && user.clientId) {
    return siteClientId === user.clientId;
  }

  if (user.role === "site_manager") {
    return site.managerId === user.id;
  }

  return false;
}

module.exports = {
  isGlobalSiteAccess,
  buildSiteListWhere,
  mergeSiteSearchWhere,
  resolveSiteClientId,
  userCanAccessSite,
};
