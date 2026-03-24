#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import re
from collections import defaultdict
from pathlib import Path

import requests
from bs4 import BeautifulSoup


HEADERS = {"User-Agent": "Mozilla/5.0"}

MOVIN_URLS = [
    "https://www.movin.co.jp/gyoukai/firmlist/bigfirm.html",
    "https://www.movin.co.jp/gyoukai/firmlist/strategy.html",
    "https://www.movin.co.jp/gyoukai/firmlist/general.html",
    "https://www.movin.co.jp/gyoukai/firmlist/business_it.html",
    "https://www.movin.co.jp/gyoukai/firmlist/financial.html",
]

SEED_URLS = [
    "https://freeconsul.co.jp/cs/consultingfirm/",
    "https://consulfree.com/blog/consultingfirm/",
    *MOVIN_URLS,
    "https://www.onecareer.jp/companies/business_categories/1",
    "https://www.onecareer.jp/companies/business_categories/1/1",
    "https://www.onecareer.jp/companies/business_categories/1/2",
]

ONECAREER_PAGES = [
    f"https://www.onecareer.jp/companies/business_categories/1?page={i}"
    for i in range(1, 16)
]

STOPWORDS = [
    "選考",
    "募集なし",
    "NO IMAGE",
    "監査法人",
    "税理士法人",
    "法律事務所",
    "スタッフ",
    "ランキング",
    "一覧",
    "カテゴリ",
    "求人",
    "セミナー",
    "イベント",
    "エントリー",
    "公式サイトを見てみる",
]

CONSULTING_TOKENS = [
    "コンサル",
    "アドバイザリー",
    "研究所",
    "リサーチ",
    "FAS",
    "シンクタンク",
    "パートナーズ",
]

# Names that are consulting firms but don't always include obvious tokens.
ALLOW_EXACT = {
    "アクセンチュア",
    "ベイカレント",
    "ノースサンド",
    "シグマクシス",
    "Ridgelinez",
    "Dirbato（ディルバート）",
    "INTLOOP",
    "A.T. カーニー",
    "マッキンゼー・アンド・カンパニー",
    "ボストン コンサルティング グループ",
    "ベイン・アンド・カンパニー",
    "ローランド・ベルガー",
    "オリバー・ワイマン",
    "アーサー・ディ・リトル",
    "L.E.K.コンサルティング",
    "ZSアソシエイツ",
    "キャップジェミニ",
    "B&DX",
    "Re-grit Partners （リグリットパートナーズ）",
    "リブ・コンサルティング",
    "ペイフォワードパートナーズ",
    "グロービング",
    "スカイライトコンサルティング",
    "イグニション・ポイント",
    "オースビー",
    "カクシン",
    "NEWOLD CAPITAL",
    "indi",
    "マース・アンド・コー・コンサルティング・ジャパン",
}

ALIAS_MAP = {
    "PwCコンサルティング合同会社": "PwCコンサルティング",
    "PwCアドバイザリー合同会社": "PwCアドバイザリー",
    "KPMGコンサルティング株式会社": "KPMGコンサルティング",
    "EYストラテジー・アンド・コンサルティング株式会社": "EYストラテジー・アンド・コンサルティング",
    "フォーティエンスコンサルティング（旧：クニエ）": "フォーティエンスコンサルティング",
    "フューチャー（フューチャーアーキテクト）": "フューチャーアーキテクト",
    "Dirbato（ディルバート）": "Dirbato",
    "コーン・フェリー・ジャパン": "コーン・フェリー",
    "経営共創基盤（IGPI）": "経営共創基盤",
    "YCP Solidiance": "YCP",
    "シンプレクス・ホールディングス": "シンプレクス",
    "みずほリサーチ&テクノロジーズ（旧：みずほ情報総研）": "みずほリサーチ&テクノロジーズ",
    "船井総研ヒューマンキャピタルコンサルティング（旧：HR Force）": "船井総研ヒューマンキャピタルコンサルティング",
    "Re-grit Partners （リグリットパートナーズ）": "Re-grit Partners",
    "合同会社デロイト トーマツ／コンサルティング": "デロイト トーマツ",
    "合同会社デロイト トーマツ／ファイナンシャルアドバイザリー": "デロイト トーマツ",
    "合同会社デロイト トーマツ／リスクアドバイザリー": "デロイト トーマツ",
}


def fetch_soup(url: str) -> BeautifulSoup:
    res = requests.get(url, headers=HEADERS, timeout=30)
    res.raise_for_status()
    res.encoding = res.apparent_encoding or res.encoding
    return BeautifulSoup(res.text, "html.parser")


def normalize_name(name: str) -> str:
    x = " ".join((name or "").replace("（", "(").replace("）", ")").split()).strip(" ・")
    x = ALIAS_MAP.get(x, x)
    for prefix in ["株式会社 ", "合同会社 ", "有限会社 "]:
        if x.startswith(prefix):
            x = x[len(prefix) :].strip()
    for suffix in ["株式会社", "合同会社", "有限会社"]:
        if x.endswith(suffix):
            x = x[: -len(suffix)].strip()
    if x in ALIAS_MAP:
        x = ALIAS_MAP[x]
    return x.strip()


def is_consulting_like(name: str) -> bool:
    if not name or len(name) < 2 or len(name) > 90:
        return False
    if any(sw in name for sw in STOPWORDS):
        return False
    if name in ALLOW_EXACT:
        return True
    return any(tok in name for tok in CONSULTING_TOKENS)


def extract_raw_names():
    raw = []

    # 1) Movin table extraction: strongest seed quality
    for url in MOVIN_URLS:
        soup = fetch_soup(url)
        for tr in soup.select("tr"):
            cells = [c.get_text(" ", strip=True) for c in tr.select("td,th")]
            if len(cells) >= 2 and cells[0] == "社名":
                raw.append((cells[1], url))

    # 2) OneCareer paging
    for url in ONECAREER_PAGES:
        soup = fetch_soup(url)
        got = 0
        for a in soup.select("a[href]"):
            href = a.get("href", "")
            if re.fullmatch(r"/companies/\d+", href):
                name = " ".join(a.get_text(" ", strip=True).split())
                if name:
                    raw.append((name, url))
                    got += 1
        if got == 0:
            break

    # 3) Keep lightweight traces from two article seeds (for provenance)
    for url in ["https://freeconsul.co.jp/cs/consultingfirm/", "https://consulfree.com/blog/consultingfirm/"]:
        soup = fetch_soup(url)
        for tag in soup.select("h2,h3,h4,li,a"):
            name = " ".join(tag.get_text(" ", strip=True).split())
            if is_consulting_like(name):
                raw.append((name, url))

    return raw


def main():
    base = Path("C:/Users/ADMIN/Desktop/graduate/data/research")
    base.mkdir(parents=True, exist_ok=True)
    raw_path = base / "seed_raw_companies_20260309.csv"
    queue_path = base / "seed_candidate_queue_20260309.csv"

    raw = extract_raw_names()
    with raw_path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["raw_name", "source_url"])
        w.writerows(raw)

    canon = defaultdict(lambda: {"aliases": set(), "sources": set()})
    for raw_name, src in raw:
        norm = normalize_name(raw_name)
        if not is_consulting_like(norm):
            continue
        canon[norm]["aliases"].add(raw_name)
        canon[norm]["sources"].add(src)

    with queue_path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["canonical_candidate", "aliases", "source_count", "source_urls"])
        for name, meta in sorted(canon.items(), key=lambda kv: (-len(kv[1]["sources"]), kv[0])):
            w.writerow(
                [
                    name,
                    "|".join(sorted(meta["aliases"])),
                    len(meta["sources"]),
                    "|".join(sorted(meta["sources"])),
                ]
            )

    print(f"seed_sources={len(SEED_URLS)}")
    print(f"raw_rows={len(raw)}")
    print(f"candidate_count={len(canon)}")
    print(raw_path)
    print(queue_path)


if __name__ == "__main__":
    main()
