const asyncHandler = require("express-async-handler");
const prisma = require("../prismaClient");
const { reqUserDbId } = require("../utils/userAuthorization");
const {
  buildDashboardResponseWhere,
  buildDashboardUserCountWhere,
  buildSiteListWhere,
  getDashboardScopeMeta,
} = require("../utils/dashboardAccess");

function countCategory(categories, matchers) {
  return Object.entries(categories).reduce((sum, [name, count]) => {
    const key = String(name).toLowerCase();
    if (matchers.some((m) => key.includes(m))) return sum + count;
    return sum;
  }, 0);
}

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const actorId = reqUserDbId(req);
  if (!actorId) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: {
      id: true,
      role: true,
      clientId: true,
      companyname: true,
      firstName: true,
    },
  });

  if (!actor) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  const scope = getDashboardScopeMeta(actor);
  const siteWhere = buildSiteListWhere(actor);
  const userCountWhere = buildDashboardUserCountWhere(actor);
  const responseWhere = await buildDashboardResponseWhere(prisma, actor);

  try {
    const [totalSites, totalUsers, allResponses] = await Promise.all([
      prisma.site.count({ where: siteWhere }),
      userCountWhere != null
        ? prisma.user.count({ where: userCountWhere })
        : Promise.resolve(null),
      prisma.formResponse.findMany({
        where: responseWhere,
        include: { form: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    const categories = {};
    const inspectionScores = [];
    const monthlyTrends = {};
    const recentActions = [];

    allResponses.forEach((resp) => {
      const cat = resp.category || resp.form?.title || "Other";
      categories[cat] = (categories[cat] || 0) + 1;

      const d = new Date(resp.createdAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyTrends[monthKey] = (monthlyTrends[monthKey] || 0) + 1;

      const answers = resp.answers && typeof resp.answers === "object" ? resp.answers : {};
      const catLower = String(cat).toLowerCase();

      if (catLower.includes("weekly supervisor") || catLower.includes("inspection")) {
        const siteRating = parseFloat(answers.siteRating);
        if (!Number.isNaN(siteRating) && siteRating > 0) {
          inspectionScores.push(siteRating);
        }
      }

      if (recentActions.length < 8) {
        const heading =
          (answers.report_heading && String(answers.report_heading).trim()) ||
          (answers.reportHeading && String(answers.reportHeading).trim()) ||
          cat;
        recentActions.push({
          title: heading,
          subtitle: d.toLocaleDateString("en-GB"),
          status: "Submitted",
          id: resp.id,
        });
      }
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

    const now = new Date();
    const areaChartData = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      areaChartData.push({
        name: dt.toLocaleString("en-GB", { month: "short" }),
        completed: monthlyTrends[monthKey] || 0,
      });
    }

    const hsConcerns = countCategory(categories, ["health", "safety"]);
    const envConcerns = countCategory(categories, ["sustainability", "environment"]);
    const qualityConcerns = countCategory(categories, ["quality"]);
    const positiveObs = countCategory(categories, ["positive"]);

    res.json({
      success: true,
      scope,
      stats: {
        totalSites,
        totalUsers: totalUsers ?? undefined,
        totalReports: allResponses.length,
        hsConcerns,
        envConcerns,
        qualityConcerns,
        positiveObs,
        complianceRate: `${avgCompliance}%`,
      },
      charts: {
        areaChartData,
        barChartData,
        pieChartData: [],
      },
      recentActions,
    });
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
