"""
analyze.py
채용공고 데이터 분석 메인 스크립트.

분석 항목:
  1. 직무별(position_type) 스킬 빈도 분석
  2. 필수(requirements) vs 우대(preferred) 구분 분석
  3. 경력별(junior/senior) 요구 스킬 차이 분석
  4. 결과를 skill_analysis 테이블에 INSERT
"""

import logging
import sys
from collections import Counter
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd
from supabase import create_client, Client
from tqdm import tqdm

from keyword_extractor import KeywordExtractor

# ---------------------------------------------------------------------------
# 설정
# ---------------------------------------------------------------------------
import os
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://zrxcoutfpslkuvaepkwh.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# 경력 구분 기준 키워드
JUNIOR_KEYWORDS = ["신입", "주니어", "junior", "entry", "0년", "1년", "2년", "3년"]
SENIOR_KEYWORDS = ["시니어", "senior", "리드", "lead", "4년", "5년", "6년", "7년", "8년", "9년", "10년"]


# ---------------------------------------------------------------------------
# Supabase 헬퍼
# ---------------------------------------------------------------------------

def get_client() -> Client:
    logger.info("Supabase 클라이언트 초기화 중...")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_raw_job_postings(client: Client) -> pd.DataFrame:
    logger.info("raw_job_postings 테이블 데이터 로딩 중...")
    response = client.table("raw_job_postings").select("*").execute()
    rows = response.data
    if not rows:
        logger.warning("raw_job_postings 에 데이터가 없습니다.")
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    logger.info(f"  -> {len(df)}건 로드 완료. 컬럼: {list(df.columns)}")
    return df


def fetch_keyword_mappings(client: Client) -> dict[str, str]:
    """keyword_mappings 테이블에서 동의어 사전 로드. 없으면 빈 dict 반환."""
    try:
        response = client.table("keyword_mappings").select("*").execute()
        rows = response.data
        if not rows:
            logger.info("keyword_mappings 테이블이 비어 있습니다. 동의어 사전 없이 진행합니다.")
            return {}
        # 컬럼명 후보: alias/synonym -> canonical/standard
        alias_col = next((c for c in rows[0] if c in ("alias", "synonym", "from", "source")), None)
        canon_col = next((c for c in rows[0] if c in ("canonical", "standard", "to", "target", "normalized")), None)
        if not alias_col or not canon_col:
            logger.warning(f"keyword_mappings 컬럼을 인식할 수 없습니다: {list(rows[0].keys())}. 동의어 사전 없이 진행합니다.")
            return {}
        mapping = {row[alias_col]: row[canon_col] for row in rows if row.get(alias_col) and row.get(canon_col)}
        logger.info(f"  -> 동의어 사전 {len(mapping)}건 로드 완료.")
        return mapping
    except Exception as exc:
        logger.warning(f"keyword_mappings 로드 실패 (무시): {exc}")
        return {}


def insert_skill_analysis(client: Client, records: list[dict[str, Any]]) -> None:
    if not records:
        logger.warning("저장할 분석 결과가 없습니다.")
        return
    logger.info(f"skill_analysis 테이블에 {len(records)}건 INSERT 중...")
    # 배치 단위로 나눠 INSERT (Supabase 권장 1000건 이하)
    batch_size = 500
    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        client.table("skill_analysis").insert(batch).execute()
        logger.info(f"  -> {min(i + batch_size, len(records))}/{len(records)} 완료")
    logger.info("INSERT 완료.")


# ---------------------------------------------------------------------------
# 경력 구분 헬퍼
# ---------------------------------------------------------------------------

def classify_career_level(row: pd.Series) -> str:
    """행 데이터를 바탕으로 'junior' / 'senior' / 'unknown' 반환."""
    text = " ".join(
        str(row.get(c, "") or "") for c in ("career_level", "experience", "title", "position_type")
    ).lower()
    if any(kw in text for kw in JUNIOR_KEYWORDS):
        return "junior"
    if any(kw in text for kw in SENIOR_KEYWORDS):
        return "senior"
    return "unknown"


# ---------------------------------------------------------------------------
# 분석 로직
# ---------------------------------------------------------------------------

def build_keyword_rows(df: pd.DataFrame, extractor: KeywordExtractor) -> pd.DataFrame:
    """
    각 공고별로 키워드를 추출하고 explode 해서 분석용 long-form DataFrame 반환.
    컬럼: id, position_type, career_level, keyword, source (requirements/preferred/tech_stack)
    """
    logger.info("키워드 추출 중...")
    records = []
    for _, row in tqdm(df.iterrows(), total=len(df), desc="키워드 추출", unit="건"):
        kw_map = extractor.extract_multi(
            requirements=row.get("requirements"),
            preferred=row.get("preferred"),
            tech_stack=row.get("tech_stack"),
        )
        career = classify_career_level(row)
        pos_type = str(row.get("position_type") or "unknown")
        job_id = row.get("id")

        for source in ("requirements", "preferred", "tech_stack"):
            for kw in kw_map[source]:
                records.append(
                    {
                        "job_id": job_id,
                        "position_type": pos_type,
                        "career_level": career,
                        "keyword": kw,
                        "source": source,
                    }
                )

    kdf = pd.DataFrame(records)
    logger.info(f"  -> 총 키워드 행: {len(kdf)}건")
    return kdf


def analyze_by_position(kdf: pd.DataFrame) -> pd.DataFrame:
    """직무별(position_type) 스킬 빈도 분석."""
    logger.info("직무별 스킬 빈도 분석 중...")
    if kdf.empty:
        return pd.DataFrame()
    grouped = (
        kdf.groupby(["position_type", "keyword"])
        .size()
        .reset_index(name="count")
        .sort_values(["position_type", "count"], ascending=[True, False])
    )
    return grouped


def analyze_req_vs_pref(kdf: pd.DataFrame) -> pd.DataFrame:
    """필수 vs 우대 구분 분석."""
    logger.info("필수 vs 우대 구분 분석 중...")
    if kdf.empty:
        return pd.DataFrame()
    grouped = (
        kdf[kdf["source"].isin(["requirements", "preferred"])]
        .groupby(["source", "keyword"])
        .size()
        .reset_index(name="count")
        .sort_values(["source", "count"], ascending=[True, False])
    )
    return grouped


def analyze_by_career(kdf: pd.DataFrame) -> pd.DataFrame:
    """경력별(junior/senior) 요구 스킬 차이 분석."""
    logger.info("경력별 스킬 차이 분석 중...")
    if kdf.empty:
        return pd.DataFrame()
    grouped = (
        kdf[kdf["career_level"].isin(["junior", "senior"])]
        .groupby(["career_level", "keyword"])
        .size()
        .reset_index(name="count")
        .sort_values(["career_level", "count"], ascending=[True, False])
    )
    return grouped


# ---------------------------------------------------------------------------
# 콘솔 출력
# ---------------------------------------------------------------------------

def print_top_keywords(kdf: pd.DataFrame, top_n: int = 30) -> None:
    """전체 키워드 빈도 상위 N개 출력."""
    if kdf.empty:
        print("\n[전체 키워드 빈도] 데이터 없음\n")
        return
    counter = Counter(kdf["keyword"].tolist())
    print(f"\n{'='*60}")
    print(f"  전체 키워드 빈도 TOP {top_n}")
    print(f"{'='*60}")
    for rank, (kw, cnt) in enumerate(counter.most_common(top_n), 1):
        bar = "█" * min(cnt, 40)
        print(f"  {rank:>3}. {kw:<20} {cnt:>5}건  {bar}")
    print()


def print_position_summary(pos_df: pd.DataFrame, top_n: int = 5) -> None:
    if pos_df.empty:
        return
    print(f"\n{'='*60}")
    print("  직무별 TOP 키워드")
    print(f"{'='*60}")
    for pos_type, grp in pos_df.groupby("position_type"):
        top = grp.head(top_n)
        kws = ", ".join(f"{r['keyword']}({r['count']})" for _, r in top.iterrows())
        print(f"  [{pos_type}] {kws}")
    print()


def print_req_vs_pref(rv_df: pd.DataFrame, top_n: int = 10) -> None:
    if rv_df.empty:
        return
    print(f"\n{'='*60}")
    print("  필수 vs 우대 상위 키워드")
    print(f"{'='*60}")
    for source in ("requirements", "preferred"):
        grp = rv_df[rv_df["source"] == source].head(top_n)
        label = "필수" if source == "requirements" else "우대"
        kws = ", ".join(f"{r['keyword']}({r['count']})" for _, r in grp.iterrows())
        print(f"  [{label}] {kws}")
    print()


def print_career_diff(career_df: pd.DataFrame, top_n: int = 10) -> None:
    if career_df.empty:
        return
    print(f"\n{'='*60}")
    print("  경력별 요구 스킬 차이")
    print(f"{'='*60}")
    for level in ("junior", "senior"):
        grp = career_df[career_df["career_level"] == level].head(top_n)
        kws = ", ".join(f"{r['keyword']}({r['count']})" for _, r in grp.iterrows())
        print(f"  [{level.upper():>6}] {kws}")
    print()


# ---------------------------------------------------------------------------
# skill_analysis INSERT 레코드 빌더
# ---------------------------------------------------------------------------

def build_analysis_records(
    pos_df: pd.DataFrame,
    rv_df: pd.DataFrame,
    career_df: pd.DataFrame,
    analyzed_at: str,
) -> list[dict[str, Any]]:
    """세 분석 결과를 skill_analysis 테이블 스키마로 변환."""
    records: list[dict[str, Any]] = []

    # 직무별
    for _, row in pos_df.iterrows():
        records.append(
            {
                "analysis_type": "position",
                "dimension_key": str(row["position_type"]),
                "keyword": str(row["keyword"]),
                "count": int(row["count"]),
                "source": None,
                "analyzed_at": analyzed_at,
            }
        )

    # 필수 vs 우대
    for _, row in rv_df.iterrows():
        records.append(
            {
                "analysis_type": "req_vs_pref",
                "dimension_key": str(row["source"]),
                "keyword": str(row["keyword"]),
                "count": int(row["count"]),
                "source": str(row["source"]),
                "analyzed_at": analyzed_at,
            }
        )

    # 경력별
    for _, row in career_df.iterrows():
        records.append(
            {
                "analysis_type": "career_level",
                "dimension_key": str(row["career_level"]),
                "keyword": str(row["keyword"]),
                "count": int(row["count"]),
                "source": None,
                "analyzed_at": analyzed_at,
            }
        )

    return records


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main() -> None:
    logger.info("===== 채용공고 데이터 분석 시작 =====")

    # 1. Supabase 연결 및 데이터 로드
    client = get_client()
    df = fetch_raw_job_postings(client)
    if df.empty:
        logger.error("분석할 데이터가 없습니다. 종료합니다.")
        sys.exit(1)

    # 2. 동의어 사전 로드
    synonym_map = fetch_keyword_mappings(client)

    # 3. 키워드 추출기 초기화
    extractor = KeywordExtractor(synonym_map=synonym_map)

    # 4. 키워드 추출 (long-form DataFrame)
    kdf = build_keyword_rows(df, extractor)

    # 5. 콘솔 출력: 전체 빈도 확인
    print_top_keywords(kdf, top_n=30)

    # 6. 세부 분석
    pos_df    = analyze_by_position(kdf)
    rv_df     = analyze_req_vs_pref(kdf)
    career_df = analyze_by_career(kdf)

    print_position_summary(pos_df, top_n=5)
    print_req_vs_pref(rv_df, top_n=10)
    print_career_diff(career_df, top_n=10)

    # 7. skill_analysis 테이블에 저장
    analyzed_at = datetime.now(timezone.utc).isoformat()
    records = build_analysis_records(pos_df, rv_df, career_df, analyzed_at)
    insert_skill_analysis(client, records)

    logger.info("===== 분석 완료 =====")


if __name__ == "__main__":
    main()
