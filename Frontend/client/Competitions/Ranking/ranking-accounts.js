(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RankingAccounts = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function mapLinkedAccounts(accounts) {
    const list = Array.isArray(accounts) ? accounts : [];
    const linkedAccounts = {};
    const verification = {};
    const ratings = {};
    const verificationProblems = {};

    list.forEach((account) => {
      const platform = String(account.host || account.platform || '').toLowerCase();
      if (!platform) return;
      linkedAccounts[platform] = account.handle || '';
      verification[platform] = {
        status: account.verificationStatus || (account.verified ? 'verified' : 'unverified'),
      };
      if (account.rating != null) ratings[platform] = account.rating;
      if (account.verificationProblem) {
        verificationProblems[platform] = account.verificationProblem;
      }
    });

    return { linkedAccounts, verification, ratings, verificationProblems };
  }

  function verifiedCount(verification) {
    return Object.values(verification || {}).filter(
      (entry) => String(entry?.status || '').toLowerCase() === 'verified',
    ).length;
  }

  function formatMyRankRows(myRanks) {
    const list = Array.isArray(myRanks) ? myRanks : [];
    if (!list.length) {
      return [{ label: 'Global rank', value: 'Not ranked yet' }];
    }
    return list.map((entry) => ({
      label: `${entry.platform || entry.scope || 'all'} rank`,
      value:
        entry.rank != null
          ? `#${entry.rank} · ${entry.rating ?? '—'}`
          : 'Not ranked',
      meta: entry,
    }));
  }

  return {
    mapLinkedAccounts,
    verifiedCount,
    formatMyRankRows,
  };
});
