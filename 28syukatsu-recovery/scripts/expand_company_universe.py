#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import json
import re
from pathlib import Path

import requests
import sqlite3


API_BASE = "http://127.0.0.1:8789/api/core"
DB_PATH = Path("C:/Users/ADMIN/Desktop/graduate/data/shukatsu.db")
QUEUE_CSV = Path("C:/Users/ADMIN/Desktop/graduate/data/research/seed_candidate_queue_20260309.csv")
OUT_CSV = Path("C:/Users/ADMIN/Desktop/graduate/data/imports/consulting_seed_expansion_20260309.csv")
TARGET_TOTAL = 100


GENERIC_BLOCK = [
    "転職",
    "エージェント",
    "ランキング",
    "一覧",
    "おすすめ",
    "向いている",
    "向いてる",
    "コンサル会社",
    "コンサルティング会社",
    "ファーム",
    "職",
    "選考",
    "セミナー",
    "イベント",
    "求人",
    "公式サイトを見てみる",
]


def normalize_name(name: str) -> str:
    x = (name or "").strip()
    x = x.replace("（", "(").replace("）", ")").replace("／", "/")
    x = re.sub(r"^\d+[\.．\)]\s*", "", x)
    for prefix in ["株式会社 ", "合同会社 ", "有限会社 "]:
        if x.startswith(prefix):
            x = x[len(prefix) :]
    for suffix in ["株式会社", "合同会社", "有限会社"]:
        if x.endswith(suffix):
            x = x[: -len(suffix)]
    x = re.sub(r"\s+", " ", x).strip(" ・")
    return x


def looks_generic(name: str) -> bool:
    if not name:
        return True
    if name.lower().startswith("http"):
        return True
    if any(w in name for w in GENERIC_BLOCK):
        return True
    if len(name) < 2 or len(name) > 45:
        return True
    return False


def looks_consulting_entity(name: str) -> bool:
    tokens = ["コンサル", "アドバイザリー", "研究所", "リサーチ", "FAS", "パートナーズ", "Partners"]
    brand = [
        "McKinsey", "BCG", "Bain", "Kearney", "Deloitte", "PwC", "KPMG", "Accenture", "EY",
        "IBM", "Capgemini", "Aon", "Protiviti", "Kroll", "Mercer", "WTW", "Gartner", "TCS",
        "ローランド・ベルガー", "オリバー・ワイマン", "アーサー・ディ・リトル", "マッキンゼー",
        "ベイカレント", "ノースサンド", "シグマクシス", "Ridgelinez", "Dirbato", "INTLOOP",
    ]
    return any(t in name for t in tokens) or any(b in name for b in brand)


def infer_origin(name: str) -> str:
    foreign_markers = [
        "McKinsey", "BCG", "Bain", "Kearney", "Deloitte", "PwC", "KPMG", "Accenture", "EY",
        "IBM", "Capgemini", "Aon", "Protiviti", "Kroll", "Mercer", "WTW", "Gartner", "TCS",
        "Oliver Wyman", "Roland Berger", "AlixPartners", "Alvarez", "Houlihan"
    ]
    return "外资" if any(m in name for m in foreign_markers) else "日企"


def infer_category(name: str) -> str:
    n = name
    if any(x in n for x in ["FAS", "アドバイザリー", "M&A", "ディール", "再生", "Kroll", "フーリハン"]):
        return "FA"
    if any(x in n for x in ["人事", "組織", "マーサー", "コーン・フェリー", "WTW", "リンクアンドモチベーション", "リクルートマネジメント"]):
        return "人力组织"
    if any(x in n for x in ["IT", "デジタル", "テクノロジ", "シンプレクス", "INTLOOP", "Dirbato", "フォーティエンス", "日立コンサルティング"]):
        return "IT咨询"
    if any(x in n for x in ["戦略", "マッキンゼー", "BCG", "ベイン", "Kearney", "ローランド・ベルガー", "オリバー・ワイマン", "L.E.K"]):
        return "战略"
    if any(x in n for x in ["研究所", "リサーチ"]):
        return "其他"
    return "综合"


def build_import_payload(candidates):
    rows = []
    for c in candidates:
        rows.append({
            "canonical_name_ja": c["name"],
            "canonical_name_en": "",
            "aliases": c["aliases"],
            "origin_type": infer_origin(c["name"]),
            "category": infer_category(c["name"]),
            "main_services": "",
            "japan_website": "",
            "recruit_url": "",
            "employee_band": "unknown",
            "source_urls": c["source_urls"],
            "confidence": "medium" if c["source_count"] >= 2 else "low",
            "notes": "seed抽出（要官网核验）",
        })
    return rows


def to_csv_text(rows):
    headers = [
        "canonical_name_ja",
        "canonical_name_en",
        "aliases",
        "origin_type",
        "category",
        "main_services",
        "japan_website",
        "recruit_url",
        "employee_band",
        "source_urls",
        "confidence",
        "notes",
    ]
    lines = [",".join(headers)]
    for r in rows:
        vals = [str(r.get(h, "") or "") for h in headers]
        escaped = []
        for v in vals:
            if "," in v or "\"" in v or "\n" in v:
                v = "\"" + v.replace("\"", "\"\"") + "\""
            escaped.append(v)
        lines.append(",".join(escaped))
    return "\n".join(lines)


def main():
    if not QUEUE_CSV.exists():
        raise SystemExit(f"Queue CSV not found: {QUEUE_CSV}")

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    existing_names = {normalize_name(r[0]) for r in cur.execute("SELECT name FROM Company").fetchall()}
    existing_count = cur.execute("SELECT COUNT(*) FROM Company").fetchone()[0]

    needed = max(0, TARGET_TOTAL - existing_count)
    if needed == 0:
        print(json.dumps({"ok": True, "message": "already reached target", "existing_count": existing_count}, ensure_ascii=False))
        return

    queue = []
    with QUEUE_CSV.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_name = row["canonical_candidate"].strip()
            name = normalize_name(raw_name)
            if looks_generic(name):
                continue
            if not looks_consulting_entity(name):
                continue
            if name in existing_names:
                continue
            queue.append({
                "name": name,
                "aliases": row.get("aliases", raw_name),
                "source_count": int(row.get("source_count", "1") or 1),
                "source_urls": row.get("source_urls", ""),
            })

    # unique by normalized name
    uniq = {}
    for q in sorted(queue, key=lambda x: (-x["source_count"], x["name"])):
        uniq.setdefault(q["name"], q)

    picked = list(uniq.values())[:needed]
    payload_rows = build_import_payload(picked)
    csv_text = to_csv_text(payload_rows)

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    OUT_CSV.write_text(csv_text, encoding="utf-8")

    # Import
    res = requests.post(f"{API_BASE}/companies/import-canonical-csv", json={"csv_text": csv_text}, timeout=120)
    res.raise_for_status()
    import_data = res.json()

    # New IDs for enrichment (by names)
    qmarks = ",".join("?" for _ in picked) if picked else ""
    new_ids = []
    if qmarks:
        ids = cur.execute(f"SELECT id FROM Company WHERE name IN ({qmarks})", [p["name"] for p in picked]).fetchall()
        new_ids = [r[0] for r in ids]

    enrich_data = {"ok": True, "total": 0, "success": 0}
    if new_ids:
        eres = requests.post(
            f"{API_BASE}/companies/enrich-openwork",
            json={"company_ids": new_ids, "limit": len(new_ids)},
            timeout=180,
        )
        eres.raise_for_status()
        enrich_data = eres.json()

    final_count = cur.execute("SELECT COUNT(*) FROM Company").fetchone()[0]
    print(
        json.dumps(
            {
                "ok": True,
                "existing_before": existing_count,
                "needed": needed,
                "picked": len(picked),
                "import": import_data,
                "enrich": {"total": enrich_data.get("total"), "success": enrich_data.get("success")},
                "final_count": final_count,
                "out_csv": str(OUT_CSV),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
