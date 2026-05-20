"""
점핏(jumpit.saramin.co.kr) 채용공고 크롤러
- 개발자 전용 채용 플랫폼 (Saramin 산하)
- 공개 JSON API: jumpit-api.saramin.co.kr (인증 불필요)
- Supabase raw_job_postings 테이블에 저장 (source = "jumpit")
"""

import logging
import os
import random
import time

import requests
from supabase import Client, create_client
from tqdm import tqdm

# ---------------------------------------------------------------------------
# 설정
# ---------------------------------------------------------------------------

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://zrxcoutfpslkuvaepkwh.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
TABLE_NAME = "raw_job_postings"
SOURCE = "jumpit"

# 점핏 공개 API
JUMPIT_LIST_API   = "https://jumpit-api.saramin.co.kr/api/positions"
JUMPIT_DETAIL_API = "https://jumpit-api.saramin.co.kr/api/position/{position_id}"

# 점핏 직군 카테고리 ID (개발 전용 플랫폼이라 모든 카테고리가 개발 직군)
# 1:서버/백엔드 2:프론트 3:풀스택 4:안드로이드 5:iOS 6:크로스플랫폼 7:게임클라이언트
# 8:게임서버 9:DBA 10:빅데이터/AI 11:DevOps/시스템엔지니어 12:정보보안 13:QA
# 14:HW/임베디드 15:SW/솔루션 16:웹퍼블리셔 17:VR/AR 18:기술지원 22:블록체인
JUMPIT_CATEGORIES = [1, 2, 3, 4, 5, 6, 10, 11, 16]

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept":   "application/json, text/plain, */*",
    "Referer":  "https://jumpit.saramin.co.kr/",
    "Origin":   "https://jumpit.saramin.co.kr",
}

PAGE_SIZE  = 16  # 점핏 기본 페이지 크기
SLEEP_MIN  = 0.3
SLEEP_MAX  = 0.6

# ---------------------------------------------------------------------------
# 로깅
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Supabase
# ---------------------------------------------------------------------------

def get_supabase_client() -> Client:
    if not SUPABASE_KEY:
        raise RuntimeError("환경변수 SUPABASE_SERVICE_KEY 가 비어있습니다.")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# ---------------------------------------------------------------------------
# 목록/상세 수집
# ---------------------------------------------------------------------------

def fetch_position_list(session, category_id, page=1):
    params = {"sort": "relation", "page": page, "job_category": category_id}
    resp = session.get(JUMPIT_LIST_API, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json().get("result", {})


def collect_all_position_ids(session, category_id):
    """카테고리 하나에 대한 전체 포지션 ID 수집."""
    ids = []
    page = 1
    total = None

    while True:
        try:
            result = fetch_position_list(session, category_id, page=page)
        except requests.RequestException as exc:
            logger.error("목록 조회 실패 (cat=%d, page=%d): %s", category_id, page, exc)
            break

        positions = result.get("positions", [])
        if total is None:
            total = result.get("totalCount", 0)
        if not positions:
            break

        ids.extend(p["id"] for p in positions)

        if len(ids) >= total:
            break
        if len(positions) < PAGE_SIZE:
            break

        page += 1
        time.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))

    logger.info("카테고리 %d: %d개 포지션 ID 수집 완료 (전체 %s)", category_id, len(ids), total)
    return ids


def fetch_position_detail(session, position_id):
    url = JUMPIT_DETAIL_API.format(position_id=position_id)
    try:
        resp = session.get(url, timeout=15)
        resp.raise_for_status()
        return resp.json().get("result")
    except requests.RequestException as exc:
        logger.warning("포지션 %d 상세 조회 실패: %s", position_id, exc)
        return None


# ---------------------------------------------------------------------------
# 파싱
# ---------------------------------------------------------------------------

def _format_experience(min_career, max_career):
    if min_career is None and max_career is None:
        return ""
    if (min_career or 0) == 0 and (max_career or 0) == 0:
        return "신입"
    if (min_career or 0) == 0 and (max_career or 0) > 0:
        return f"신입~{max_career}년"
    if (max_career or 0) >= 99:
        return f"{min_career}년 이상"
    return f"{min_career or 0}~{max_career or 0}년"


def parse_position(detail):
    """점핏 상세 응답 → raw_job_postings 레코드"""
    tech_stacks = []
    for s in detail.get("techStacks", []) or []:
        # 상세는 [{stack, imagePath}], 목록은 ["Java", "Python"] 형태
        if isinstance(s, dict):
            name = s.get("stack")
        else:
            name = s
        if name:
            tech_stacks.append(name)

    locations = detail.get("locations") or []
    location = locations[0] if locations else ""

    experience_level = _format_experience(detail.get("minCareer"), detail.get("maxCareer"))

    return {
        "source":           SOURCE,
        "source_id":        str(detail.get("id", "")),
        "title":            detail.get("title", ""),
        "company":          detail.get("companyName", ""),
        "position":         detail.get("jobCategory", "") or detail.get("title", ""),
        "experience_level": experience_level,
        "requirements":     detail.get("qualifications", "") or "",
        "preferred":        detail.get("preferredExperience", "") or "",
        "tech_stack":       ", ".join(tech_stacks),
        "location":         location,
        "salary_info":      "",
        "raw_data":         detail,
    }


# ---------------------------------------------------------------------------
# Supabase 저장
# ---------------------------------------------------------------------------

def upsert_job(client, record):
    try:
        client.table(TABLE_NAME).upsert(record, on_conflict="source,source_id").execute()
        return True
    except Exception as exc:
        logger.error("DB 저장 실패 (source_id=%s): %s", record.get("source_id"), exc)
        return False


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main():
    logger.info("===== 점핏 채용공고 크롤러 시작 =====")
    supabase = get_supabase_client()
    logger.info("Supabase 연결 완료: %s / 테이블: %s", SUPABASE_URL, TABLE_NAME)

    session = requests.Session()
    session.headers.update(REQUEST_HEADERS)

    # 전체 포지션 ID 수집 (카테고리 간 중복 제거)
    all_ids = set()
    for cat_id in JUMPIT_CATEGORIES:
        ids = collect_all_position_ids(session, cat_id)
        all_ids.update(ids)
        time.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))

    logger.info("총 수집 대상: %d개 포지션 (중복 제거 후)", len(all_ids))

    success = fail = 0
    for pid in tqdm(all_ids, desc="포지션 상세 수집", unit="건"):
        detail = fetch_position_detail(session, pid)
        if detail is None:
            fail += 1
            time.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))
            continue

        record = parse_position(detail)
        if not record["source_id"]:
            fail += 1
            continue

        if upsert_job(supabase, record):
            success += 1
        else:
            fail += 1

        time.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))

    logger.info("===== 완료: 성공 %d건 / 실패 %d건 =====", success, fail)


if __name__ == "__main__":
    main()
