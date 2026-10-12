/** Re-export the production-typed helper for the staging CLI.
 * When running this script from a temporary diagnostics directory, copy the
 * source helper beside it without changing the main checkout.
 */
export { rebindApprovedDirectAnswerV1 } from "../src/lib/content/rebind-approved-direct-answer-v1";
