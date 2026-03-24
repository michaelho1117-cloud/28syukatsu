#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3
from pathlib import Path


DB_PATH = Path("C:/Users/ADMIN/Desktop/graduate/data/shukatsu.db")


NOISE_EXACT = {
    "3000を超える実績・事例 ※1 と豊富なノウハウによるコンサルティングが強み",
    "AIコンサルタント",
    "BPRコンサルタント",
    "C3(シーキューブ)飲食店経営・飲食コンサル・不動産賃貸売買事業",
    "DXコンサルタント",
    "ERPコンサルタント",
    "ITコンサルタント",
    "FAS (DTFA・KPMG FAS・EYなど)",
    "M&Aコンサル/アドバイザリー",
    "M&Aフィナンシャルアドバイザリーや事業再生など、専門性の高いサービスを提供",
}

FOREIGN_MARKERS = [
    "McKinsey", "BCG", "Bain", "Kearney", "Deloitte", "PwC", "KPMG", "Accenture", "EY",
    "IBM", "Capgemini", "Aon", "Protiviti", "Kroll", "Mercer", "WTW", "Gartner", "TCS",
    "Oliver Wyman", "Roland Berger", "AlixPartners", "Alvarez", "Houlihan", "LEK", "L.E.K",
]


def infer_origin(name: str) -> str:
    return "外资" if any(m in name for m in FOREIGN_MARKERS) else "日企"


def infer_category(name: str) -> str:
    n = name
    if any(x in n for x in ["FAS", "アドバイザリー", "M&A", "ディール", "再生", "フーリハン", "Kroll", "Alix", "Alvarez"]):
        return "FA"
    if any(x in n for x in ["人事", "組織", "マーサー", "コーン・フェリー", "WTW", "リンクアンドモチベーション", "リクルートマネジメント"]):
        return "人力组织"
    if any(x in n for x in ["IT", "デジタル", "テクノロジ", "シンプレクス", "INTLOOP", "Dirbato", "フォーティエンス", "日立コンサルティング", "SAP", "ガートナー"]):
        return "IT咨询"
    if any(x in n for x in ["戦略", "マッキンゼー", "BCG", "ベイン", "Kearney", "ローランド・ベルガー", "オリバー・ワイマン", "L.E.K", "アーサー・ディ・リトル"]):
        return "战略"
    if any(x in n for x in ["研究所", "リサーチ", "シンクタンク"]):
        return "其他"
    return "综合"


def merge_name(cur, src: str, dst: str):
    src_row = cur.execute("SELECT id FROM Company WHERE name = ?", (src,)).fetchone()
    if not src_row:
        return
    dst_row = cur.execute("SELECT id FROM Company WHERE name = ?", (dst,)).fetchone()
    if dst_row:
        cur.execute("DELETE FROM Company WHERE id = ?", (src_row[0],))
    else:
        cur.execute("UPDATE Company SET name = ? WHERE id = ?", (dst, src_row[0]))


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1) remove obvious noise
    for n in NOISE_EXACT:
        cur.execute("DELETE FROM Company WHERE name = ?", (n,))

    # 2) merge old/variant labels
    merge_name(cur, "(旧)みずほ総合研究所", "みずほリサーチ&テクノロジーズ")
    merge_name(cur, "EY ストラテジー・アンド・コンサルティング", "EYストラテジー・アンド・コンサルティング")
    merge_name(cur, "EY ストラテジー・アンド・コンサルティング(EY Japan)", "EYストラテジー・アンド・コンサルティング")
    merge_name(cur, "G-FAS株式会社(旧GCA FAS株式会社)", "G-FAS")

    # 3) repopulate origin/category heuristically
    rows = cur.execute("SELECT id, name FROM Company").fetchall()
    for rid, name in rows:
        origin = infer_origin(name or "")
        category = infer_category(name or "")
        cur.execute("UPDATE Company SET origin_type = ?, category = ? WHERE id = ?", (origin, category, rid))

    conn.commit()

    total = cur.execute("SELECT COUNT(*) FROM Company").fetchone()[0]
    score = cur.execute("SELECT COUNT(*) FROM Company WHERE openwork_score IS NOT NULL").fetchone()[0]
    print({"ok": True, "total": total, "with_openwork_score": score})


if __name__ == "__main__":
    main()
