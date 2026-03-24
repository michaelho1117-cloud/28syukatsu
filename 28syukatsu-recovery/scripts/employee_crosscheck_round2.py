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

DB_PATH = Path(r"C:\Users\ADMIN\Desktop\graduate\data\shukatsu.db")
OUT_DIR = Path(r"C:\Users\ADMIN\Desktop\graduate\data\research")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


EMP_RE = re.compile(
    r"(?:従業員数|社員数|従業員)\s*[:：]?\s*(?:約)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{2,5})\s*(?:名|人)?"
)
OPENWORK_NOISE = re.compile(r"(回答者|クチコミ|評価|総合評価|OpenWork)", re.IGNORECASE)
GROUP_NOISE = re.compile(r"(連結|グループ|全体|世界|グローバル)", re.IGNORECASE)


@dataclass
class Hit:
    company_id: int
    company_name: str
    url: str
    source_kind: str
    count: int
    context: str
    confidence: str


def fetch_text(url: str) -> str:
    try:
        r = requests.get(url, headers=UA, timeout=10)
    except Exception:
        return ""
    if r.status_code != 200:
        return ""
    r.encoding = r.apparent_encoding or r.encoding
    soup = BeautifulSoup(r.text, "html.parser")
    return soup.get_text("\n", strip=True)


def search_urls(query: str, max_urls: int = 2) -> List[str]:
    # Avoid heavy engines to keep runtime stable.
    url = f"https://duckduckgo.com/html/?q={quote(query)}"
    try:
        r = requests.get(url, headers=UA, timeout=10)
    except Exception:
        return []
    if r.status_code != 200:
        return []
    soup = BeautifulSoup(r.text, "html.parser")
    out: List[str] = []
    for a in soup.select("a.result__a[href]"):
        href = (a.get("href") or "").strip()
        if href.startswith("http"):
            out.append(href)
        if len(out) >= max_urls:
            break
    return out


def classify_confidence(source_kind: str, context: str) -> str:
    if OPENWORK_NOISE.search(context):
        return "low"
    if source_kind in ("website", "recruit"):
        if GROUP_NOISE.search(context):
            return "medium"
        return "high"
    if source_kind == "search":
        if GROUP_NOISE.search(context):
            return "low"
        return "medium"
    return "low"


def extract_hits(company_id: int, company_name: str, text: str, url: str, source_kind: str) -> List[Hit]:
    hits: List[Hit] = []
    for ln in text.splitlines():
        line = ln.strip()
        if not line:
            continue
        m = EMP_RE.search(line)
        if not m:
            continue
        raw = m.group(1).replace(",", "")
        try:
            count = int(raw)
        except ValueError:
            continue
        conf = classify_confidence(source_kind, line)
        hits.append(
            Hit(
                company_id=company_id,
                company_name=company_name,
                url=url,
                source_kind=source_kind,
                count=count,
                context=line[:220],
                confidence=conf,
            )
        )
    return hits


def pick_best(hits: List[Hit]) -> Optional[Hit]:
    if not hits:
        return None
    conf_rank = {"high": 0, "medium": 1, "low": 2}
    # Prefer reliable confidence and realistic size for this dataset.
    return sorted(
        hits,
        key=lambda h: (
            conf_rank.get(h.confidence, 9),
            0 if 20 <= h.count <= 30000 else 1,
            abs(h.count - 1200),
        ),
    )[0]


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    rows = cur.execute(
        """
        SELECT id, name, website, recruit_url, openwork_url, employees
        FROM Company
        WHERE employees IS NULL OR employees = 0
        ORDER BY id
        """
    ).fetchall()

    review_rows = []
    updates: List[Tuple[int, int]] = []

    for row in rows:
        cid = row["id"]
        name = row["name"]
        candidates: List[Tuple[str, str]] = []

        for u, kind in (
            (row["website"], "website"),
            (row["recruit_url"], "recruit"),
        ):
            if isinstance(u, str) and u.startswith("http"):
                candidates.append((u, kind))

        # Search fallback.
        for u in search_urls(f"{name} 従業員数", max_urls=2):
            candidates.append((u, "search"))

        seen = set()
        hits: List[Hit] = []
        for u, kind in candidates:
            if u in seen:
                continue
            seen.add(u)
            text = fetch_text(u)
            if not text:
                continue
            hits.extend(extract_hits(cid, name, text, u, kind))

        best = pick_best(hits)
        suggested = best.count if best else None
        confidence = best.confidence if best else "low"
        evidence_url = best.url if best else ""
        evidence_context = best.context if best else ""

        # Auto-apply only high confidence.
        if best and best.confidence == "high" and 20 <= best.count <= 30000:
            updates.append((best.count, cid))

        review_rows.append(
            {
                "id": cid,
                "name": name,
                "suggested_employees": suggested or "",
                "confidence": confidence,
                "evidence_url": evidence_url,
                "evidence_context": evidence_context,
                "hit_count": len(hits),
            }
        )

    csv_path = OUT_DIR / "employee_crosscheck_round2_20260310.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "id",
                "name",
                "suggested_employees",
                "confidence",
                "evidence_url",
                "evidence_context",
                "hit_count",
            ],
        )
        writer.writeheader()
        writer.writerows(review_rows)

    if updates:
        cur.executemany("UPDATE Company SET employees = ? WHERE id = ?", updates)
        conn.commit()

    remain = cur.execute("SELECT COUNT(*) FROM Company WHERE employees IS NULL OR employees = 0").fetchone()[0]
    summary = {
        "checked": len(rows),
        "auto_updates_high_conf": len(updates),
        "remaining_unknown": remain,
        "csv": str(csv_path),
    }

    summary_path = OUT_DIR / "employee_crosscheck_round2_20260310_summary.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    conn.close()


if __name__ == "__main__":
    main()
