export function normalizeGitHubRepositoryCandidate(value) {
  var raw = String(value || '').trim();
  if (!raw) return '';
  var match = raw.match(/^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/i);
  if (!match) return '';
  return raw
    .replace(/\.git\/?$/i, '')
    .replace(/\/+$/, '');
}

export function shouldClearVerifiedRepo(previous, current) {
  return normalizeGitHubRepositoryCandidate(previous) !== normalizeGitHubRepositoryCandidate(current);
}

export function canSubmitSubmission(options) {
  options = options || {};
  var type = String(options.submissionType || 'github');
  var value = String(options.submissionValue || '').trim();
  if (!value) return false;

  if (type === 'github') {
    if (!options.githubLinked || !options.githubAppInstalled) return false;
    if (options.repoValidationState !== 'valid') return false;
    return Boolean(normalizeGitHubRepositoryCandidate(value));
  }

  if (type === 'link') {
    try {
      var url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  return value.length > 0;
}
