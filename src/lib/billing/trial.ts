import type { PlanId } from "./plans";

/** Free trial: a card is required, the first charge happens after the trial unless the customer cancels. */
export const TRIAL_DAYS = 7;
export const TRIAL_PLAN: PlanId = "STARTER";

/**
 * Requests to paid features (keyword data, audits…) allowed during one trial.
 * Most answers come from saved data, so this keeps a trial at roughly $1–1.50 of DataForSEO / GPT cost.
 * Change with TRIAL_PAID_REQUESTS.
 */
export const trialPaidRequests = () => {
  const n = Math.round(Number(process.env.TRIAL_PAID_REQUESTS));
  return Number.isFinite(n) && n > 0 ? n : 60;
};

/** Who gets an email when someone starts a trial. */
export const trialNotifyEmail = () => process.env.TRIAL_NOTIFY_EMAIL?.trim() || "dato.kosik@gmail.com";
