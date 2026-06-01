/**
 * Detects whether the live DB already has app tables/columns (e.g. from db push or
 * a prior deploy). Used by docker-migrate.sh to baseline _prisma_migrations before deploy.
 */
const { PrismaClient } = require("@prisma/client");

function printFallback() {
  console.log("client=0 lastLogin=0 siteClientId=0 passwordReset=0 emailVerified=0 viewInviteOtp=0");
}

async function columnExists(prisma, tableName, columnName) {
  const [row] = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name = ${columnName}
    ) AS ok`;
  return row?.ok === true || row?.ok === "t" || row?.ok === 1;
}

async function tableExists(prisma, tableName) {
  const [row] = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS ok`;
  return row?.ok === true || row?.ok === "t" || row?.ok === 1;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const client = await tableExists(prisma, "Client");
    const lastLogin = await columnExists(prisma, "User", "lastLoginAt");
    const siteClientId = await columnExists(prisma, "Site", "clientId");
    const passwordReset = await tableExists(prisma, "PasswordResetToken");
    const emailVerified = await columnExists(prisma, "User", "emailVerified");
    const viewInviteOtp = await columnExists(prisma, "EmailVerificationToken", "kind");

    console.log(
      `client=${client ? "1" : "0"} lastLogin=${lastLogin ? "1" : "0"} siteClientId=${siteClientId ? "1" : "0"} passwordReset=${passwordReset ? "1" : "0"} emailVerified=${emailVerified ? "1" : "0"} viewInviteOtp=${viewInviteOtp ? "1" : "0"}`
    );
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
