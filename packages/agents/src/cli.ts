#!/usr/bin/env node
/**
 * Virtual Tumor Board CLI
 * 
 * Command-line interface for running tumor board deliberations.
 * 
 * Usage:
 *   pnpm deliberate --demo              # Run with demo case
 *   pnpm deliberate --case ./case.json  # Run with custom case file
 */

import { config } from "dotenv";
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { TumorBoardOrchestrator } from "./orchestrator";
import { AGENT_PERSONAS } from "./specialists";
import type { CaseData, AgentId, DeliberationPhase } from "./types";

// Load environment variables
config();

// Demo case for testing
const DEMO_CASE: CaseData = {
  id: "demo-case-001",
  patient: {
    id: "patient-001",
    mrn: "MRN-2024-12345",
    name: "Rajesh Kumar",
    age: 58,
    gender: "male",
    ecogPs: 1,
    comorbidities: ["Type 2 Diabetes (controlled)", "Hypertension (controlled)"],
    smokingHistory: "30 pack-years, quit 5 years ago",
    insuranceType: "ayushman_bharat",
    state: "MH",
    language: "hindi",
  },
  diagnosis: {
    cancerType: "lung_nsclc",
    histology: "Adenocarcinoma",
    histologyCode: "8140/3",
    primarySite: "Right upper lobe",
    primarySiteCode: "C34.1",
    stage: {
      clinical: { t: "T2b", n: "N2", m: "M0" },
      composite: "Stage IIIA",
      stagingSystem: "ajcc8",
    },
    biomarkers: [
      { name: "EGFR", result: "Negative", method: "NGS" },
      { name: "ALK", result: "Negative", method: "IHC/FISH" },
      { name: "ROS1", result: "Negative", method: "IHC" },
      { name: "PD-L1", result: "60%", method: "IHC (22C3)", interpretation: "High expression" },
      { name: "KRAS", result: "G12C Positive", method: "NGS", interpretation: "Actionable mutation" },
    ],
    genomics: {
      testType: "panel",
      mutations: [
        {
          gene: "KRAS",
          variant: "G12C",
          vaf: 35,
          classification: "pathogenic",
          actionable: true,
        },
        {
          gene: "TP53",
          variant: "R248W",
          vaf: 42,
          classification: "pathogenic",
          actionable: false,
        },
      ],
      tmb: 8,
      msi: "MSS",
    },
    diagnosisDate: new Date("2024-01-10"),
  },
  clinicalQuestion:
    "58-year-old male with Stage IIIA NSCLC (cT2bN2M0), adenocarcinoma. KRAS G12C positive, PD-L1 60%. Is this patient a candidate for definitive chemoradiotherapy vs. surgery? Should we consider KRAS G12C targeted therapy (sotorasib) or immunotherapy consolidation given the PD-L1 expression?",
  priority: "routine",
  submittedAt: new Date(),
};

const program = new Command();

program
  .name("vtb-deliberate")
  .description("Virtual Tumor Board - AI-powered multi-agent deliberation")
  .version("0.1.0");

program
  .option("-d, --demo", "Run with demo case (Stage IIIA NSCLC)")
  .option("-c, --case <path>", "Path to case JSON file")
  .option("-a, --agents <agents>", "Comma-separated list of agents to include")
  .option("-v, --verbose", "Enable verbose output")
  .option("--no-tools", "Disable tool use (faster, less grounded)")
  .action(async (options) => {
    console.log(chalk.bold.blue(`
╔══════════════════════════════════════════════════════════════╗
║           VIRTUAL TUMOR BOARD - AI DELIBERATION              ║
║                    Multi-Agent Oncology MDT                  ║
╚══════════════════════════════════════════════════════════════╝
`));

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log(chalk.red("Error: ANTHROPIC_API_KEY environment variable not set"));
      console.log(chalk.yellow("Set it in .env file or export ANTHROPIC_API_KEY=your_key"));
      process.exit(1);
    }

    // Load case data
    let caseData: CaseData;
    if (options.demo) {
      console.log(chalk.cyan("Using demo case: Stage IIIA NSCLC with KRAS G12C\n"));
      caseData = DEMO_CASE;
    } else if (options.case) {
      try {
        const fs = await import("fs");
        const caseJson = fs.readFileSync(options.case, "utf-8");
        caseData = JSON.parse(caseJson);
        console.log(chalk.cyan(`Loaded case from: ${options.case}\n`));
      } catch (error) {
        console.log(chalk.red(`Error loading case file: ${options.case}`));
        process.exit(1);
      }
    } else {
      console.log(chalk.yellow("No case specified. Use --demo or --case <path>"));
      console.log(chalk.gray("Run with --help for usage information"));
      process.exit(1);
    }

    // Display case summary
    console.log(chalk.bold("CASE SUMMARY"));
    console.log(chalk.gray("─".repeat(60)));
    console.log(`Patient: ${chalk.white(caseData.patient.name)}, ${caseData.patient.age}${caseData.patient.gender === "male" ? "M" : "F"}`);
    console.log(`Diagnosis: ${chalk.white(caseData.diagnosis.histology)} - ${caseData.diagnosis.primarySite}`);
    console.log(`Stage: ${chalk.yellow(caseData.diagnosis.stage.composite)}`);
    console.log(`Key Biomarkers:`);
    for (const bm of caseData.diagnosis.biomarkers) {
      const color = bm.result.toLowerCase().includes("positive") || parseFloat(bm.result) > 50 
        ? chalk.green 
        : chalk.gray;
      console.log(`  - ${bm.name}: ${color(bm.result)}`);
    }
    console.log(`\n${chalk.bold("Clinical Question:")}`);
    console.log(chalk.italic(caseData.clinicalQuestion));
    console.log(chalk.gray("─".repeat(60)));

    // Parse agent selection
    const selectedAgents: AgentId[] | undefined = options.agents
      ? options.agents.split(",").map((a: string) => a.trim() as AgentId)
      : undefined;

    if (selectedAgents) {
      console.log(chalk.cyan(`\nSelected agents: ${selectedAgents.join(", ")}`));
    }

    // Create orchestrator
    const orchestrator = new TumorBoardOrchestrator({
      verbose: options.verbose,
    });

    // Track phase for UI
    const phaseSpinner = ora();
    const agentStatus = new Map<AgentId, "pending" | "active" | "complete">();

    // Run deliberation
    console.log(chalk.bold("\n\nSTARTING DELIBERATION\n"));
    const startTime = Date.now();

    try {
      const result = await orchestrator.deliberate(caseData, {
        includeAgents: selectedAgents,
        onPhaseChange: (phase: DeliberationPhase) => {
          phaseSpinner.stop();
          switch (phase) {
            case "round1_opinions":
              console.log(chalk.bold.yellow("\n═══ ROUND 1: SPECIALIST CONSULTATIONS ═══\n"));
              break;
            case "round2_debate":
              console.log(chalk.bold.yellow("\n═══ ROUND 2: CHAIN OF DEBATE ═══\n"));
              break;
            case "round3_consensus":
              console.log(chalk.bold.yellow("\n═══ ROUND 3: CONSENSUS BUILDING ═══\n"));
              phaseSpinner.start("Building consensus recommendation...");
              break;
            case "completed":
              phaseSpinner.succeed("Deliberation complete!");
              break;
            case "error":
              phaseSpinner.fail("Deliberation failed");
              break;
          }
        },
        onStreamChunk: (chunk) => {
          if (chunk.type === "agent_start" && chunk.agentId) {
            const persona = AGENT_PERSONAS[chunk.agentId];
            agentStatus.set(chunk.agentId, "active");
            phaseSpinner.start(`${persona.name} (${persona.specialty}) analyzing case...`);
          }
          if (chunk.type === "agent_complete" && chunk.agentId) {
            const persona = AGENT_PERSONAS[chunk.agentId];
            agentStatus.set(chunk.agentId, "complete");
            phaseSpinner.succeed(`${persona.name} completed`);
          }
          if (chunk.type === "tool_call" && chunk.toolName) {
            phaseSpinner.text = `  └─ Tool: ${chunk.toolName}`;
          }
        },
      });

      // Display results
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log(chalk.bold.green("\n\n╔══════════════════════════════════════════════════════════════╗"));
      console.log(chalk.bold.green("║              TUMOR BOARD RECOMMENDATION                       ║"));
      console.log(chalk.bold.green("╚══════════════════════════════════════════════════════════════╝\n"));

      if (result.recommendation) {
        console.log(chalk.bold("Treatment Intent:"), chalk.cyan(result.recommendation.intent.toUpperCase()));
        console.log(chalk.bold("Primary Modality:"), chalk.cyan(result.recommendation.primaryModality));
        console.log(chalk.bold("\nRecommendation Summary:"));
        console.log(chalk.white(result.recommendation.summary));
      }

      if (result.rounds.consensus) {
        console.log(chalk.bold("\n\nFULL CONSENSUS RATIONALE:"));
        console.log(chalk.gray("─".repeat(60)));
        console.log(result.rounds.consensus.rationale);
        console.log(chalk.gray("─".repeat(60)));
        
        console.log(chalk.bold("\nConfidence Level:"), 
          result.rounds.consensus.confidence === "high" ? chalk.green("HIGH") :
          result.rounds.consensus.confidence === "moderate" ? chalk.yellow("MODERATE") :
          chalk.red("LOW")
        );
      }

      // Display individual agent responses
      if (options.verbose && result.rounds.round1) {
        console.log(chalk.bold("\n\nINDIVIDUAL SPECIALIST OPINIONS:"));
        console.log(chalk.gray("═".repeat(60)));
        
        for (const [agentId, response] of result.rounds.round1.responses) {
          const persona = AGENT_PERSONAS[agentId];
          console.log(chalk.bold.blue(`\n${persona.name} (${persona.specialty}):`));
          console.log(chalk.gray("─".repeat(40)));
          console.log(response.response);
          if (response.citations.length > 0) {
            console.log(chalk.gray(`\nCitations: ${response.citations.map(c => c.source).join(", ")}`));
          }
        }
      }

      // Display statistics
      console.log(chalk.bold("\n\nDELIBERATION STATISTICS"));
      console.log(chalk.gray("─".repeat(40)));
      console.log(`Total Time: ${chalk.cyan(elapsed + "s")}`);
      console.log(`Estimated Cost: ${chalk.cyan("$" + result.costs.total.toFixed(4))}`);
      console.log(`  - Round 1: $${result.costs.round1.toFixed(4)}`);
      console.log(`  - Round 2: $${result.costs.round2.toFixed(4)}`);
      console.log(`  - Consensus: $${result.costs.consensus.toFixed(4)}`);

      console.log(chalk.gray("\n" + "─".repeat(60)));
      console.log(chalk.italic.gray("This is an AI-generated recommendation. Always verify with clinical judgment."));

    } catch (error) {
      phaseSpinner.fail("Deliberation failed");
      console.error(chalk.red("\nError:"), error instanceof Error ? error.message : error);
      if (options.verbose && error instanceof Error) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

program.parse();
