#!/usr/bin/env python3
"""Export courses_catalog.json to courses_data.json (build artifact)."""

import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CATALOG_PATH = os.path.join(SCRIPT_DIR, "courses_catalog.json")
OUT_PATH = os.path.join(SCRIPT_DIR, "courses_data.json")


def main():
    with open(CATALOG_PATH, encoding="utf-8") as handle:
        catalog = json.load(handle)

    with open(OUT_PATH, "w", encoding="utf-8") as handle:
        json.dump(catalog, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    courses = catalog.get("courses", [])
    print(f"Exported {len(courses)} courses to {OUT_PATH}")
    for course in courses:
        lectures = course.get("lectures", [])
        videos = sum(len(lecture.get("videos", [])) for lecture in lectures)
        track = f" [{course.get('track', '')}]" if course.get("track") else ""
        print(
            f"  [{course.get('level', '?')}]{track} {course.get('code', '')} - "
            f"{course.get('title', '')}: {len(lectures)} lectures, {videos} videos"
        )


if __name__ == "__main__":
    main()
