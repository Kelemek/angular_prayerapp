#!/usr/bin/env python3
"""Add wireGatedSupabaseMock() after Supabase test doubles that only define client."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC_ROOT = ROOT / "src"

IMPORT_LINE = "import { wireGatedSupabaseMock } from '{rel}testing/supabase-service-mock';"

ASSIGN_RE = re.compile(
    r"^(\s*)(?P<var>mock\w*[Ss]upabase\w*|supabaseService|supabase)\s*=\s*\{"
)


def import_path_for(spec: Path) -> str:
    depth = len(spec.relative_to(SPEC_ROOT / "app").parts) - 1
    return "../" * depth


def wire_assignments(text: str) -> tuple[str, bool]:
    lines = text.splitlines(keepends=True)
    out: list[str] = []
    changed = False
    i = 0
    while i < len(lines):
        line = lines[i]
        m = ASSIGN_RE.match(line.rstrip("\n"))
        if not m or "wireGatedSupabaseMock(" in line:
            out.append(line)
            i += 1
            continue
        if "client:" not in "".join(lines[i : i + 40]):
            out.append(line)
            i += 1
            continue

        indent = m.group(1)
        var = m.group("var")
        block = [line]
        depth = line.count("{") - line.count("}")
        j = i + 1
        while j < len(lines) and depth > 0:
            block.append(lines[j])
            depth += lines[j].count("{") - lines[j].count("}")
            j += 1
        block_text = "".join(block)
        if "client:" not in block_text:
            out.extend(block)
            i = j
            continue

        out.extend(block)
        next_line = lines[j] if j < len(lines) else ""
        wire_line = f"{indent}wireGatedSupabaseMock({var});\n"
        if wire_line.strip() not in next_line and f"wireGatedSupabaseMock({var})" not in text:
            out.append(wire_line)
            changed = True
        i = j
    return "".join(out), changed


def ensure_import(text: str, rel: str) -> tuple[str, bool]:
    if "wireGatedSupabaseMock" in text:
        return text, False
    import_line = IMPORT_LINE.format(rel=rel)
    if "from 'vitest'" in text:
        return text.replace(
            "from 'vitest';\n",
            f"from 'vitest';\n{import_line}\n",
            1,
        ), True
    if 'from "vitest"' in text:
        return text.replace(
            'from "vitest";\n',
            f'from "vitest";\n{import_line}\n',
            1,
        ), True
    return f"{import_line}\n{text}", True


def main() -> None:
    updated = 0
    for spec in SPEC_ROOT.rglob("*.spec.ts"):
        original = spec.read_text()
        if "client:" not in original:
            continue
        text, wired = wire_assignments(original)
        if wired:
            rel = import_path_for(spec)
            text, _ = ensure_import(text, rel)
        if text != original:
            spec.write_text(text)
            updated += 1
            print(spec.relative_to(ROOT))
    print(f"updated {updated} files")


if __name__ == "__main__":
    main()
