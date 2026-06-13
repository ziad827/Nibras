(function () {
  const BOOTSTRAP_FILE_NAME = 'react-bootstrap.js';
  const resolveBootstrapBase = () => {
    if (typeof document === 'undefined') return '/';
    let source = document.currentScript?.src || '';
    if (!source) {
      const scripts = Array.from(document.scripts || []);
      const matched = scripts.find((script) =>
        String(script.src || '').includes(`/${BOOTSTRAP_FILE_NAME}`),
      );
      source = matched?.src || '';
    }
    if (!source) return '/';
    return source.replace(/[^/]*$/, '');
  };
  const BOOTSTRAP_BASE = resolveBootstrapBase();
  const timestamp = Date.now();
  const CONFIG_SRC = new URL(
    `config.js?v=${timestamp}`,
    BOOTSTRAP_BASE,
  ).toString();
  const SHARED_UTILS_SRC = new URL(
    `react-page-utils.js?v=${timestamp}`,
    BOOTSTRAP_BASE,
  ).toString();
  const SERVICES_SRC = new URL(
    `services/api.js?v=${timestamp}`,
    BOOTSTRAP_BASE,
  ).toString();
  const SCRIPT_ATTR = 'data-react-bootstrap-src';
  let bootstrapDepsPromise = null;

  const runOnDomReady = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  };

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const existingScript =
        document.querySelector(`script[${SCRIPT_ATTR}="${src}"]`) ||
        Array.from(document.scripts).find((script) => script.src === src);

      if (existingScript) {
        if (existingScript.dataset.loaded === 'true') {
          resolve();
          return;
        }

        existingScript.addEventListener('load', () => resolve(), {
          once: true,
        });
        existingScript.addEventListener(
          'error',
          () => reject(new Error(`Failed to load ${src}`)),
          { once: true },
        );
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.loaded = 'false';
      script.setAttribute(SCRIPT_ATTR, src);
      script.addEventListener(
        'load',
        () => {
          script.dataset.loaded = 'true';
          resolve();
        },
        { once: true },
      );
      script.addEventListener(
        'error',
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true },
      );
      document.head.appendChild(script);
    });

  const ensureSharedUtilsLoaded = () => {
    if (window.NibrasShared) {
      return Promise.resolve();
    }
    return loadScript(SHARED_UTILS_SRC).catch(() => Promise.resolve());
  };

  const ensureConfigLoaded = () => {
    if (window.NibrasApiConfig || window.NIBRAS_API_URL) {
      return Promise.resolve();
    }
    return loadScript(CONFIG_SRC).catch(() => Promise.resolve());
  };

  const ensureServicesLoaded = () => {
    if (window.NibrasServices) {
      return Promise.resolve();
    }
    return loadScript(SERVICES_SRC).catch(() => Promise.resolve());
  };

  const ensureBootstrapDependencies = () => {
    if (!bootstrapDepsPromise) {
      bootstrapDepsPromise = ensureConfigLoaded()
        .then(() => ensureSharedUtilsLoaded())
        .then(() => ensureServicesLoaded());
    }
    return bootstrapDepsPromise;
  };

  const runInitializer = (initializer) => {
    runOnDomReady(() => {
      try {
        initializer();
      } catch (error) {
        setTimeout(() => {
          throw error;
        }, 0);
      }
    });
  };

  window.bootstrapReactPage = (initializer) => {
    if (typeof initializer !== 'function') {
      return;
    }

    ensureBootstrapDependencies()
      .then(() => runInitializer(initializer))
      .catch(() => runInitializer(initializer));
  };

  window.NibrasReact = {
    run(initializer) {
      window.bootstrapReactPage(initializer);
    },
    get shared() {
      return window.NibrasShared || {};
    },
  };
})();
