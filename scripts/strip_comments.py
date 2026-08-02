from __future__ import annotations

import io
import os
import re
import subprocess
import sys
import tokenize
from pathlib import Path

SKIP_DIRS = {"node_modules", ".git", ".expo", "__pycache__", ".venv", "dist", "build", ".next", "out", ".claude", ".vscode"}
TARGET_EXTS = {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".html", ".htm", ".css", ".scss", ".sh", ".bash", ".zsh"}
KEEP_FILES = {"LICENSE", "LICENSE.md", "LICENSE.txt", "NOTICE", "NOTICE.md",
              "package.json", "package-lock.json", "tsconfig.json",
              "app.json", "firebase.json", ".firebaserc", "babel.config.js",
              ".env", ".env.example", ".gitignore"}

TEMPLATE_LITERAL_REENTRY = {"<!doctype", "<html", "<script", "<style", "<!--"}


def should_strip(p: Path, root: Path) -> bool:
    if any(part in SKIP_DIRS for part in p.parts):
        return False
    if p.name in KEEP_FILES:
        return False
    if p.suffix.lower() not in TARGET_EXTS:
        return False
    return True


def strip_python(src: str) -> str | None:
    try:
        toks = list(tokenize.generate_tokens(io.StringIO(src).readline))
    except (tokenize.TokenizeError, IndentationError):
        return src
    try:
        to_compile = tokenize.untokenize([t for t in toks if t.type != tokenize.COMMENT])
        out = compile_check(to_compile, mode="exec")
        if out is None:
            return None
        return out
    except (tokenize.TokenizeError, IndentationError):
        return None


def compile_check(src: str, mode: str = "exec") -> str | None:
    try:
        compile(src, "<strip>", mode)
    except (SyntaxError, ValueError):
        return None
    return src


def _find_strip_js_helper() -> str | None:
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        cand = parent / "scripts" / "strip-js.js"
        if cand.exists():
            return str(cand)
    return None


def strip_with_terser(js_source: str) -> str | None:
    helper = _find_strip_js_helper()
    if helper is None:
        return None
    try:
        result = subprocess.run(
            ["node", helper],
            input=js_source,
            capture_output=True,
            text=True,
            check=False,
            timeout=30,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return None
    if result.returncode != 0:
        return None
    out = result.stdout
    if not out.strip():
        return None
    return out + "\n"


def strip_template_literal_comments(src: str) -> str:
    lower = src.lower()
    if "<!doctype" not in lower and "<html" not in lower and "<script" not in lower and "<!--" not in lower and "<style" not in lower:
        return src
    src = re.sub(r"<!--[\s\S]*?-->", "\n", src)
    src = strip_script_style_blocks(src)
    return src


def strip_js_inline(src: str) -> str:
    out: list[str] = []
    i = 0
    n = len(src)
    in_dq = False
    in_sq = False
    in_bt = False
    while i < n:
        c = src[i]
        if in_dq:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(src[i + 1])
                i += 2
                continue
            if c == '"':
                in_dq = False
            i += 1
            continue
        if in_sq:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(src[i + 1])
                i += 2
                continue
            if c == "'":
                in_sq = False
            i += 1
            continue
        if in_bt:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(src[i + 1])
                i += 2
                continue
            if c == "`":
                in_bt = False
            i += 1
            continue
        if c == '"':
            in_dq = True
            out.append(c)
            i += 1
            continue
        if c == "'":
            in_sq = True
            out.append(c)
            i += 1
            continue
        if c == "`":
            in_bt = True
            out.append(c)
            i += 1
            continue
        if c == "/" and i + 1 < n and src[i + 1] == "/":
            j = i
            while j < n and src[j] != "\n":
                j += 1
            if j < n and src[j] == "\n":
                out.append("\n")
                i = j + 1
            else:
                i = j
            continue
        if c == "/" and i + 1 < n and src[i + 1] == "*":
            j = i + 2
            while j < n and (j + 1 >= n or not (src[j] == "*" and src[j + 1] == "/")):
                j += 1
            if j >= n or j + 1 >= n:
                i = n
            else:
                tail = src[j + 2:]
                out.append(" ")
                if tail.startswith("\n"):
                    out.append("\n")
                    i = j + 3
                else:
                    i = j + 2
            continue
        out.append(c)
        i += 1
    return "".join(out)


def strip_script_style_blocks(src: str) -> str:
    def script_repl(m: re.Match) -> str:
        inner = m.group(1)
        tag_open = m.group(0)[: m.start(1) - m.start(0)].split(">", 1)[0] + ">"
        cleaned = strip_js_inline(inner)
        return tag_open + cleaned + "</script>"
    src = re.sub(r"<script\b[^>]*>([\s\S]*?)</script>", script_repl, src, flags=re.IGNORECASE)

    def style_repl(m: re.Match) -> str:
        inside = strip_css(m.group(1))
        tag_open = m.group(0)[: m.start(1) - m.start(0)].split(">", 1)[0] + ">"
        return tag_open + inside + "</style>"
    src = re.sub(r"<style\b[^>]*>([\s\S]*?)</style>", style_repl, src, flags=re.IGNORECASE)
    return src


def strip_html(src: str) -> str:
    src = re.sub(r"<!--[\s\S]*?-->", "\n", src)
    return strip_script_style_blocks(src)


def strip_css(src: str) -> str:
    out: list[str] = []
    i = 0
    n = len(src)
    in_str: str | None = None
    while i < n:
        c = src[i]
        if in_str is not None:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(src[i + 1])
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c == "'" or c == '"':
            in_str = c
            out.append(c)
            i += 1
            continue
        if c == "/" and i + 1 < n and src[i + 1] == "*":
            j = i + 2
            while j < n - 1 and not (src[j] == "*" and src[j + 1] == "/"):
                j += 1
            i = j + 2 if j + 2 <= n else n
            continue
        out.append(c)
        i += 1
    return "".join(out)


def strip_shell(src: str) -> str:
    out_lines: list[str] = []
    lines = src.splitlines(keepends=True)
    for idx, line in enumerate(lines):
        if idx == 0 and line.startswith("#!"):
            out_lines.append(line)
            continue
        stripped = line
        if stripped.lstrip().startswith("#"):
            stripped = "\n" if line.endswith("\n") else ""
        else:
            m = re.search(r"(\s)#", stripped)
            if m is not None:
                before = stripped[: m.start(1)]
                nl = "\n" if line.endswith("\n") else ""
                stripped = before.rstrip() + nl
        out_lines.append(stripped)
    return "".join(out_lines)


def process(path: Path, root: Path) -> None:
    rel = path.relative_to(root)
    src = path.read_text(encoding="utf-8")
    ext = path.suffix.lower()
    stripped: str | None = None
    if ext == ".py":
        stripped = strip_python(src)
    elif ext in {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}:
        js_source = path.read_text(encoding="utf-8")
        if js_source is not None:
            stripped = strip_with_terser(js_source)
            if stripped is not None and len(stripped) < len(js_source) * 0.3:
                stripped = None
            if stripped is None:
                stripped = strip_js_inline(js_source)
            if stripped is not None:
                stripped = strip_template_literal_comments(stripped)
    elif ext in {".html", ".htm"}:
        stripped = strip_html(src)
    elif ext in {".css", ".scss"}:
        stripped = strip_css(src)
    elif ext in {".sh", ".bash", ".zsh"}:
        stripped = strip_shell(src)
    if stripped is None or stripped == src:
        return
    path.write_text(stripped, encoding="utf-8")
    print(f"stripped: {rel}  ({len(src) - len(stripped)} bytes removed)")


def main(argv: list[str]) -> int:
    root = Path(argv[1] if len(argv) > 1 else ".").resolve()
    targets: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            p = Path(dirpath) / fn
            if should_strip(p, root):
                targets.append(p)
    targets.sort()
    for p in targets:
        process(p, root)
    print(f"\nprocessed {len(targets)} files under {root}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
