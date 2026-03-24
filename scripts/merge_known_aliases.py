#!/usr/bin/env python3

import sqlite3
from pathlib import Path


DB_PATH = Path("C:/Users/ADMIN/Desktop/graduate/data/shukatsu.db")


def split_aliases(s):
    if not s:
        return []
    return [x.strip() for x in str(s).split("|") if x.strip()]


def row_score(row):
    # Prefer richer canonical row as merge destination.
    _, _, canonical_en, aliases, _, openwork_score, _, _, notes, _, _, _, openwork_url, _, recruit_url, _, _, _, salary, sample, *_ = row
    score = 0
    if canonical_en:
        score += 4
    if openwork_url:
        score += 3
    if openwork_score is not None:
        score += 2
    if recruit_url:
        score += 1
    if salary is not None:
        score += 1
    if sample is not None:
        score += 1
    if aliases:
        score += 1
    if notes:
        score += 1
    return score


def merge_rows(conn, src_id, dst_id):
    cur = conn.cursor()
    src = cur.execute("SELECT * FROM Company WHERE id = ?", (src_id,)).fetchone()
    dst = cur.execute("SELECT * FROM Company WHERE id = ?", (dst_id,)).fetchone()
    if not src or not dst:
        return

    src_name = src[1]
    src_aliases = split_aliases(src[21] if len(src) > 21 else "")
    dst_aliases = split_aliases(dst[21] if len(dst) > 21 else "")

    merged_aliases = []
    for a in dst_aliases + [src_name] + src_aliases:
        if a and a != dst[1] and a not in merged_aliases:
            merged_aliases.append(a)

    cur.execute("UPDATE Company SET aliases = ? WHERE id = ?", ("|".join(merged_aliases), dst_id))
    cur.execute("DELETE FROM Company WHERE id = ?", (src_id,))


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    rows = cur.execute("SELECT * FROM Company").fetchall()

    # --- Kearney merge ---
    k_candidates = [r for r in rows if ("kearney" in (r[1] or "").lower()) or ((r[20] or "").lower() == "kearney")]
    if len(k_candidates) > 1:
        k_dst = sorted(k_candidates, key=row_score, reverse=True)[0]
        for r in k_candidates:
            if r[0] != k_dst[0]:
                merge_rows(conn, r[0], k_dst[0])

    # --- BCG merge ---
    rows = cur.execute("SELECT * FROM Company").fetchall()
    bcg_candidates = []
    for r in rows:
        name = (r[1] or "").lower()
        canonical_en = (r[20] or "").lower()
        aliases = (r[21] or "").lower()
        if ("bcg" in name) or ("boston consulting group" in canonical_en) or ("bcg" in aliases):
            bcg_candidates.append(r)

    if len(bcg_candidates) > 1:
        b_dst = sorted(bcg_candidates, key=row_score, reverse=True)[0]
        for r in bcg_candidates:
            if r[0] != b_dst[0]:
                merge_rows(conn, r[0], b_dst[0])

    conn.commit()

    total = cur.execute("SELECT COUNT(*) FROM Company").fetchone()[0]
    k_rows = cur.execute("SELECT id, name, canonical_name_en, aliases FROM Company WHERE lower(name) LIKE '%kearney%' OR lower(IFNULL(canonical_name_en,''))='kearney'").fetchall()
    b_rows = cur.execute("SELECT id, name, canonical_name_en, aliases FROM Company WHERE lower(name) LIKE '%bcg%' OR lower(IFNULL(canonical_name_en,'')) LIKE '%boston consulting group%' OR lower(IFNULL(aliases,'')) LIKE '%bcg%'").fetchall()

    print({"ok": True, "total": total, "kearney_rows": k_rows, "bcg_rows": b_rows})


if __name__ == "__main__":
    main()
