(function initProjectsUtils(global) {
  var projectsPageState = {
    courseId: '',
    trackingCourseId: '',
    activeViewId: 'my-projects-view',
    activeProjectId: '',
    ui: {
      statusCounters: { approved: 0, in_review: 0, complete: 0 },
      projects: [],
    },
    pollingInterval: null,
    currentSubmissionId: '',
    submissionStartTime: 0,
    groupWorkspaceStatusType: 'info',
  };

  var milestoneStatusUiMap = Object.freeze({
    approved: {
      label: 'Approved',
      badgeClass: 'badge-graded',
      iconClass: 'fa-solid fa-check',
      iconContainerClass: 'm-graded',
      canFeedback: true,
      canSubmit: false,
    },
    in_review: {
      label: 'In Review',
      badgeClass: 'badge-submitted',
      iconClass: 'fa-solid fa-hourglass-half',
      iconContainerClass: 'm-submitted',
      canFeedback: false,
      canSubmit: false,
    },
    needs_changes: {
      label: 'Needs Changes',
      badgeClass: 'badge-late',
      iconClass: 'fa-solid fa-rotate-right',
      iconContainerClass: 'm-default',
      canFeedback: true,
      canSubmit: true,
    },
    pending: {
      label: 'Pending',
      badgeClass: 'badge-default',
      iconClass: 'fa-solid fa-clock',
      iconContainerClass: 'm-default',
      canFeedback: false,
      canSubmit: true,
    },
    complete: {
      label: 'Complete',
      badgeClass: 'badge-submitted',
      iconClass: 'fa-solid fa-flag-checkered',
      iconContainerClass: 'm-submitted',
      canFeedback: true,
      canSubmit: false,
    },
    default: {
      label: 'Pending',
      badgeClass: 'badge-default',
      iconClass: 'fa-solid fa-clock',
      iconContainerClass: 'm-default',
      canFeedback: false,
      canSubmit: true,
    },
  });

  var IDs = {
    toDom: function (id) {
      return String(id || '').startsWith('project-')
        ? String(id)
        : 'project-' + id;
    },
    toApi: function (id) {
      return String(id || '').replace(/^project-/i, '');
    },
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDateTime(value) {
    if (!value) return '—';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  }

  function formatRequestError(error, fallbackMessage) {
    var code = String(error?.code || '').toUpperCase();
    var status = Number(error?.status || 0);
    var rawMessage = String(error?.message || '').trim();

    if (
      code === 'NETWORK_OR_CORS' ||
      rawMessage.toLowerCase().includes('failed to fetch')
    ) {
      return (
        'Could not reach tracking API from ' +
        (global.location?.origin || 'this page') +
        '. Check CORS/network configuration.'
      );
    }
    if (code === 'AUTH_REQUIRED' || status === 401) {
      return 'Tracking API authentication is required. Please sign in again.';
    }
    if (code === 'FORBIDDEN' || status === 403) {
      return 'Your account does not have access to this course data yet.';
    }
    if (code === 'NOT_FOUND' || status === 404) {
      return 'Requested project data was not found.';
    }
    return rawMessage || fallbackMessage || 'Request failed.';
  }

  global.NibrasProjectsUtils = Object.freeze({
    projectsPageState: projectsPageState,
    milestoneStatusUiMap: milestoneStatusUiMap,
    IDs: IDs,
    escapeHtml: escapeHtml,
    formatDateTime: formatDateTime,
    formatRequestError: formatRequestError,
  });
})(typeof window !== 'undefined' ? window : globalThis);
