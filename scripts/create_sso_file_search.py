#!/usr/bin/env python3
"""
Create Gemini File Search store for SSO Guidelines

Usage:
    source .venv/bin/activate
    python scripts/create_sso_file_search.py
"""

import os
from pathlib import Path
from google import genai
from google.genai import types

# Load API key from environment or .env file
API_KEY = os.getenv("GOOGLE_AI_API_KEY")
if not API_KEY:
    # Try loading from .env
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                if line.startswith("GOOGLE_AI_API_KEY="):
                    API_KEY = line.strip().split("=", 1)[1]
                    break

if not API_KEY:
    raise ValueError("GOOGLE_AI_API_KEY not found in environment or .env file")

print(f"Using API key: {API_KEY[:20]}...")

# Initialize client
client = genai.Client(api_key=API_KEY)

# SSO Guidelines directory
SSO_DIR = Path(__file__).parent.parent / "guidelines" / "sso"


def list_existing_stores():
    """List all existing file search stores"""
    print("\n=== Existing File Search Stores ===")
    try:
        stores = list(client.file_search_stores.list())
        if not stores:
            print("  No existing stores found")
        for store in stores:
            print(f"  - {store.display_name}: {store.name}")
        return stores
    except Exception as e:
        print(f"  Error listing stores: {e}")
        return []


def create_store():
    """Create a new file search store for SSO guidelines"""
    print("\n=== Creating SSO File Search Store ===")

    store = client.file_search_stores.create(
        config=types.CreateFileSearchStoreConfig(
            display_name="SSO Surgical Oncology Guidelines",
        )
    )

    if store is None:
        raise RuntimeError("Failed to create store - returned None")

    print(f"Created store: {store.name}")
    store_id = store.name.split("/")[-1] if store.name else "unknown"
    print(f"Store ID: {store_id}")

    return store


def upload_documents(store):
    """Upload all PDFs to the file search store"""
    pdf_files = sorted(SSO_DIR.glob("*.pdf"))
    print(f"\n=== Uploading {len(pdf_files)} PDFs ===")

    if not store.name:
        raise RuntimeError("Store has no name")

    for pdf_path in pdf_files:
        size_kb = pdf_path.stat().st_size // 1024
        print(f"\n  {pdf_path.name} ({size_kb}KB)")

        try:
            # Use the upload_to_file_search_store method
            # file parameter accepts path string directly
            operation = client.file_search_stores.upload_to_file_search_store(
                file_search_store_name=store.name,
                file=str(pdf_path),
                config=types.UploadToFileSearchStoreConfig(
                    display_name=pdf_path.stem,
                ),
            )
            print(
                f"    -> Upload started: {operation.name if hasattr(operation, 'name') else 'OK'}"
            )

            # Wait for operation to complete if it's async
            if hasattr(operation, "result"):
                result = operation.result()
                print(f"    -> Completed: {result}")

        except Exception as e:
            print(f"    -> ERROR: {e}")

    print("\n=== Upload Complete ===")


def main():
    print("=" * 60)
    print("SSO Guidelines - Gemini File Search Store Creator")
    print("=" * 60)

    # List existing stores
    list_existing_stores()

    # Create new store
    store = create_store()

    # Upload documents
    upload_documents(store)

    # Final summary
    store_id = store.name.split("/")[-1] if store.name else "unknown"
    print("\n" + "=" * 60)
    print("SUCCESS!")
    print("=" * 60)
    print(f"\nStore Name: {store.name}")
    print(f"Store ID: {store_id}")
    print(f"\nAdd this to your .env file:")
    print(f"FILE_SEARCH_SSO={store_id}")
    print("\nUpdate packages/agents/src/rag/connector.ts:")
    print(f'  sso: process.env.FILE_SEARCH_SSO || "{store_id}",')


if __name__ == "__main__":
    main()
