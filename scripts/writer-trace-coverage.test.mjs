/**
 * Static observability contract, not a production integration test.
 * Does not execute Writer, contact providers, read databases or incur fees.
 * Prevents accidental removal of the essential diagnostic boundaries.
 */
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const contracts = [
  {
    path: "src/lib/content/service.ts",
    markers: [
      'scope: "content.brief"', 'scope: "content.article"',
      "keywords.full_strategy", "writer.draft_and_contract",
      "critic.initial_suite", "critic.repair_execution",
      "serp.replay_and_repair", "audit.publication_policy", "audit.final_readiness",
    ],
  },
  {
    path: "src/lib/content/seo-strategy.ts",
    markers: ["keywords.candidate_sources",
      "keywords.scored_and_primary_ownership", "keywords.all_ranked_decisions"],
  },
  {
    path: "src/lib/content/final-content-plan.ts",
    markers: ["serp.initial_full_results", "serp.plan_and_feasibility"],
  },
  {
    path: "src/lib/content/production-master-live-source-adapter.ts",
    markers: ["research.raw_provider_results", "research.snapshot_and_provenance"],
  },
  {
    path: "src/lib/content/production-master-live-stage-planner.ts",
    markers: ["planner.research_and_mission", "planner.model_initial_response",
      "planner.validation_and_current_plan", "planner.final_artifacts"],
  },
  {
    path: "src/lib/content/openai-generator.ts",
    markers: ["model.request_input", "model.response_envelope", "model.usage",
      "model.request_failed_attempt"],
  },
];

for (const contract of contracts) {
  test("writer trace markers exist in " + contract.path, async () => {
    const source = await readFile(fileURLToPath(new URL(contract.path, root)), "utf8");
    for (const marker of contract.markers) {
      assert.ok(source.includes(marker), "Missing logging boundary: " + marker);
    }
  });
}
