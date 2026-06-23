(function initProjectsCache(global) {
  var projectsCache = {
    _store: {},
    _timestamps: {},
    DEFAULT_TTL: 5 * 60 * 1000,

    get: function (key) {
      var now = Date.now();
      var ts = this._timestamps[key];
      if (!ts) return null;
      if (now - ts > this.DEFAULT_TTL) {
        delete this._store[key];
        delete this._timestamps[key];
        return null;
      }
      return this._store[key];
    },

    set: function (key, data) {
      this._store[key] = data;
      this._timestamps[key] = Date.now();
    },

    invalidate: function (key) {
      delete this._store[key];
      delete this._timestamps[key];
    },

    getAge: function (key) {
      var ts = this._timestamps[key];
      if (!ts) return -1;
      return Date.now() - ts;
    },

    getAgeLabel: function (key) {
      var age = this.getAge(key);
      if (age < 0) return '';
      var sec = Math.floor(age / 1000);
      if (sec < 60) return 'Cached ' + sec + 's ago';
      var min = Math.floor(sec / 60);
      return 'Cached ' + min + 'm ' + (sec % 60) + 's ago';
    },

    isStale: function (key) {
      return this.getAge(key) > this.DEFAULT_TTL;
    },

    clearAll: function () {
      this._store = {};
      this._timestamps = {};
    },
  };

  global.NibrasProjectsCache = projectsCache;
})(typeof window !== 'undefined' ? window : globalThis);
