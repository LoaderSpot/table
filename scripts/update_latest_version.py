import json
import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
VERSIONS_PATH = REPO_ROOT / "table" / "versions.json"
LATEST_PATH = REPO_ROOT / "latest.json"
VERSION_PATTERN = re.compile(r"^\d+(?:\.\d+)*$")


def version_key(value: str) -> tuple[int, ...]:
    normalized = value.strip()
    if not VERSION_PATTERN.fullmatch(normalized):
        raise SystemExit(f"Unsupported version key format: {value!r}")

    parts = [int(part) for part in normalized.split(".")]
    while parts and parts[-1] == 0:
        parts.pop()

    return tuple(parts or [0])


def load_versions() -> dict:
    versions = json.loads(VERSIONS_PATH.read_text(encoding="utf-8"))
    if not isinstance(versions, dict) or not versions:
        raise SystemExit("table/versions.json must contain a non-empty JSON object")

    return versions


def build_latest_payload(versions: dict) -> tuple[str, dict]:
    latest_version = max(versions.keys(), key=version_key)
    latest_entry = versions[latest_version]
    if not isinstance(latest_entry, dict):
        raise SystemExit(f"Entry for {latest_version!r} must be a JSON object")

    return latest_version, {
        "version": latest_version,
        "fullversion": latest_entry.get("fullversion", ""),
        "data": latest_entry,
    }


def validate_output(output: dict, expected_version: str, expected_entry: dict) -> None:
    if not isinstance(output, dict):
        raise SystemExit("Generated latest.json must be a JSON object")
    if output["version"] != expected_version:
        raise SystemExit("Generated latest.json version does not match selected latest version")
    if output["fullversion"] != expected_entry.get("fullversion", ""):
        raise SystemExit("Generated latest.json fullversion does not match source data")
    if not isinstance(output["data"], dict):
        raise SystemExit("Generated latest.json data must be a JSON object")
    if output["data"] != expected_entry:
        raise SystemExit("Generated latest.json data does not match source entry")


def write_latest_json(output: dict, latest_version: str, latest_entry: dict) -> None:
    temp_path = LATEST_PATH.with_suffix(".json.tmp")
    serialized = json.dumps(output, ensure_ascii=False, separators=(",", ":"))
    temp_path.write_text(serialized, encoding="utf-8")

    parsed_output = json.loads(temp_path.read_text(encoding="utf-8"))
    validate_output(parsed_output, latest_version, latest_entry)
    temp_path.replace(LATEST_PATH)


def main() -> None:
    versions = load_versions()
    latest_version, output = build_latest_payload(versions)
    write_latest_json(output, latest_version, versions[latest_version])
    print(f"Updated latest.json -> {latest_version}")


if __name__ == "__main__":
    main()
