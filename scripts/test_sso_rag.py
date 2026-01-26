#!/usr/bin/env python3
"""
Test SSO RAG Integration - Query the File Search store

Usage:
    source .venv/bin/activate
    python scripts/test_sso_rag.py
"""

import os
from pathlib import Path
from google import genai
from google.genai import types

# Load API key
API_KEY = os.getenv("GOOGLE_AI_API_KEY")
if not API_KEY:
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                if line.startswith("GOOGLE_AI_API_KEY="):
                    API_KEY = line.strip().split("=", 1)[1]
                    break

if not API_KEY:
    raise ValueError("GOOGLE_AI_API_KEY not found")

# SSO Store ID
SSO_STORE_ID = "sso-surgical-oncology-guide-r0o89zpazglb"

# Initialize client
client = genai.Client(api_key=API_KEY)

# Test queries for SSO guidelines
TEST_QUERIES = [
    {
        "query": "What are the recommended surgical margins for breast-conserving surgery in invasive breast cancer?",
        "expected_keywords": ["margin", "ink on tumor", "negative"],
    },
    {
        "query": "Should gene expression profiling (GEP) be used for melanoma management decisions?",
        "expected_keywords": ["GEP", "gene expression", "melanoma"],
    },
    {
        "query": "What are the SSO Choosing Wisely recommendations?",
        "expected_keywords": ["sentinel lymph node", "contralateral", "question"],
    },
    {
        "query": "What are the indications for germline genetic testing in breast cancer patients?",
        "expected_keywords": ["germline", "BRCA", "genetic", "testing"],
    },
]


def test_query(query: str, expected_keywords: list) -> dict:
    """Test a single query against the SSO File Search store"""
    print(f"\n{'=' * 60}")
    print(f"Query: {query[:80]}...")
    print("=" * 60)

    try:
        # Use Gemini with File Search grounding
        response = client.models.generate_content(
            model="gemini-3-flash-preview",  # File Search requires gemini-3-flash-preview
            contents=query,
            config=types.GenerateContentConfig(
                tools=[
                    types.Tool(
                        file_search=types.FileSearch(
                            file_search_store_names=[f"fileSearchStores/{SSO_STORE_ID}"]
                        )
                    )
                ],
                temperature=0.1,
            ),
        )

        answer = response.text or ""
        print(f"\nResponse ({len(answer)} chars):")
        print("-" * 40)
        print(answer[:1000] + ("..." if len(answer) > 1000 else ""))

        # Check for expected keywords
        found = []
        missing = []
        for kw in expected_keywords:
            if kw.lower() in answer.lower():
                found.append(kw)
            else:
                missing.append(kw)

        print(f"\nKeywords found: {found}")
        if missing:
            print(f"Keywords missing: {missing}")

        # Check for grounding metadata
        if hasattr(response, "candidates") and response.candidates:
            candidate = response.candidates[0]
            if (
                hasattr(candidate, "grounding_metadata")
                and candidate.grounding_metadata
            ):
                gm = candidate.grounding_metadata
                chunks = getattr(gm, "grounding_chunks", None)
                print(f"Grounding sources: {len(chunks) if chunks else 'N/A'}")

        return {
            "success": True,
            "found_keywords": found,
            "missing_keywords": missing,
            "response_length": len(answer),
        }

    except Exception as e:
        print(f"\nERROR: {e}")
        return {"success": False, "error": str(e)}


def main():
    print("=" * 60)
    print("SSO RAG Integration Test")
    print(f"Store: {SSO_STORE_ID}")
    print("=" * 60)

    results = []
    for test in TEST_QUERIES:
        result = test_query(test["query"], test["expected_keywords"])
        results.append(result)

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    passed = sum(1 for r in results if r.get("success"))
    print(f"\nTests passed: {passed}/{len(results)}")

    for i, (test, result) in enumerate(zip(TEST_QUERIES, results)):
        status = "PASS" if result.get("success") else "FAIL"
        print(f"  {i + 1}. [{status}] {test['query'][:50]}...")


if __name__ == "__main__":
    main()
