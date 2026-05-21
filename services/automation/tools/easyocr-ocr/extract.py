#!/usr/bin/env python3
"""
EasyOCR text extraction for manga/manhwa pages.
Reads JSON from stdin: {"images": ["path1", ...], "languages": ["ko", "en"]}
Writes JSON to stdout: {"results": [{"page": 1, "text": "..."}, ...]}

Install: pip install easyocr
"""

import sys
import json
import os


def extract_text(image_paths: list, languages: list) -> list:
    import easyocr  # deferred import so startup errors surface cleanly

    reader = easyocr.Reader(languages, gpu=False)
    results = []

    for i, img_path in enumerate(image_paths):
        page = i + 1
        if not os.path.exists(img_path):
            results.append({"page": page, "text": "(no text)", "error": "file not found"})
            continue
        try:
            detections = reader.readtext(img_path, detail=1)
            # Keep only detections with confidence >= 0.3
            lines = [det[1] for det in detections if det[2] >= 0.3]
            text = "\n".join(lines).strip() or "(no text)"
            results.append({"page": page, "text": text})
        except Exception as e:
            results.append({"page": page, "text": "(no text)", "error": str(e)})

    return results


if __name__ == "__main__":
    try:
        raw = sys.stdin.read().strip()
        if not raw:
            print(json.dumps({"error": "No input received"}))
            sys.exit(1)

        data = json.loads(raw)
        images = data.get("images", [])
        languages = data.get("languages", ["ko", "en"])

        if not images:
            print(json.dumps({"results": []}))
            sys.exit(0)

        results = extract_text(images, languages)
        print(json.dumps({"results": results}))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
