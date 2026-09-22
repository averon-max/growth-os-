import { getKeywords } from "../src/lib/keywords/repository";

const WORKSPACE_ID = "cmt6q9xyk0001ccql1lave9e2";

async function main() {
  const result = await getKeywords(WORKSPACE_ID, { page: 1, limit: 25 });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
