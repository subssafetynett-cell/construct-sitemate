/**
 * Detects whether the live DB already has app tables/columns (e.g. from db push or
 * a prior deploy). Used by docker-migrate.sh to baseline _prisma_migrations before deploy.
 */
const { PrismaClient } = require("@prisma/client");

function printFallback() {
  console.log("client=0 lastLogin=0");
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const [clientRow] = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'Client'
      ) AS ok`;

    const [loginRow] = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'User'
          AND column_name = 'lastLoginAt'
      ) AS ok`;

    const client = clientRow?.ok === true || clientRow?.ok === "t" || clientRow?.ok === 1;
    const lastLogin =
      loginRow?.ok === true || loginRow?.ok === "t" || loginRow?.ok === 1;

    console.log(`client=${client ? "1" : "0"} lastLogin=${lastLogin ? "1" : "0"}`);
  } catch (err) {
    console.error("prisma-baseline:", err?.message || err);
    printFallback();
  } finally {
    try {
      await prisma.$disconnect();
    } catch {
      // Ignore disconnect errors so we still exit cleanly after printing state.
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("prisma-baseline:", err?.message || err);
    printFallback();
    process.exit(0);
  });
