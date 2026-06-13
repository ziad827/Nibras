/**
 * Lightweight query timing for hot-path diagnostics (dev / structured logs).
 */
const HOT_PATHS = new Set([
  'getHomeDashboard',
  'getProgramBundle',
  'getMetrics',
  'getStudentTrackingDashboard',
]);

export async function traceDbOperation<T>(
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!HOT_PATHS.has(operation) && process.env.NIBRAS_DB_QUERY_LOG !== '1') {
    return fn();
  }
  const started = performance.now();
  try {
    return await fn();
  } finally {
    const durationMs = Math.round(performance.now() - started);
    if (process.env.NIBRAS_DB_QUERY_LOG === '1' || durationMs > 500) {
      console.info(
        JSON.stringify({
          level: 'info',
          msg: 'db_operation',
          operation,
          durationMs,
        }),
      );
    }
  }
}
