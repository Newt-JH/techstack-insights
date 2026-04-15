"""
원티드(wanted.co.kr) 채용공고 크롤러
- 개발 직군 채용공고 수집
- Supabase raw_job_postings 테이블에 저장
- 개인정보 비수집, robots.txt 준수
"""

import logging
import random
import time
from typing import Any

import requests
from supabase import create_client, Client
from tqdm import tqdm

# ---------------------------------------------------------------------------
# 설정
# ---------------------------------------------------------------------------

import os
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://zrxcoutfpslkuvaepkwh.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
TABLE_NAME = "raw_job_postings"
SOURCE = "wanted"

# 원티드 API
WANTED_JOBS_API = "https://www.wanted.co.kr/api/v4/jobs"
WANTED_JOB_DETAIL_API = "https://www.wanted.co.kr/api/v4/jobs/{job_id}"

# 개발 직군 태그 ID 목록 (원티드 기준 job_group_id)
# 518  = 개발
# 655  = 웹개발
# 660  = 서버/백엔드
# 661  = 프론트엔드
# 872  = Android
# 873  = iOS
# 674  = 데이터 엔지니어
# 900  = 머신러닝/AI
DEV_JOB_GROUP_IDS = [518, 655, 660, 661, 872, 873, 674, 900]

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.wanted.co.kr/",
    "Origin": "https://www.wanted.co.kr",
}

# robots.txt 준수: 크롤 딜레이 2~3초
SLEEP_MIN = 0.3
SLEEP_MAX = 0.5

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
# Supabase 클라이언트
# ---------------------------------------------------------------------------

def get_supabase_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# ---------------------------------------------------------------------------
# robots.txt 확인
# ---------------------------------------------------------------------------

def check_robots_txt() -> bool:
    """
    원티드 robots.txt 를 확인하고 /api/ 경로 크롤링 허용 여부를 반환합니다.
    불허 규칙이 명시되어 있으면 False, 그렇지 않으면 True 를 반환합니다.
    """
    try:
        resp = requests.get(
            "https://www.wanted.co.kr/robots.txt",
            headers=REQUEST_HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        content = resp.text.lower()

        disallow_api = False
        current_agent_applies = False

        for line in content.splitlines():
            line = line.strip()
            if line.startswith("user-agent:"):
                agent = line.split(":", 1)[1].strip()
                current_agent_applies = agent in ("*", "python-requests")
            elif current_agent_applies and line.startswith("disallow:"):
                path = line.split(":", 1)[1].strip()
                if path in ("/api/", "/api"):
                    disallow_api = True
                    break

        if disallow_api:
            logger.warning("robots.txt: /api/ 경로가 크롤링 불허 상태입니다. 크롤러를 중단합니다.")
            return False

        logger.info("robots.txt 확인 완료: /api/ 경로 크롤링 허용")
        return True

    except requests.RequestException as exc:
        logger.warning("robots.txt 확인 실패 (%s). 진행을 허용합니다.", exc)
        return True


# ---------------------------------------------------------------------------
# 공고 목록 수집
# ---------------------------------------------------------------------------

def fetch_job_list(session: requests.Session, job_group_id: int, offset: int = 0, limit: int = 20) -> dict:
    """단일 페이지 공고 목록을 반환합니다."""
    params = {
        "job_group_id": job_group_id,
        "country": "kr",
        "tag_type_ids": job_group_id,
        "limit": limit,
        "offset": offset,
    }
    resp = session.get(WANTED_JOBS_API, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def collect_all_job_ids(session, job_group_id):
    """직군 하나에 대한 전체 공고 ID 목록을 수집합니다."""
    ids = []
    offset = 0
    limit = 20

    logger.info("직군 ID %d: 공고 목록 수집 시작", job_group_id)

    while True:
        try:
            data = fetch_job_list(session, job_group_id, offset=offset, limit=limit)
        except requests.RequestException as exc:
            logger.error("목록 조회 실패 (job_group=%d, offset=%d): %s", job_group_id, offset, exc)
            break

        jobs = data.get("data", [])
        if not jobs:
            break

        ids.extend(job["id"] for job in jobs)

        total = data.get("links", {}).get("total", None)
        logger.debug("  offset=%d, 수집=%d, 누적=%d (total=%s)", offset, len(jobs), len(ids), total)

        if total is not None and len(ids) >= total:
            break
        if len(jobs) < limit:
            break

        offset += limit
        time.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))

    logger.info("직군 ID %d: 총 %d개 공고 ID 수집 완료", job_group_id, len(ids))
    return ids


# ---------------------------------------------------------------------------
# 공고 상세 수집
# ---------------------------------------------------------------------------

def fetch_job_detail(session: requests.Session, job_id: int):
    """단일 공고 상세 정보를 반환합니다."""
    url = WANTED_JOB_DETAIL_API.format(job_id=job_id)
    try:
        resp = session.get(url, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        logger.warning("공고 %d 상세 조회 실패: %s", job_id, exc)
        return None


# ---------------------------------------------------------------------------
# 데이터 파싱 (개인정보 필드 제외)
# ---------------------------------------------------------------------------

def parse_job(raw):
    """
    API 응답에서 필요한 필드만 추출합니다.
    개인정보(지원자, 담당자 연락처 등)는 수집하지 않습니다.
    """
    job = raw.get("job", raw)  # 상세 API는 job 키 하위에 데이터가 있음

    # 기술 스택 태그
    tech_tags = []
    for skill in job.get("skill_tags", []):
        name = skill.get("title") or skill.get("name") or ""
        if name:
            tech_tags.append(name)

    # 경력 조건 (annual_from / annual_to 우선, 없으면 exp_min / exp_max)
    exp_min = job.get("annual_from", job.get("exp_min", None))
    exp_max = job.get("annual_to", job.get("exp_max", None))
    if exp_min is not None and exp_max is not None:
        if exp_max == 0 and exp_min == 0:
            experience_level = "신입"
        elif exp_min == 0 and exp_max > 0:
            experience_level = f"신입~{exp_max}년"
        elif exp_max >= 99:
            experience_level = f"{exp_min}년 이상"
        else:
            experience_level = f"{exp_min}~{exp_max}년"
    else:
        experience_level = ""

    # 위치
    address = job.get("address", {}) or {}
    location_parts = [
        address.get("country", ""),
        address.get("location", ""),
    ]
    location = " ".join(p for p in location_parts if p).strip()
    if not location:
        location = (job.get("address", {}) or {}).get("full_location", "")

    # 급여
    salary = job.get("salary_range", None)
    if salary:
        salary_info = f"{salary.get('min', '')} ~ {salary.get('max', '')} {salary.get('currency', 'KRW')}"
    else:
        salary_info = job.get("salary_suggestion", "") or ""

    # 직무 설명 (자격요건/우대사항)
    detail = job.get("detail", {}) or {}
    requirements = detail.get("requirements", "") or ""
    preferred = detail.get("preferred_points", "") or ""

    return {
        "source": SOURCE,
        "source_id": str(job.get("id", "")),
        "title": job.get("position", ""),
        "company": (job.get("company", {}) or {}).get("name", ""),
        "position": job.get("position", ""),
        "experience_level": experience_level,
        "requirements": requirements,
        "preferred": preferred,
        "tech_stack": tech_tags,
        "location": location,
        "salary_info": salary_info,
        "raw_data": raw,
    }


# ---------------------------------------------------------------------------
# Supabase 저장
# ---------------------------------------------------------------------------

def upsert_job(client, record):
    """
    source + source_id 를 기준으로 upsert 합니다.
    성공 시 True, 실패 시 False 를 반환합니다.
    """
    try:
        client.table(TABLE_NAME).upsert(
            record,
            on_conflict="source,source_id",
        ).execute()
        return True
    except Exception as exc:
        logger.error("DB 저장 실패 (source_id=%s): %s", record.get("source_id"), exc)
        return False


# ---------------------------------------------------------------------------
# 메인 실행
# ---------------------------------------------------------------------------

def main() -> None:
    logger.info("===== 원티드 채용공고 크롤러 시작 =====")

    # robots.txt 준수 확인
    if not check_robots_txt():
        return

    # Supabase 클라이언트 초기화
    supabase = get_supabase_client()
    logger.info("Supabase 연결 완료: %s / 테이블: %s", SUPABASE_URL, TABLE_NAME)

    session = requests.Session()
    session.headers.update(REQUEST_HEADERS)

    # 전체 공고 ID 수집 (중복 제거)
    all_job_ids: set[int] = set()
    for group_id in DEV_JOB_GROUP_IDS:
        ids = collect_all_job_ids(session, group_id)
        all_job_ids.update(ids)
        time.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))

    logger.info("총 수집 대상 공고: %d개 (중복 제거 후)", len(all_job_ids))

    # 상세 정보 수집 및 DB 저장
    success_count = 0
    fail_count = 0

    for job_id in tqdm(all_job_ids, desc="공고 상세 수집", unit="건"):
        raw = fetch_job_detail(session, job_id)
        if raw is None:
            fail_count += 1
            time.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))
            continue

        record = parse_job(raw)

        if not record["source_id"]:
            logger.warning("source_id 없음, 건너뜀: %s", raw)
            fail_count += 1
            continue

        if upsert_job(supabase, record):
            success_count += 1
        else:
            fail_count += 1

        time.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))

    logger.info(
        "===== 크롤링 완료: 성공 %d건 / 실패 %d건 =====",
        success_count,
        fail_count,
    )


if __name__ == "__main__":
    main()
