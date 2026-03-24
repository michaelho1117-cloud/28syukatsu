#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import json
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup

DB_PATH = Path("C:/Users/ADMIN/Desktop/graduate/data/shukatsu.db")
OUT_DIR = Path("C:/Users/ADMIN/Desktop/graduate/data/research")
HEADERS = {"User-Agent": "Mozilla/5.0"}


EMP_PATTERNS = [
    re.compile(r"(?:従業員数|社員数|職員数|従業員)\s*[:：]?\s*([0-9,]{2,7})\s*(?:名|人)"),
    re.compile(r"([0-9,]{2,7})\s*(?:名|人)\s*(?:の)?(?:従業員|社員|職員)"),
]

GROUP_WORDS = ["連結", "グループ", "国内外", "全体", "世界", "グローバル"]


@dataclass
class Evidence:
    url: str
    count: int
    context: str
    is_group_like: bool
    source_kind: str


def to_band(count: int) -> str:
    if count < 100:
        return "1-99"
    if count < 500:
        return "100-499"
    if count < 2000:
        return "500-1999"
    return "2000+"


def parse_current_band(employees: Optional[int]) -> str:
    if employees is None:
        return "unknown"
    return to_band(int(employees))


def fetch_text(url: str) -> str:
    try:
        r = requests.get(url, headers=HEADERS, timeout=12)
    except Exception:
        return ""
    if r.status_code != 200:
        return ""
    r.encoding = r.apparent_encoding or r.encoding
    soup = BeautifulSoup(r.text, "html.parser")
    return soup.get_text("\n", strip=True)


def find_evidence_in_text(text: str, url: str, source_kind: str) -> List[Evidence]:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    hits: List[Evidence] = []
    for ln in lines:
        for p in EMP_PATTERNS:
            m = p.search(ln)
            if not m:
                continue
            raw = m.group(1).replace(",", "")
            try:
                cnt = int(raw)
            except ValueError:
                continue
            is_group = any(w in ln for w in GROUP_WORDS)
            hits.append(Evidence(url=url, count=cnt, context=ln[:160], is_group_like=is_group, source_kind=source_kind))
    return hits


def ddg_search_urls(query: str, max_urls: int = 2) -> List[str]:
    url = f"https://duckduckgo.com/html/?q={quote(query)}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
    except Exception:
        return []
    if r.status_code != 200:
        return []
    soup = BeautifulSoup(r.text, "html.parser")
    urls = []
    for a in soup.select("a.result__a[href]"):
        h = a.get("href", "").strip()
        if h.startswith("http"):
            urls.append(h)
        if len(urls) >= max_urls:
            break
    return urls


def pick_best(evidences: List[Evidence]) -> Tuple[Optional[Evidence], str]:
    if not evidences:
        return None, "low"
    sorted_hits = sorted(
        evidences,
        key=lambda e: (
            0 if (not e.is_group_like and e.source_kind in ("official", "recruit")) else 1,
            0 if (not e.is_group_like) else 1,
            0 if e.source_kind in ("official", "recruit") else 1,
            abs(e.count - 1000),
        ),
    )
    best = sorted_hits[0]
    if (not best.is_group_like) and best.source_kind in ("official", "recruit"):
        conf = "high"
    elif not best.is_group_like:
        conf = "medium"
    else:
        conf = "low"
    return best, conf


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    all_rows = cur.execute(
        """
        SELECT id, name, employees, website, recruit_url, openwork_url
        FROM Company
        ORDER BY name
        """
    ).fetchall()

    # Prioritize records with unknown employee size first (faster and higher value).
    unknown_rows = [r for r in all_rows if r[2] is None]
    known_rows = [r for r in all_rows if r[2] is not None]
    rows = unknown_rows + known_rows[:20]

    review_rows = []
    changed = 0

    for cid, name, employees, website, recruit_url, openwork_url in rows:
        current_band = parse_current_band(employees)
        urls: List[Tuple[str, str]] = []
        for u, kind in ((website, "official"), (recruit_url, "recruit"), (openwork_url, "openwork")):
            if isinstance(u, str) and u.startswith("http"):
                urls.append((u, kind))

        # External search is intentionally skipped in this fast pass to keep runtime stable.

        seen = set()
        all_evidence: List[Evidence] = []
        for u, kind in urls:
            if u in seen:
                continue
            seen.add(u)
            txt = fetch_text(u)
            if not txt:
                continue
            all_evidence.extend(find_evidence_in_text(txt, u, kind))

        best, conf = pick_best(all_evidence)
        suggested_band = current_band
        suggested_count = ""
        evidence_url = ""
        evidence_context = ""

        if best is not None:
            suggested_band = to_band(best.count)
            suggested_count = best.count
            evidence_url = best.url
            evidence_context = best.context

        needs_update = suggested_band != current_band and conf in ("high", "medium")
        if needs_update:
            changed += 1

        review_rows.append(
            {
                "id": cid,
                "name": name,
                "current_band": current_band,
                "suggested_band": suggested_band,
                "suggested_count": suggested_count,
                "confidence": conf,
                "needs_update": 1 if needs_update else 0,
                "evidence_url": evidence_url,
                "evidence_context": evidence_context,
            }
        )

    csv_path = OUT_DIR / "employee_band_crosscheck_20260310.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(
            f,
            fieldnames=[
                "id",
                "name",
                "current_band",
                "suggested_band",
                "suggested_count",
                "confidence",
                "needs_update",
                "evidence_url",
                "evidence_context",
            ],
        )
        w.writeheader()
        w.writerows(review_rows)

    summary = {
        "total": len(review_rows),
        "suggested_updates": changed,
        "high_conf_updates": sum(1 for r in review_rows if r["needs_update"] == 1 and r["confidence"] == "high"),
        "medium_conf_updates": sum(1 for r in review_rows if r["needs_update"] == 1 and r["confidence"] == "medium"),
        "csv": str(csv_path),
    }
    json_path = OUT_DIR / "employee_band_crosscheck_20260310_summary.json"
    json_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
