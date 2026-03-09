from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from PIL import Image
from PIL.ExifTags import TAGS


def get_exif_datetime(path: Path) -> datetime | None:
    """Return DateTimeOriginal or CreateDate from EXIF, if available."""
    try:
        img = Image.open(path)
        exif_data = img._getexif() or {}
    except Exception:
        return None

    # Build a tag-name -> value mapping
    tagged = {TAGS.get(tag, tag): value for tag, value in exif_data.items()}

    # Common datetime tags to try, in order of preference
    for key in ("DateTimeOriginal", "DateTimeDigitized", "DateTime"):
        value = tagged.get(key)
        if not value:
            continue
        try:
            # EXIF format: "YYYY:MM:DD HH:MM:SS"
            return datetime.strptime(str(value), "%Y:%m:%d %H:%M:%S")
        except Exception:
            continue

    return None


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    fulls_dir = root / "images" / "fulls"
    data_dir = root / "_data"
    data_dir.mkdir(exist_ok=True)
    output_path = data_dir / "photos.yml"

    items: list[dict[str, str]] = []

    for path in sorted(fulls_dir.glob("*")):
        if not path.is_file():
            continue

        exif_dt = get_exif_datetime(path)
        if exif_dt is None:
            # Fallback: file modification time
            exif_dt = datetime.fromtimestamp(path.stat().st_mtime)

        iso_date = exif_dt.isoformat()
        items.append({"file": path.name, "date": iso_date})

    # Sort by date ascending before writing
    items.sort(key=lambda x: x["date"])

    # Simple YAML-style output to avoid extra dependency
    lines = []
    for item in items:
        lines.append(f"- file: {item['file']}")
        lines.append(f"  date: {item['date']}")

    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {len(items)} entries to {output_path}")


if __name__ == "__main__":
    main()

