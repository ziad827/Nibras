/** Runtime toggles for seed volume and auto-enrollment (see .env.example). */

export function shouldRuntimeCurriculumSeed(): boolean {
  const flag = process.env.NIBRAS_RUNTIME_CURRICULUM_SEED?.trim().toLowerCase();
  if (flag === 'false' || flag === '0') return false;
  if (flag === 'true' || flag === '1') return true;
  return process.env.NODE_ENV !== 'production';
}

export function shouldAutoEnrollPublicCourses(): boolean {
  const flag = process.env.NIBRAS_AUTO_ENROLL_PUBLIC?.trim().toLowerCase();
  if (flag === 'false' || flag === '0') return false;
  return true;
}

export function shouldDemoShowcaseSeed(): boolean {
  const flag = process.env.NIBRAS_DEMO_SHOWCASE_SEED?.trim().toLowerCase();
  if (flag === 'false' || flag === '0') return false;
  if (flag === 'true' || flag === '1') return true;
  return true;
}
