#!/usr/bin/env python3
"""
Run Ovarian Cancer Demo Case Through Virtual Tumor Board
Generates PDF report and opens it

Usage:
    python scripts/run_ovarian_case.py [--local] [--case CASE_ID]
"""

import os
import sys
import json
import time
import argparse
import subprocess
from pathlib import Path
from datetime import datetime

# Add requests if not available
try:
    import requests
except ImportError:
    print("Installing requests...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "-q"])
    import requests

# Configuration
PRODUCTION_URL = "https://virtual-tumor-board-production.up.railway.app"
LOCAL_URL = "http://localhost:3000"
DEFAULT_CASE = "ovarian-brca1-hgsoc"


def get_base_url(use_local: bool) -> str:
    return LOCAL_URL if use_local else PRODUCTION_URL


def stream_deliberation(base_url: str, case_id: str) -> dict:
    """Stream the deliberation and collect all responses"""
    print(f"\n🏥 Starting Virtual Tumor Board Deliberation")
    print(f"   Case: {case_id}")
    print(f"   Server: {base_url}")
    print("-" * 60)

    url = f"{base_url}/api/deliberate/stream?caseId={case_id}&refresh=true"

    agent_responses = {}
    consensus = ""
    current_agent = None
    current_response = ""

    try:
        response = requests.get(url, stream=True, timeout=300)
        response.raise_for_status()

        for line in response.iter_lines():
            if line:
                line_str = line.decode("utf-8")
                if line_str.startswith("data: "):
                    try:
                        data = json.loads(line_str[6:])
                        event_type = data.get("type", "")

                        if event_type == "case_info":
                            print(f"📋 Case loaded: {data.get('caseId')}")
                            print(f"   Cached: {data.get('isCached', False)}")

                        elif event_type == "phase_change":
                            phase = data.get("phase", "")
                            print(f"\n📍 Phase: {phase}")

                        elif event_type == "agent_start":
                            agent_id = data.get("agentId", "")
                            agent_name = data.get("name", agent_id)
                            current_agent = agent_id
                            current_response = ""
                            print(
                                f"\n👨‍⚕️ {agent_name} is thinking...", end="", flush=True
                            )

                        elif event_type == "agent_chunk":
                            chunk = data.get("chunk", "")
                            current_response += chunk
                            # Print dots for progress
                            print(".", end="", flush=True)

                        elif event_type == "agent_complete":
                            agent_id = data.get("agentId", current_agent)
                            if agent_id and current_response:
                                agent_responses[agent_id] = {
                                    "response": current_response,
                                    "citations": data.get("citations", []),
                                    "toolsUsed": data.get("toolsUsed", []),
                                }
                            word_count = len(current_response.split())
                            print(f" Done! ({word_count} words)")

                        elif event_type == "consensus_chunk":
                            consensus += data.get("chunk", "")

                        elif event_type == "done":
                            print("\n✅ Deliberation complete!")
                            break

                    except json.JSONDecodeError:
                        pass

    except requests.exceptions.Timeout:
        print("\n⚠️ Request timed out - deliberation may still be processing")
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Error: {e}")
        return {}

    return {
        "agentResponses": agent_responses,
        "consensus": consensus,
        "caseId": case_id,
    }


def generate_pdf_via_api(base_url: str, case_id: str, deliberation_data: dict) -> bytes:
    """Generate PDF using the API (if available) or create locally"""
    print("\n📄 Generating PDF report...")

    # For now, we'll create a simple text-based summary
    # The actual PDF generation happens client-side in the browser
    # So we'll output a summary and instructions

    return deliberation_data


def save_deliberation_json(case_id: str, data: dict, output_dir: Path) -> Path:
    """Save deliberation data as JSON"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"deliberation_{case_id}_{timestamp}.json"
    filepath = output_dir / filename

    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)

    print(f"💾 Saved deliberation data: {filepath}")
    return filepath


def create_text_report(case_id: str, data: dict, output_dir: Path) -> Path:
    """Create a text-based report from deliberation data"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"tumor_board_report_{case_id}_{timestamp}.txt"
    filepath = output_dir / filename

    agent_names = {
        "surgical-oncologist": "Dr. Shalya - Surgical Oncology",
        "medical-oncologist": "Dr. Chikitsa - Medical Oncology",
        "radiation-oncologist": "Dr. Kirann - Radiation Oncology",
        "palliative-care": "Dr. Shanti - Palliative Care",
        "radiologist": "Dr. Chitran - Onco-Radiology",
        "pathologist": "Dr. Marga - Pathology",
        "geneticist": "Dr. Anuvamsha - Genetics",
    }

    with open(filepath, "w") as f:
        f.write("=" * 80 + "\n")
        f.write("VIRTUAL TUMOR BOARD REPORT\n")
        f.write(f"Case: {case_id}\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 80 + "\n\n")

        # Specialist opinions
        f.write("SPECIALIST OPINIONS\n")
        f.write("-" * 80 + "\n\n")

        for agent_id, agent_data in data.get("agentResponses", {}).items():
            agent_name = agent_names.get(agent_id, agent_id)
            response = agent_data.get("response", "No response")
            word_count = len(response.split())

            f.write(f"\n{'=' * 60}\n")
            f.write(f"{agent_name}\n")
            f.write(f"({'=' * 60}\n")
            f.write(f"[{word_count} words]\n\n")
            f.write(response)
            f.write("\n\n")

            citations = agent_data.get("citations", [])
            if citations:
                f.write(f"Citations: {', '.join(citations)}\n")

        # Consensus
        consensus = data.get("consensus", "")
        if consensus:
            f.write("\n" + "=" * 80 + "\n")
            f.write("TUMOR BOARD CONSENSUS\n")
            f.write("=" * 80 + "\n\n")
            f.write(consensus)

        f.write("\n\n" + "=" * 80 + "\n")
        f.write(
            "DISCLAIMER: This AI-generated report is for informational purposes only.\n"
        )
        f.write(
            "Always consult with qualified healthcare professionals for medical decisions.\n"
        )
        f.write("=" * 80 + "\n")

    print(f"📝 Saved text report: {filepath}")
    return filepath


def open_in_browser(url: str):
    """Open URL in default browser"""
    import webbrowser

    webbrowser.open(url)


def main():
    parser = argparse.ArgumentParser(description="Run Virtual Tumor Board deliberation")
    parser.add_argument(
        "--local", action="store_true", help="Use local server instead of production"
    )
    parser.add_argument(
        "--case", default=DEFAULT_CASE, help=f"Case ID to run (default: {DEFAULT_CASE})"
    )
    parser.add_argument(
        "--output", default="./output", help="Output directory for reports"
    )
    parser.add_argument(
        "--open-browser", action="store_true", help="Open demo page in browser after"
    )
    args = parser.parse_args()

    base_url = get_base_url(args.local)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("\n" + "=" * 60)
    print("🧠 VIRTUAL TUMOR BOARD - CLI Runner")
    print("=" * 60)

    # Check server availability
    print(f"\n🔍 Checking server availability...")
    try:
        health_check = requests.get(f"{base_url}/api/analytics/status", timeout=10)
        health_check.raise_for_status()
        print(f"   ✅ Server is online")
    except:
        print(f"   ⚠️ Server may not be available at {base_url}")
        if not args.local:
            print("   Tip: Try --local if running locally")

    # Run deliberation
    start_time = time.time()
    deliberation_data = stream_deliberation(base_url, args.case)
    elapsed_time = time.time() - start_time

    if not deliberation_data.get("agentResponses"):
        print("\n❌ No deliberation data received. Please check the server logs.")
        sys.exit(1)

    print(f"\n⏱️ Total deliberation time: {elapsed_time:.1f} seconds")

    # Count total words
    total_words = sum(
        len(a.get("response", "").split())
        for a in deliberation_data.get("agentResponses", {}).values()
    )
    total_words += len(deliberation_data.get("consensus", "").split())
    print(f"📊 Total words generated: {total_words:,}")

    # Save outputs
    json_path = save_deliberation_json(args.case, deliberation_data, output_dir)
    txt_path = create_text_report(args.case, deliberation_data, output_dir)

    # Print summary
    print("\n" + "=" * 60)
    print("📋 SPECIALIST RESPONSE SUMMARY")
    print("=" * 60)

    for agent_id, agent_data in deliberation_data.get("agentResponses", {}).items():
        response = agent_data.get("response", "")
        word_count = len(response.split())
        char_count = len(response)
        status = "✅" if word_count >= 400 else "⚠️" if word_count >= 200 else "❌"
        print(f"  {status} {agent_id}: {word_count} words ({char_count:,} chars)")

    consensus_words = len(deliberation_data.get("consensus", "").split())
    print(
        f"  {'✅' if consensus_words >= 500 else '⚠️'} consensus: {consensus_words} words"
    )

    print("\n" + "=" * 60)
    print("📁 OUTPUT FILES")
    print("=" * 60)
    print(f"  JSON: {json_path}")
    print(f"  Text: {txt_path}")

    # Open text report
    print(f"\n📖 Opening text report...")
    if sys.platform == "darwin":
        subprocess.run(["open", str(txt_path)])
    elif sys.platform == "win32":
        os.startfile(str(txt_path))
    else:
        subprocess.run(["xdg-open", str(txt_path)])

    # Optionally open browser
    if args.open_browser:
        demo_url = f"{base_url}/demo"
        print(f"\n🌐 Opening demo page: {demo_url}")
        open_in_browser(demo_url)

    print("\n" + "=" * 60)
    print("💡 TO GENERATE PDF:")
    print("=" * 60)
    print(f"  1. Open: {base_url}/demo")
    print(f"  2. Select case: {args.case}")
    print(f"  3. Click 'Start AI Tumor Board Deliberation'")
    print(f"  4. After completion, click 'Download PDF'")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
