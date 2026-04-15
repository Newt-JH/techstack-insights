"""
seed_analysis.py
raw_job_postings의 seed 데이터를 읽어 skill_analysis 테이블에 분석 결과를 삽입합니다.

skill_analysis 스키마:
  - position_type  VARCHAR(100)  - Frontend, Backend, DevOps, Data Science
  - keyword        VARCHAR(100)  - 스킬명
  - total_count    INTEGER       - 전체 등장 횟수
  - required_count INTEGER       - 필수 요건 등장 횟수
  - preferred_count INTEGER      - 우대 사항 등장 횟수
  - percentage     DECIMAL(5,2)  - 전체 공고 대비 비율
  - target         VARCHAR(20)   - junior, senior, all
  - analyzed_at    TIMESTAMPTZ   - 현재시간
"""

import re
import sys
from collections import defaultdict
from datetime import datetime, timezone

from supabase import create_client, Client

# ---------------------------------------------------------------------------
# 설정
# ---------------------------------------------------------------------------
import os
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://zrxcoutfpslkuvaepkwh.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

JUNIOR_EXP = {"신입", "1~3년"}
SENIOR_EXP = {"3~5년", "5~8년", "9년+"}

# 추출할 기술 키워드 목록 (직무별)
KEYWORDS = {
    "Frontend": [
        "React", "TypeScript", "Next.js", "JavaScript", "HTML/CSS", "Tailwind CSS",
        "Redux", "Vue.js", "Figma", "Webpack", "Vite", "GraphQL", "Jest",
        "Storybook", "Zustand", "React Query", "Recoil", "SCSS", "PWA",
        "CSS", "HTML",
    ],
    "Backend": [
        "Java", "Spring Boot", "Spring", "Python", "Django", "Node.js", "Express",
        "MySQL", "PostgreSQL", "Redis", "Docker", "AWS", "Kubernetes",
        "Kafka", "MongoDB", "FastAPI", "Go", "gRPC", "JPA", "Hibernate",
        "RabbitMQ", "Elasticsearch", "Nginx", "MSA",
    ],
    "DevOps": [
        "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Terraform", "Jenkins",
        "CI/CD", "Linux", "Ansible", "Prometheus", "Grafana", "ArgoCD",
        "Helm", "GitHub Actions", "EKS", "ECS", "CloudFormation", "Datadog",
        "Vault", "GitOps",
    ],
    "Data Science": [
        "Python", "Pandas", "NumPy", "TensorFlow", "PyTorch", "SQL", "Spark",
        "R", "Tableau", "Scikit-learn", "Keras", "Jupyter", "MLflow",
        "Hadoop", "Airflow", "BigQuery", "dbt", "Looker", "XGBoost",
        "LightGBM", "NLP", "MLOps",
    ],
}


# ---------------------------------------------------------------------------
# 헬퍼
# ---------------------------------------------------------------------------

def extract_keywords(text: str, keywords: list[str]) -> list[str]:
    """텍스트에서 등장하는 키워드 목록 반환 (중복 제거)."""
    if not text:
        return []
    found = []
    for kw in keywords:
        # 단어 경계 없이 포함 여부 확인 (대소문자 무시)
        pattern = re.escape(kw)
        if re.search(pattern, text, re.IGNORECASE):
            found.append(kw)
    return found


def classify_target(exp_level: str) -> str:
    if exp_level in JUNIOR_EXP:
        return "junior"
    if exp_level in SENIOR_EXP:
        return "senior"
    return "all"


# ---------------------------------------------------------------------------
# 분석
# ---------------------------------------------------------------------------

def analyze(rows: list[dict]) -> list[dict]:
    """
    rows: raw_job_postings 레코드 리스트
    반환: skill_analysis INSERT용 레코드 리스트
    """
    total_by_position: dict[str, int] = defaultdict(int)
    for row in rows:
        pos = row.get("position", "")
        if pos in KEYWORDS:
            total_by_position[pos] += 1

    # (position_type, keyword, target) -> {total, required, preferred}
    stats: dict[tuple, dict] = defaultdict(lambda: {"total": 0, "required": 0, "preferred": 0})

    for row in rows:
        pos = row.get("position", "")
        if pos not in KEYWORDS:
            continue

        exp = row.get("experience_level", "")
        target = classify_target(exp)
        kw_list = KEYWORDS[pos]

        req_text = row.get("requirements") or ""
        pref_text = row.get("preferred") or ""
        tech_text = row.get("tech_stack") or ""
        all_text = " ".join([req_text, pref_text, tech_text])

        req_kws   = set(extract_keywords(req_text,  kw_list))
        pref_kws  = set(extract_keywords(pref_text, kw_list))
        total_kws = set(extract_keywords(all_text,  kw_list))

        for kw in total_kws:
            # target-specific 집계
            key = (pos, kw, target)
            stats[key]["total"]    += 1
            stats[key]["required"] += 1 if kw in req_kws  else 0
            stats[key]["preferred"]+= 1 if kw in pref_kws else 0

            # "all" 집계
            key_all = (pos, kw, "all")
            stats[key_all]["total"]    += 1
            stats[key_all]["required"] += 1 if kw in req_kws  else 0
            stats[key_all]["preferred"]+= 1 if kw in pref_kws else 0

    analyzed_at = datetime.now(timezone.utc).isoformat()

    records = []
    for (pos, kw, target), counts in stats.items():
        total_postings = total_by_position.get(pos, 1)
        percentage = round(counts["total"] / total_postings * 100, 2)
        records.append({
            "position_type":   pos,
            "keyword":         kw,
            "total_count":     counts["total"],
            "required_count":  counts["required"],
            "preferred_count": counts["preferred"],
            "percentage":      percentage,
            "target":          target,
            "analyzed_at":     analyzed_at,
        })

    # percentage 내림차순 정렬
    records.sort(key=lambda r: (-r["percentage"], r["position_type"], r["keyword"]))
    return records


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main() -> None:
    print("Supabase 클라이언트 초기화 중...")
    client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("raw_job_postings 데이터 로딩 중...")
    response = client.table("raw_job_postings").select("*").execute()
    rows = response.data
    if not rows:
        print("raw_job_postings에 데이터가 없습니다. seed_data.py를 먼저 실행하세요.")
        sys.exit(1)
    print(f"  -> {len(rows)}건 로드 완료.")

    print("분석 중...")
    records = analyze(rows)
    print(f"  -> {len(records)}건 분석 결과 생성 완료.")

    # 기존 분석 결과 삭제 (재실행 대비)
    print("기존 skill_analysis 데이터 삭제 중...")
    try:
        client.table("skill_analysis").delete().neq("id", 0).execute()
        print("  -> 삭제 완료.")
    except Exception as e:
        print(f"  -> 삭제 오류 (무시): {e}")

    # 배치 INSERT
    print(f"skill_analysis 테이블에 {len(records)}건 INSERT 중...")
    batch_size = 500
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        client.table("skill_analysis").insert(batch).execute()
        print(f"  -> {min(i + batch_size, len(records))}/{len(records)} 완료")

    print("\n분석 결과 삽입 완료!")

    # 직무별 TOP 5 출력
    print("\n[직무별 TOP 5 키워드 (전체 공고 기준)]")
    from itertools import groupby
    all_records = [r for r in records if r["target"] == "all"]
    all_records.sort(key=lambda r: r["position_type"])
    for pos, group in groupby(all_records, key=lambda r: r["position_type"]):
        top5 = sorted(group, key=lambda r: -r["total_count"])[:5]
        kws = ", ".join(f"{r['keyword']}({r['total_count']}건, {r['percentage']}%)" for r in top5)
        print(f"  [{pos:>12}] {kws}")


if __name__ == "__main__":
    main()
