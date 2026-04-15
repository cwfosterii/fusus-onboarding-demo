/**
 * DEMO ONLY — remove or gate behind env before production.
 *
 * Clears the entire origin localStorage (all `fusus-*` keys and any other keys
 * stored by this app: task progress, welcome flag, per-task forms, agency POC,
 * readiness dual-input state, deployments, onsite requests, PSO notes, etc.)
 * then reloads so the UI returns to step 1 / initial demo state.
 */
export function resetDemo(): void {
  if (typeof window === "undefined") return;
  if (
    !window.confirm(
      "Are you sure you want to reset the demo? All saved onboarding progress and local data for this site will be cleared.",
    )
  ) {
    return;
  }
  window.localStorage.clear();
  window.location.reload();
}
