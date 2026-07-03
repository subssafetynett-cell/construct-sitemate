const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parsePagination(query = {}) {
  const rawPage = parseInt(String(query.page ?? ""), 10);
  const rawLimit = parseInt(String(query.limit ?? ""), 10);
  const hasPagination = Number.isFinite(rawPage) && rawPage > 0 && Number.isFinite(rawLimit) && rawLimit > 0;

  if (!hasPagination) {
    return { enabled: false, page: DEFAULT_PAGE, limit: DEFAULT_LIMIT, skip: 0, take: DEFAULT_LIMIT };
  }

  const page = Math.max(1, rawPage);
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  return {
    enabled: true,
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
}

function buildPaginationMeta({ page, limit, total }) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const totalPages = limit > 0 ? Math.ceil(safeTotal / limit) : 0;
  return {
    page,
    limit,
    total: safeTotal,
    totalPages,
    hasMore: page * limit < safeTotal,
  };
}

module.exports = {
  parsePagination,
  buildPaginationMeta,
  MAX_LIMIT,
};
