(function () {
  'use strict';

  const updateReputationBadge = async () => {
    try {
      if (!window.NibrasServices?.reputationService) {
        setTimeout(updateReputationBadge, 500);
        return;
      }
      const res =
        await window.NibrasServices.reputationService.getMyReputation();
      const total = res?.data?.total ?? res?.total ?? 0;
      document.querySelectorAll('.rep-badge').forEach(function (el) {
        el.textContent = total;
      });
    } catch (_e) {
      // silent — keep hardcoded fallback
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateReputationBadge);
  } else {
    updateReputationBadge();
  }
})();
