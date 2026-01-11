#!/usr/bin/env python3
"""
Update Nintendo Switch capture IDs for nxshot-web.

This script fetches game data from multiple sources:
- switchbrew.org (wiki with game list)
- nswdb.com (XML database)
- titledb (blawar's comprehensive JSON database)

It encrypts the Title IDs to Capture IDs (what appears in screenshot filenames),
and saves the mapping to public/data/captureIds.json.

Environment Variables:
    CAPTURE_ID_KEY: Required. 32-character hex string (16 bytes) for AES-128-ECB
                    encryption of Title IDs to Capture IDs.

Usage:
    export CAPTURE_ID_KEY=<your-32-char-hex-key>
    python update_capture_ids.py                    # Fetch from all sources
    python update_capture_ids.py --source switchbrew
    python update_capture_ids.py --source nswdb
    python update_capture_ids.py --source titledb
    python update_capture_ids.py --dry-run          # Don't write file
"""

import argparse
import hashlib
import json
import logging
import os
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import TypedDict
from urllib.error import URLError
from urllib.request import urlopen, urlretrieve

from Crypto.Cipher import AES

# MD5 hash of the valid key (for verification without exposing the key)
CAPTURE_ID_KEY_HASH = "24e0dc62a15c11d38b622162ea2b4383"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s: %(message)s"
)
logger = logging.getLogger(__name__)


def get_capture_id_key() -> bytes:
    """
    Get the Capture ID encryption key from environment variable.

    The key should be set as CAPTURE_ID_KEY environment variable
    containing 32 hex characters (16 bytes). The key is verified
    against a known hash to ensure correctness.

    Raises:
        SystemExit: If the key is not set, invalid, or doesn't match the expected hash.
    """
    key_hex = os.environ.get("CAPTURE_ID_KEY")
    if not key_hex:
        logger.error("CAPTURE_ID_KEY environment variable is not set")
        logger.error("Set it with: export CAPTURE_ID_KEY=<32-char-hex-key>")
        sys.exit(1)

    try:
        key_bytes = bytes.fromhex(key_hex)
        if len(key_bytes) != 16:
            raise ValueError("Key must be 16 bytes (32 hex characters)")
    except ValueError as e:
        logger.error(f"Invalid CAPTURE_ID_KEY: {e}")
        sys.exit(1)

    # Verify key against known hash
    key_hash = hashlib.md5(key_bytes).hexdigest()
    if key_hash != CAPTURE_ID_KEY_HASH:
        logger.error("CAPTURE_ID_KEY does not match expected hash")
        sys.exit(1)

    return key_bytes

# Data sources
SWITCHBREW_URL = "https://switchbrew.org/wiki/Title_list/Games"
NSWDB_URL = "http://nswdb.com/xml.php"
TITLEDB_URL = "https://github.com/blawar/titledb/raw/refs/heads/master/US.en.json"

# Output path (relative to script location)
SCRIPT_DIR = Path(__file__).parent
OUTPUT_PATH = SCRIPT_DIR.parent / "public" / "data" / "captureIds.json"


class GameEntry(TypedDict):
    name: str
    region: str


def encrypt_title_id(title_id: str, key: bytes) -> str:
    """
    Encrypt a Nintendo Switch Title ID to the Capture ID format.

    The Switch encrypts the first 8 bytes of the Title ID using AES-128-ECB
    to generate the 32-character hex string that appears in screenshot filenames.

    Args:
        title_id: 16-character hex Title ID (e.g., "0100000000010000")
        key: 16-byte AES encryption key

    Returns:
        32-character uppercase hex Capture ID
    """
    # Take first 16 hex chars (8 bytes) and reverse byte order
    title_bytes = bytearray.fromhex(title_id[:16])
    title_bytes.reverse()

    # Pad to 16 bytes for AES block size
    title_bytes = title_bytes.ljust(16, b'\x00')

    # Encrypt with AES-128-ECB
    cipher = AES.new(key, AES.MODE_ECB)
    encrypted = cipher.encrypt(bytes(title_bytes))

    return encrypted.hex().upper()


def sanitize_game_name(name: str) -> str:
    """
    Sanitize game name for use as folder name.

    Replaces characters that are invalid in file/folder names.
    """
    # Replace colon with dash (common in game titles)
    name = name.replace(":", " -")
    # Replace other problematic characters
    name = name.replace("/", "-")
    name = name.replace("\\", "-")
    name = name.replace("?", "")
    name = name.replace("*", "")
    name = name.replace('"', "'")
    name = name.replace("<", "")
    name = name.replace(">", "")
    name = name.replace("|", "-")
    return name.strip()


def fetch_switchbrew(key: bytes) -> dict[str, str]:
    """
    Fetch capture IDs from switchbrew.org wiki.

    Args:
        key: 16-byte AES encryption key

    Returns:
        Dict mapping Capture ID to "Game Name (REGION)"
    """
    logger.info("Fetching from switchbrew.org...")

    try:
        from bs4 import BeautifulSoup
    except ImportError:
        logger.error("BeautifulSoup not installed. Run: pip install beautifulsoup4")
        return {}

    try:
        with urlopen(SWITCHBREW_URL, timeout=30) as response:
            html = response.read()
    except URLError as e:
        logger.error(f"Failed to fetch switchbrew.org: {e}")
        return {}

    soup = BeautifulSoup(html, "html.parser")

    # Find the game table
    table = soup.find("table", {"class": "wikitable"})
    if not table:
        logger.error("Could not find game table on switchbrew.org")
        return {}

    capture_ids: dict[str, str] = {}
    rows = table.find_all("tr")[1:]  # Skip header row

    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 3:
            continue

        try:
            # Switchbrew table structure:
            # Cell 0: Title ID
            # Cell 1: Game Name
            # Cell 2: Region
            # Cell 3+: Version, Type, Build IDs, etc.
            title_id = cells[0].get_text(strip=True)
            game_name = cells[1].get_text(strip=True)
            region = cells[2].get_text(strip=True) if len(cells) > 2 else ""

            if not title_id or not game_name or title_id == "None" or game_name == "None":
                continue

            # Must be valid hex (at least 16 chars)
            if len(title_id) < 16 or not all(c in "0123456789ABCDEFabcdef" for c in title_id[:16]):
                continue

            capture_id = encrypt_title_id(title_id, key)
            sanitized_name = sanitize_game_name(game_name)

            # Format: "Game Name (REGION)"
            if region and region != "None":
                capture_ids[capture_id] = f"{sanitized_name} ({region})"
            else:
                capture_ids[capture_id] = sanitized_name

        except (IndexError, ValueError) as e:
            logger.debug(f"Skipping row: {e}")
            continue

    logger.info(f"Found {len(capture_ids)} games from switchbrew.org")
    return capture_ids


def fetch_nswdb(key: bytes) -> dict[str, str]:
    """
    Fetch capture IDs from nswdb.com XML database.

    Args:
        key: 16-byte AES encryption key

    Returns:
        Dict mapping Capture ID to "Game Name (REGION)"
    """
    logger.info("Fetching from nswdb.com...")

    try:
        # Download to temp file
        with tempfile.NamedTemporaryFile(suffix=".xml", delete=False) as tmp:
            tmp_path = tmp.name

        urlretrieve(NSWDB_URL, tmp_path)
        tree = ET.parse(tmp_path)
        root = tree.getroot()

        # Clean up temp file
        Path(tmp_path).unlink()

    except (URLError, ET.ParseError) as e:
        logger.error(f"Failed to fetch nswdb.com: {e}")
        return {}

    capture_ids: dict[str, str] = {}

    for release in root.findall("release"):
        try:
            title_id_elem = release.find("titleid")
            name_elem = release.find("name")
            region_elem = release.find("region")

            if title_id_elem is None or name_elem is None:
                continue

            title_id = title_id_elem.text
            name = name_elem.text
            region = region_elem.text if region_elem is not None else ""

            if not title_id or not name:
                continue

            # Normalize region
            if region == "WLD":
                region = "EUR USA"

            capture_id = encrypt_title_id(title_id, key)
            sanitized_name = sanitize_game_name(name)

            if region:
                capture_ids[capture_id] = f"{sanitized_name} ({region})"
            else:
                capture_ids[capture_id] = sanitized_name

        except ValueError as e:
            logger.debug(f"Skipping release: {e}")
            continue

    logger.info(f"Found {len(capture_ids)} games from nswdb.com")
    return capture_ids


def fetch_titledb(key: bytes) -> dict[str, str]:
    """
    Fetch capture IDs from blawar's titledb (US.en.json).

    This is a large JSON file (~70MB) with detailed game info.
    Each entry has an 'id' field (Title ID) and 'name' field.

    Args:
        key: 16-byte AES encryption key

    Returns:
        Dict mapping Capture ID to game name
    """
    logger.info("Fetching from titledb (this may take a moment)...")

    try:
        import urllib.request

        # Download with progress indication
        req = urllib.request.Request(
            TITLEDB_URL,
            headers={"User-Agent": "nxshot-web/1.0"}
        )

        with urllib.request.urlopen(req, timeout=120) as response:
            # Read the entire response
            data = response.read()
            logger.info(f"Downloaded {len(data) / 1024 / 1024:.1f} MB")

        # Parse JSON
        import json
        titledb = json.loads(data)

    except Exception as e:
        logger.error(f"Failed to fetch titledb: {e}")
        return {}

    capture_ids: dict[str, str] = {}
    skipped = 0

    for nsu_id, entry in titledb.items():
        try:
            # Skip if no id or name
            title_id = entry.get("id")
            name = entry.get("name")

            if not title_id or not name:
                skipped += 1
                continue

            # Skip demos
            if entry.get("isDemo", False):
                continue

            # Validate title ID format (16 hex chars)
            if len(title_id) < 16 or not all(c in "0123456789ABCDEFabcdef" for c in title_id[:16]):
                skipped += 1
                continue

            capture_id = encrypt_title_id(title_id, key)
            sanitized_name = sanitize_game_name(name)

            # titledb is US.en, so we'll mark as USA
            capture_ids[capture_id] = f"{sanitized_name} (USA)"

        except (KeyError, ValueError, TypeError) as e:
            logger.debug(f"Skipping titledb entry {nsu_id}: {e}")
            skipped += 1
            continue

    logger.info(f"Found {len(capture_ids)} games from titledb (skipped {skipped} invalid entries)")
    return capture_ids


def load_existing() -> dict[str, str]:
    """Load existing captureIds.json if it exists."""
    if OUTPUT_PATH.exists():
        with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_capture_ids(capture_ids: dict[str, str], dry_run: bool = False) -> None:
    """
    Save capture IDs to JSON file.

    Args:
        capture_ids: Dict mapping Capture ID to game name
        dry_run: If True, only print stats without saving
    """
    # Sort by game name for easier diffing
    sorted_ids = dict(sorted(capture_ids.items(), key=lambda x: x[1].lower()))

    if dry_run:
        logger.info(f"[DRY RUN] Would save {len(sorted_ids)} capture IDs")
        return

    # Ensure output directory exists
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(sorted_ids, f, ensure_ascii=False, indent=4, sort_keys=False)

    logger.info(f"Saved {len(sorted_ids)} capture IDs to {OUTPUT_PATH}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Update Nintendo Switch capture IDs for nxshot-web"
    )
    parser.add_argument(
        "--source",
        choices=["switchbrew", "nswdb", "titledb", "all"],
        default="all",
        help="Data source to fetch from (default: all)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Don't write output file, just show stats"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging"
    )
    parser.add_argument(
        "--keep-existing",
        action="store_true",
        help="Merge with existing captureIds.json instead of replacing"
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Get encryption key from environment
    key = get_capture_id_key()

    capture_ids: dict[str, str] = {}

    # Optionally start with existing data
    if args.keep_existing:
        capture_ids = load_existing()
        logger.info(f"Loaded {len(capture_ids)} existing capture IDs")

    # Fetch from sources
    # Order matters: later sources override earlier ones for duplicate IDs
    # titledb has the most complete/accurate names, so we fetch it last
    if args.source in ("switchbrew", "all"):
        switchbrew_ids = fetch_switchbrew(key)
        capture_ids.update(switchbrew_ids)

    if args.source in ("nswdb", "all"):
        nswdb_ids = fetch_nswdb(key)
        capture_ids.update(nswdb_ids)

    if args.source in ("titledb", "all"):
        titledb_ids = fetch_titledb(key)
        capture_ids.update(titledb_ids)

    if not capture_ids:
        logger.error("No capture IDs found from any source")
        return 1

    # Save results
    save_capture_ids(capture_ids, dry_run=args.dry_run)

    return 0


if __name__ == "__main__":
    sys.exit(main())
