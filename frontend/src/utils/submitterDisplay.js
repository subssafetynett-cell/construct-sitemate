import { formatUserDisplayName } from "./plainName";

/** Submission lists show submitter name/email only for platform superadmin. */
export function showSubmissionCreatorColumn(role) {
  return (role || "").toLowerCase() === "superadmin";
}

/** "Jane Doe (jane@company.com)" for list tables and detail headers. */
export function formatSubmitterDisplay(submittedBy) {
  if (!submittedBy) return "—";
  const name = formatUserDisplayName(submittedBy);
  const email = (submittedBy.email || "").trim();
  if (name && email) return `${name} (${email})`;
  return name || email || "—";
}
