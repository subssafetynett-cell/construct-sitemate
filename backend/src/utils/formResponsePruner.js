/**
 * Prunes heavy fields (such as base64 signatures/images) from form response JSON answers,
 * leaving only the metadata fields required by list, search, and selection pages.
 *
 * @param {object} answers - The raw answers JSON from database.
 * @returns {object} The pruned answers object.
 */
function pruneAnswers(answers) {
  if (!answers || typeof answers !== 'object') return answers;
  const pruned = {};

  if ('siteId' in answers) pruned.siteId = answers.siteId;
  if ('subfolderId' in answers) pruned.subfolderId = answers.subfolderId;
  if ('name' in answers) pruned.name = answers.name;
  if ('tags' in answers) pruned.tags = answers.tags;
  if ('report_heading' in answers) pruned.report_heading = answers.report_heading;
  if ('reportHeading' in answers) pruned.reportHeading = answers.reportHeading;
  if ('visibility' in answers) pruned.visibility = answers.visibility;
  if ('siteRating' in answers) pruned.siteRating = answers.siteRating;

  if (answers.formMetadata && typeof answers.formMetadata === 'object') {
    pruned.formMetadata = {};
    if ('name' in answers.formMetadata) pruned.formMetadata.name = answers.formMetadata.name;
    if ('tags' in answers.formMetadata) pruned.formMetadata.tags = answers.formMetadata.tags;
    if ('visibility' in answers.formMetadata) pruned.formMetadata.visibility = answers.formMetadata.visibility;
  }

  if (answers.formData && typeof answers.formData === 'object') {
    pruned.formData = {};
    if ('client' in answers.formData) pruned.formData.client = answers.formData.client;
    if ('siteAddress' in answers.formData) pruned.formData.siteAddress = answers.formData.siteAddress;
    if ('projectStatus' in answers.formData) pruned.formData.projectStatus = answers.formData.projectStatus;
  }

  return pruned;
}

module.exports = {
  pruneAnswers,
};
