const asyncHandler = require("express-async-handler");
const prisma = require("../prismaClient");
const { cacheGet, cacheSet } = require("../services/redisCache");

const DASHBOARD_CACHE_TTL = Number(process.env.DASHBOARD_CACHE_TTL_SEC || 60);

function dashboardCacheKey(prefix, actor, actingClientId) {
  return `dashboard:${prefix}:${actingClientId || actor.clientId || actor.id}`;
}
const {
  buildDashboardResponseWhere,
  buildDashboardUserCountWhere,
  buildSiteListWhere,
  getDashboardScopeMeta,
  buildFormsByCompany,
  fetchMonthlySubmissionCounts,
} = require("../utils/dashboardAccess");
const { isGlobalSiteAccess } = require("../utils/siteAccess");
const { countGroupedCategories } = require("../utils/dashboardCategories");
const { getMonitoringSection } = require("../constants/monitoringSections");
const {
  pickSheqDashboardAnswers,
  pickInspectionDashboardAnswers,
  pickRecentActionAnswers,
  slimFormResponseRow,
} = require("../utils/formResponseCompact");

const SHEQ_CATEGORIES = ["SHEQ Installation", "SHEQ Inspection"];
const SHEQ_RECENT_LIMIT = 60;
const INSPECTION_SAMPLE_LIMIT = 40;

const SHEQ_STATUS_COLORS = {
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc143c",
  unset: "#94a3b8",
};

function normalizeSheqProjectStatus(answers) {
  const raw = answers?.formData?.projectStatus;
  if (raw === "green" || raw === "amber" || raw === "red") return raw;
  return "unset";
}

function formatUserName(user) {
  if (!user) return "Unknown user";
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return name || user.email || "Unknown user";
}

function buildSheqDashboardData(responses) {
  const summary = { green: 0, amber: 0, red: 0, unset: 0, total: 0 };
  const byUserMap = new Map();

  for (const resp of responses) {
    const status = normalizeSheqProjectStatus(
      resp.answers && typeof resp.answers === "object" ? resp.answers : {}
    );
    summary[status] += 1;
    summary.total += 1;

    const userId = resp.submittedById || "unknown";
    if (!byUserMap.has(userId)) {
      byUserMap.set(userId, {
        userId,
        userName: formatUserName(resp.submittedBy),
        green: 0,
        amber: 0,
        red: 0,
        unset: 0,
        forms: [],
      });
    }

    const entry = byUserMap.get(userId);
    entry[status] += 1;
    const answers =
      resp.answers && typeof resp.answers === "object" ? resp.answers : {};
    entry.forms.push({
      id: resp.id,
      name: answers.name || resp.category || "SHEQ report",
      category: resp.category || "SHEQ",
      status,
      createdAt: resp.createdAt,
      date: new Date(resp.createdAt).toLocaleDateString("en-GB"),
      client: answers.formData?.client || "",
      siteAddress: answers.formData?.siteAddress || "",
    });
  }

  const pieChartData = [
    { name: "Green", value: summary.green, color: SHEQ_STATUS_COLORS.green },
    { name: "Amber", value: summary.amber, color: SHEQ_STATUS_COLORS.amber },
    { name: "Red", value: summary.red, color: SHEQ_STATUS_COLORS.red },
    { name: "Not set", value: summary.unset, color: SHEQ_STATUS_COLORS.unset },
  ].filter((row) => row.value > 0);

  const byUser = Array.from(byUserMap.values())
    .map((row) => ({
      ...row,
      forms: row.forms.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }))
    .sort((a, b) => a.userName.localeCompare(b.userName));

  const userBarData = byUser.map((row) => ({
    name: row.userName.length > 20 ? `${row.userName.slice(0, 20)}…` : row.userName,
    fullName: row.userName,
    green: row.green,
    amber: row.amber,
    red: row.red,
    unset: row.unset,
  }));

  return { summary, pieChartData, byUser, userBarData };
}

function buildReportsTimeline(monthlyRows) {
  const byMonth = {};

  for (const row of monthlyRows) {
    const year = row.year;
    const month = row.month;
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    byMonth[monthKey] = (byMonth[monthKey] || 0) + (row.count || 0);
  }

  const monthlySubmissions = Object.entries(byMonth)
    .map(([monthKey, count]) => {
      const [yearStr, monthStr] = monthKey.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      const dt = new Date(year, month - 1, 1);
      return {
        year,
        month,
        monthKey,
        name: dt.toLocaleString("en-GB", { month: "short" }),
        fullName: dt.toLocaleString("en-GB", { month: "long", year: "numeric" }),
        count,
      };
    })
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  const now = new Date();
  const currentYear = now.getFullYear();
  const yearsFromData = [...new Set(monthlySubmissions.map((m) => m.year))];
  const availableYears = [...new Set([currentYear, ...yearsFromData])].sort((a, b) => b - a);

  const latestMonth =
    monthlySubmissions.length > 0
      ? monthlySubmissions[monthlySubmissions.length - 1]
      : null;

  const areaChartData = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const match = monthlySubmissions.find((m) => m.monthKey === monthKey);
    areaChartData.push({
      name: dt.toLocaleString("en-GB", { month: "short" }),
      fullName: dt.toLocaleString("en-GB", { month: "long", year: "numeric" }),
      monthKey,
      completed: match?.count || 0,
    });
  }

  return { monthlySubmissions, availableYears, latestMonth, areaChartData };
}

function buildSectionResponseWhere(sectionKey, baseWhere) {
  const section = getMonitoringSection(sectionKey);
  if (!section) return { id: { in: [] } };

  const categoryClauses = [
    { category: section.category },
    { answers: { path: ["monitoringSection"], equals: sectionKey } },
  ];

  for (const cat of section.concernCategories || []) {
    categoryClauses.push({ category: cat });
  }
  for (const cat of section.sheqCategories || []) {
    categoryClauses.push({ category: cat });
  }

  return {
    AND: [baseWhere, { OR: categoryClauses }],
  };
}

function startOfCurrentMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

exports.getSectionDashboardStats = asyncHandler(async (req, res) => {
  const actor = req.user;
  if (!actor?.id) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  const sectionKey = String(req.params.section || "").trim();
  const section = getMonitoringSection(sectionKey);
  if (!section) {
    return res.status(400).json({ success: false, message: "Invalid monitoring section" });
  }

  const actingClient = req.actingClient || null;
  const actingClientId = actingClient?.id || null;

  const cacheKey = dashboardCacheKey(`section:${sectionKey}`, actor, actingClientId);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const scope = getDashboardScopeMeta(actor, actingClient);
  const siteWhere = buildSiteListWhere(actor, actingClientId);
  const baseResponseWhere = await buildDashboardResponseWhere(prisma, actor, actingClientId);
  const sectionResponseWhere = buildSectionResponseWhere(sectionKey, baseResponseWhere);

  const monthStart = startOfCurrentMonth();
  const clientId =
    actingClientId ||
    (actor.role === "company_admin" ? actor.clientId : null) ||
    (isGlobalSiteAccess(actor) ? null : actor.clientId);

  const nonconWhere = clientId ? { clientId } : {};

  try {
    const [
      totalSites,
      totalFormsCompleted,
      formsThisMonth,
      sheqForms,
      concernReports,
      categoryGroups,
      monthlyCounts,
      recentRows,
      totalNonconformances,
      pendingNonconformances,
      sentNonconformances,
      myOpenActions,
    ] = await Promise.all([
      prisma.site.count({ where: siteWhere }),
      prisma.formResponse.count({ where: sectionResponseWhere }),
      prisma.formResponse.count({
        where: { AND: [sectionResponseWhere, { createdAt: { gte: monthStart } }] },
      }),
      section.sheqCategories?.length
        ? prisma.formResponse.count({
            where: {
              AND: [
                baseResponseWhere,
                { category: { in: section.sheqCategories } },
              ],
            },
          })
        : Promise.resolve(0),
      section.concernCategories?.length
        ? prisma.formResponse.count({
            where: {
              AND: [
                baseResponseWhere,
                { category: { in: section.concernCategories } },
              ],
            },
          })
        : Promise.resolve(0),
      prisma.formResponse.groupBy({
        by: ["category"],
        where: sectionResponseWhere,
        _count: { _all: true },
      }),
      fetchMonthlySubmissionCounts(prisma, sectionResponseWhere),
      prisma.formResponse.findMany({
        where: sectionResponseWhere,
        select: {
          id: true,
          category: true,
          createdAt: true,
          answers: true,
          form: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.nonconformanceAction.count({ where: nonconWhere }),
      prisma.nonconformanceAction.count({
        where: { ...nonconWhere, status: { in: ["pending", "draft"] } },
      }),
      prisma.nonconformanceAction.count({
        where: { ...nonconWhere, status: "sent" },
      }),
      prisma.nonconformanceAction.count({
        where: {
          ...nonconWhere,
          assigneeId: actor.id,
          status: { in: ["pending", "draft"] },
        },
      }),
    ]);

    const categories = {};
    for (const row of categoryGroups) {
      categories[row.category || "Other"] = row._count._all;
    }

    const reportsTimeline = buildReportsTimeline(monthlyCounts);

    const barChartData = Object.keys(categories)
      .map((cat) => ({
        name: cat.length > 22 ? `${cat.substring(0, 22)}…` : cat,
        fullName: cat,
        value: categories[cat],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const recentSubmissions = recentRows.map((resp) => {
      const answers =
        resp.answers && typeof resp.answers === "object" ? resp.answers : {};
      const heading =
        (answers.report_heading && String(answers.report_heading).trim()) ||
        resp.form?.title ||
        resp.category ||
        "Form submission";
      return {
        id: resp.id,
        title: heading,
        category: resp.category || "General",
        date: new Date(resp.createdAt).toLocaleDateString("en-GB"),
        createdAt: resp.createdAt,
      };
    });

    const sectionPayload = {
      success: true,
      section: sectionKey,
      sectionTitle: section.title,
      scope,
      stats: {
        totalSites,
        totalFormsCompleted,
        formsThisMonth,
        sheqForms,
        concernReports,
        totalNonconformances,
        pendingNonconformances,
        sentNonconformances,
        myOpenActions,
      },
      charts: {
        areaChartData: reportsTimeline.areaChartData,
        barChartData,
        monthlySubmissions: reportsTimeline.monthlySubmissions,
        availableYears: reportsTimeline.availableYears,
      },
      recentSubmissions,
    };

    await cacheSet(cacheKey, sectionPayload, DASHBOARD_CACHE_TTL);
    res.json(sectionPayload);
  } catch (err) {
    console.error("Section dashboard stats error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const actor = req.user;
  if (!actor?.id) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  const actingClient = req.actingClient || null;
  const actingClientId = actingClient?.id || null;

  const cacheKey = dashboardCacheKey("main", actor, actingClientId);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const scope = getDashboardScopeMeta(actor, actingClient);
  const siteWhere = buildSiteListWhere(actor, actingClientId);
  const userCountWhere = buildDashboardUserCountWhere(actor, actingClientId);
  const responseWhere = await buildDashboardResponseWhere(prisma, actor, actingClientId);

  try {
    const sheqResponseWhere = {
      AND: [responseWhere, { category: { in: SHEQ_CATEGORIES } }],
    };

    const inspectionWhere = {
      AND: [
        responseWhere,
        {
          OR: [
            { category: { contains: "weekly supervisor", mode: "insensitive" } },
            { category: { contains: "inspection", mode: "insensitive" } },
          ],
        },
      ],
    };

    const [
      totalSites,
      totalUsers,
      totalReports,
      sheqForms,
      monthlyCounts,
      categoryGroups,
      inspectionRows,
      recentRows,
      sheqResponses,
      formsByCompany,
      totalNonconformances,
      pendingNonconformances,
    ] = await Promise.all([
      prisma.site.count({ where: siteWhere }),
      userCountWhere != null
        ? prisma.user.count({ where: userCountWhere })
        : Promise.resolve(null),
      prisma.formResponse.count({ where: responseWhere }),
      prisma.formResponse.count({ where: sheqResponseWhere }),
      fetchMonthlySubmissionCounts(prisma, responseWhere),
      prisma.formResponse.groupBy({
        by: ["category"],
        where: responseWhere,
        _count: { _all: true },
      }),
      prisma.formResponse.findMany({
        where: inspectionWhere,
        select: { answers: true },
        orderBy: { createdAt: "desc" },
        take: INSPECTION_SAMPLE_LIMIT,
      }),
      prisma.formResponse.findMany({
        where: responseWhere,
        select: {
          id: true,
          category: true,
          createdAt: true,
          answers: true,
          form: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.formResponse.findMany({
        where: sheqResponseWhere,
        select: {
          id: true,
          category: true,
          createdAt: true,
          answers: true,
          submittedById: true,
          form: { select: { title: true } },
          submittedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: SHEQ_RECENT_LIMIT,
      }),
      isGlobalSiteAccess(actor, actingClientId)
        ? buildFormsByCompany(prisma)
        : Promise.resolve([]),
      (async () => {
        const clientId =
          actingClientId ||
          (actor.role === "company_admin" ? actor.clientId : null);
        if (!clientId && !isGlobalSiteAccess(actor)) {
          if (actor.clientId) {
            return prisma.nonconformanceAction.count({ where: { clientId: actor.clientId } });
          }
          return 0;
        }
        if (clientId) {
          return prisma.nonconformanceAction.count({ where: { clientId } });
        }
        return prisma.nonconformanceAction.count();
      })(),
      (async () => {
        const clientId =
          actingClientId ||
          (actor.role === "company_admin" ? actor.clientId : null);
        const where = clientId
          ? { clientId, status: { in: ["pending", "draft"] } }
          : isGlobalSiteAccess(actor)
            ? { status: { in: ["pending", "draft"] } }
            : actor.clientId
              ? { clientId: actor.clientId, status: { in: ["pending", "draft"] } }
              : { id: { in: [] } };
        return prisma.nonconformanceAction.count({ where });
      })(),
    ]);

    const sheq = buildSheqDashboardData(
      sheqResponses.map((row) => slimFormResponseRow(row, pickSheqDashboardAnswers))
    );
    const reportsTimeline = buildReportsTimeline(monthlyCounts);

    const categories = {};
    for (const row of categoryGroups) {
      const cat = row.category || "Other";
      categories[cat] = row._count._all;
    }

    const inspectionScores = [];
    for (const resp of inspectionRows) {
      const answers = pickInspectionDashboardAnswers(resp.answers);
      const siteRating = parseFloat(answers.siteRating);
      if (!Number.isNaN(siteRating) && siteRating > 0) {
        inspectionScores.push(siteRating);
      }
    }

    const recentActions = recentRows.map((resp) => {
      const cat = resp.category || resp.form?.title || "Other";
      const answers = pickRecentActionAnswers(resp.answers);
      const heading =
        (answers.report_heading && String(answers.report_heading).trim()) ||
        (answers.reportHeading && String(answers.reportHeading).trim()) ||
        cat;
      return {
        title: heading,
        subtitle: new Date(resp.createdAt).toLocaleDateString("en-GB"),
        status: "Submitted",
        id: resp.id,
      };
    });

    const avgCompliance =
      inspectionScores.length > 0
        ? (inspectionScores.reduce((a, b) => a + b, 0) / inspectionScores.length).toFixed(1)
        : "0";

    const barChartData = Object.keys(categories)
      .map((cat) => ({
        name: cat.length > 22 ? `${cat.substring(0, 22)}…` : cat,
        fullName: cat,
        value: categories[cat],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const reportConcerns = countGroupedCategories(categories, [
      "Health & Safety concern",
      "Sustainability concern",
      "Quality concern",
      "Positive observation",
    ]);
    const inspectionForms = countGroupedCategories(categories, [
      "Weekly supervisor health & safety inspection",
      "Weekly supervisor reports",
    ]);

    const mainPayload = {
      success: true,
      scope,
      formsByCompany,
      stats: {
        totalSites,
        totalUsers: totalUsers ?? undefined,
        totalReports,
        reportConcerns,
        inspectionForms,
        sheqForms,
        complianceRate: `${avgCompliance}%`,
        totalNonconformances,
        pendingNonconformances,
      },
      charts: {
        areaChartData: reportsTimeline.areaChartData,
        monthlySubmissions: reportsTimeline.monthlySubmissions,
        availableYears: reportsTimeline.availableYears,
        latestMonth: reportsTimeline.latestMonth,
        barChartData,
        pieChartData: [],
      },
      sheq,
      recentActions,
    };

    await cacheSet(cacheKey, mainPayload, DASHBOARD_CACHE_TTL);
    res.json(mainPayload);
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
