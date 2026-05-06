import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline";
import { handleJsonEngineLine } from "./integration/json-engine.js";
import { IntegrationService } from "./integration/service.js";

export async function main(): Promise<void> {
  const service = new IntegrationService();
  const lines = createInterface({ input, crlfDelay: Infinity });

  for await (const line of lines) {
    if (line.trim().length === 0) continue;

    const lineResponse = await handleJsonEngineLine(service, line);
    output.write(`${lineResponse}\n`);

    const parsed = JSON.parse(lineResponse) as { result?: { shutdown?: boolean } };
    if (parsed.result?.shutdown === true) break;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
