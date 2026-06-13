#!/usr/bin/env python3
"""Merge course JSON sources into courses_catalog.json and embed into courseData.js."""

import argparse
import json
import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_FINAL = os.path.join(SCRIPT_DIR, "sources", "Final_Courses.json")
DEFAULT_ADVANCED = os.path.join(SCRIPT_DIR, "sources", "4_5859229114308762572.json")
CATALOG_PATH = os.path.join(SCRIPT_DIR, "courses_catalog.json")
COURSE_DATA_PATH = os.path.join(SCRIPT_DIR, "courseData.js")
CATALOG_BEGIN = "/* COURSE_CATALOG_BEGIN */"
CATALOG_END = "/* COURSE_CATALOG_END */"


def load_courses(path):
    with open(path, encoding="utf-8") as handle:
        payload = json.load(handle)
    courses = payload.get("courses", payload if isinstance(payload, list) else [])
    if not isinstance(courses, list):
        raise ValueError(f"Expected courses array in {path}")
    return courses


def merge_catalog(final_path, advanced_path):
    final_courses = load_courses(final_path)
    advanced_courses = load_courses(advanced_path)
    merged = {"courses": final_courses + advanced_courses}
    return merged


def write_catalog(catalog):
    with open(CATALOG_PATH, "w", encoding="utf-8") as handle:
        json.dump(catalog, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def embed_catalog_in_course_data(catalog):
    if not os.path.exists(COURSE_DATA_PATH):
        print(f"Skipping embed: {COURSE_DATA_PATH} not found")
        return

    with open(COURSE_DATA_PATH, encoding="utf-8") as handle:
        content = handle.read()

    catalog_js = json.dumps(catalog, ensure_ascii=False, separators=(",", ":"))
    replacement = f"{CATALOG_BEGIN}\n  const COURSE_CATALOG = {catalog_js};\n  {CATALOG_END}"

    pattern = re.compile(
        re.escape(CATALOG_BEGIN) + r".*?" + re.escape(CATALOG_END),
        re.DOTALL,
    )
    if not pattern.search(content):
        raise RuntimeError(
            f"Could not find catalog markers in {COURSE_DATA_PATH}. "
            f"Add {CATALOG_BEGIN} and {CATALOG_END} first."
        )

    updated = pattern.sub(replacement, content, count=1)
    with open(COURSE_DATA_PATH, "w", encoding="utf-8") as handle:
        handle.write(updated)


def summarize(catalog):
    levels = {}
    for course in catalog["courses"]:
        level = course.get("level", "Unknown")
        levels[level] = levels.get(level, 0) + 1
    print(f"Wrote {CATALOG_PATH} ({len(catalog['courses'])} courses)")
    for level in ("Beginner", "Intermediate", "Advanced", "Expert"):
        if level in levels:
            print(f"  {level}: {levels[level]}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--final", default=DEFAULT_FINAL)
    parser.add_argument("--advanced", default=DEFAULT_ADVANCED)
    parser.add_argument("--no-embed", action="store_true")
    args = parser.parse_args()

    catalog = merge_catalog(args.final, args.advanced)
    write_catalog(catalog)
    summarize(catalog)

    if not args.no_embed:
        embed_catalog_in_course_data(catalog)
        print(f"Embedded catalog into {COURSE_DATA_PATH}")


if __name__ == "__main__":
    main()
