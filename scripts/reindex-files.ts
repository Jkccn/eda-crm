import { reindexMissingDocuments } from "../src/lib/document-reindex";
import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await reindexMissingDocuments();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
