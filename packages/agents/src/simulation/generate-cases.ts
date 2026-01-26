
import { VignetteGenerator } from "./vignette-generator";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is not set.");
    process.exit(1);
  }

  const generator = new VignetteGenerator(apiKey);
  const outDir = path.join(process.cwd(), "simulation-cases");
  
  await fs.mkdir(outDir, { recursive: true });

  console.log("Generating 3 synthetic breast cancer cases (Standard, Complex, Refractory)...");
  const cases = await generator.generateSuite(3, "breast");

  for (const c of cases) {
    const filename = `${c.id}.json`;
    await fs.writeFile(path.join(outDir, filename), JSON.stringify(c, null, 2));
    console.log(`Saved ${filename}`);
  }
}

main().catch(console.error);
