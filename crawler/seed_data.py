"""
seed_data.py
채용공고 임의 데이터 100건을 raw_job_postings 테이블에 삽입합니다.
"""

import random
from datetime import datetime, timezone

from supabase import create_client, Client

# ---------------------------------------------------------------------------
# Supabase 설정
# ---------------------------------------------------------------------------
import os
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://zrxcoutfpslkuvaepkwh.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

# ---------------------------------------------------------------------------
# 데이터 정의
# ---------------------------------------------------------------------------

POSITIONS = ["Frontend", "Backend", "DevOps", "Data Science"]

EXPERIENCE_LEVELS = ["신입", "1~3년", "3~5년", "5~8년", "9년+"]

LOCATIONS = ["서울 강남구", "서울 마포구", "서울 성동구", "판교", "성남", "서울 종로구", "서울 송파구", "부산"]

COMPANIES_REAL = [
    "카카오", "네이버", "토스", "쿠팡", "배달의민족", "당근마켓", "라인플러스",
    "하이퍼커넥트", "버킷플레이스", "뱅크샐러드", "카카오페이", "카카오뱅크",
    "네이버파이낸셜", "쏘카", "직방", "마켓컬리", "무신사", "에이블리", "야놀자",
]

COMPANIES_VIRTUAL = [
    "테크스타트 주식회사", "클라우드브릿지", "데이터인사이트", "넥스트코드",
    "알파테크", "블루오션소프트", "그린IT솔루션", "스카이랩스", "아이오테크",
    "피코소프트", "디지털웨이브", "코어시스템즈", "스마트넥서스", "엘리트소프트",
    "퓨처크래프트", "이노베이션랩", "하이테크솔루션", "빅데이터코리아",
]

COMPANIES = COMPANIES_REAL + COMPANIES_VIRTUAL

SALARY_OPTIONS = [
    "협의 후 결정", "3,000 ~ 4,000만원", "4,000 ~ 5,000만원", "5,000 ~ 6,000만원",
    "6,000 ~ 8,000만원", "8,000만원 이상", "연봉 무제한 협의", "회사 내규에 따름",
]

# ---------------------------------------------------------------------------
# 직무별 기술 스택 및 문장 템플릿
# ---------------------------------------------------------------------------

FRONTEND_TECHS = ["React", "TypeScript", "Next.js", "JavaScript", "HTML/CSS", "Tailwind CSS", "Redux", "Vue.js", "Figma", "Webpack", "Vite", "GraphQL", "Jest", "Storybook", "Zustand", "React Query", "Recoil", "SCSS"]

BACKEND_TECHS = ["Java", "Spring Boot", "Python", "Django", "Node.js", "Express", "MySQL", "PostgreSQL", "Redis", "Docker", "AWS", "Kubernetes", "Kafka", "MongoDB", "Spring", "FastAPI", "Go", "gRPC", "JPA", "Hibernate", "RabbitMQ", "Elasticsearch", "Nginx"]

DEVOPS_TECHS = ["Docker", "Kubernetes", "AWS", "GCP", "Azure", "Terraform", "Jenkins", "CI/CD", "Linux", "Ansible", "Prometheus", "Grafana", "ArgoCD", "Helm", "GitHub Actions", "EKS", "ECS", "CloudFormation", "Datadog", "Vault"]

DS_TECHS = ["Python", "Pandas", "NumPy", "TensorFlow", "PyTorch", "SQL", "Spark", "R", "Tableau", "Scikit-learn", "Keras", "Jupyter", "MLflow", "Hadoop", "Airflow", "BigQuery", "dbt", "Looker", "XGBoost", "LightGBM"]

TECH_MAP = {
    "Frontend": FRONTEND_TECHS,
    "Backend": BACKEND_TECHS,
    "DevOps": DEVOPS_TECHS,
    "Data Science": DS_TECHS,
}

# 직무별 제목 템플릿
TITLE_TEMPLATES = {
    "Frontend": [
        "{company} 프론트엔드 개발자 모집",
        "프론트엔드 엔지니어 ({exp})",
        "React/Next.js 프론트엔드 개발자",
        "서비스 프론트엔드 개발자 ({exp})",
        "웹 프론트엔드 개발자 채용",
        "UI/UX 프론트엔드 개발자",
        "프론트엔드 개발자 (TypeScript/React)",
    ],
    "Backend": [
        "{company} 백엔드 개발자 모집",
        "서버 개발자 ({exp})",
        "Java/Spring 백엔드 엔지니어",
        "백엔드 개발자 채용 ({exp})",
        "Node.js 백엔드 개발자",
        "플랫폼 서버 개발자",
        "API 백엔드 개발자 (Python/Django)",
    ],
    "DevOps": [
        "{company} DevOps 엔지니어",
        "클라우드 인프라 엔지니어 ({exp})",
        "DevOps/SRE 엔지니어",
        "인프라 엔지니어 (AWS/Kubernetes)",
        "플랫폼 엔지니어 ({exp})",
        "클라우드 운영 엔지니어",
        "Site Reliability Engineer (SRE)",
    ],
    "Data Science": [
        "{company} 데이터 사이언티스트",
        "ML 엔지니어 ({exp})",
        "데이터 분석가/사이언티스트",
        "AI/ML 연구원 채용",
        "머신러닝 엔지니어",
        "데이터 엔지니어 ({exp})",
        "빅데이터 분석가",
    ],
}

# 직무별 자격요건 문장 풀
REQUIREMENTS_POOL = {
    "Frontend": [
        "React 기반 프론트엔드 개발 경험 {years}년 이상",
        "TypeScript 실무 사용 경험",
        "RESTful API 연동 및 비동기 처리 경험",
        "HTML5/CSS3/JavaScript ES6+ 활용 능숙",
        "상태 관리 라이브러리(Redux, Zustand 등) 사용 경험",
        "Cross-browser 호환성 및 반응형 웹 구현 경험",
        "Git 기반 협업 및 코드 리뷰 경험",
        "웹 성능 최적화(Lazy Loading, Code Splitting 등) 경험",
        "컴포넌트 기반 UI 개발 경험 및 재사용 가능한 컴포넌트 설계",
        "CI/CD 파이프라인 이해 및 배포 경험",
    ],
    "Backend": [
        "Java/Spring Boot 또는 Python/Django 기반 백엔드 개발 경험 {years}년 이상",
        "RESTful API 설계 및 구현 경험",
        "관계형 데이터베이스(MySQL, PostgreSQL) 설계 및 쿼리 최적화 경험",
        "Redis 캐싱 및 세션 관리 경험",
        "Docker 기반 컨테이너 환경 개발 경험",
        "AWS 또는 GCP 클라우드 서비스 활용 경험",
        "마이크로서비스 아키텍처(MSA) 이해 및 개발 경험",
        "JPA/Hibernate 또는 ORM 라이브러리 사용 경험",
        "Git 기반 협업 개발 및 코드 리뷰 문화 익숙",
        "대용량 트래픽 처리 및 성능 최적화 경험",
    ],
    "DevOps": [
        "Kubernetes 클러스터 운영 및 관리 경험 {years}년 이상",
        "AWS/GCP/Azure 클라우드 인프라 구축 및 운영 경험",
        "Docker 컨테이너 기반 서비스 배포 및 관리 경험",
        "CI/CD 파이프라인(Jenkins, GitHub Actions 등) 구축 및 운영 경험",
        "Terraform 또는 Ansible을 이용한 Infrastructure as Code 경험",
        "Linux 시스템 관리 및 쉘 스크립트 작성 능숙",
        "모니터링(Prometheus, Grafana, Datadog 등) 시스템 구축 경험",
        "네트워크 기초 지식(TCP/IP, DNS, HTTP/HTTPS, Load Balancer)",
        "보안 취약점 관리 및 인프라 보안 강화 경험",
        "On-call 대응 및 장애 처리 경험",
    ],
    "Data Science": [
        "Python 기반 데이터 분석 및 ML 모델 개발 경험 {years}년 이상",
        "Pandas, NumPy, Scikit-learn 등 데이터 분석 라이브러리 활용 능숙",
        "TensorFlow 또는 PyTorch를 이용한 딥러닝 모델 구현 경험",
        "SQL을 이용한 데이터 추출 및 분석 경험",
        "통계 및 머신러닝 알고리즘 이해 (회귀, 분류, 군집화 등)",
        "데이터 전처리 및 Feature Engineering 경험",
        "모델 평가 지표 이해 및 성능 개선 경험",
        "대용량 데이터 처리(Spark, BigQuery 등) 경험",
        "A/B 테스트 설계 및 결과 분석 경험",
        "ML 모델 서빙 및 MLOps 파이프라인 구축 경험",
    ],
}

PREFERRED_POOL = {
    "Frontend": [
        "Next.js 기반 SSR/SSG 프로젝트 경험 우대",
        "디자인 시스템 구축 또는 Storybook 사용 경험 우대",
        "GraphQL 클라이언트 사용 경험(Apollo, Relay 등) 우대",
        "웹 접근성(WCAG) 기준 준수 경험 우대",
        "테스트 코드 작성(Jest, React Testing Library, Cypress) 경험 우대",
        "Figma 협업 및 디자인 시스템 이해 우대",
        "PWA(Progressive Web App) 개발 경험 우대",
        "성능 프로파일링 및 Core Web Vitals 최적화 경험 우대",
        "오픈소스 기여 경험 또는 개인 프로젝트 포트폴리오 보유자 우대",
        "AWS CloudFront, S3 등을 이용한 정적 웹 배포 경험 우대",
    ],
    "Backend": [
        "Kafka, RabbitMQ 등 메시지 큐 사용 경험 우대",
        "Elasticsearch 검색 엔진 개발 경험 우대",
        "gRPC 기반 마이크로서비스 개발 경험 우대",
        "대규모 트래픽(DAU 100만 이상) 서비스 개발 경험 우대",
        "NoSQL(MongoDB, DynamoDB) 사용 경험 우대",
        "Go 언어 사용 경험 우대",
        "코드 품질 개선 및 리팩터링 경험 우대",
        "사이드 프로젝트 또는 오픈소스 활동 우대",
        "기술 블로그 운영 또는 외부 발표 경험 우대",
        "AWS 자격증(SAA, SAP 등) 보유자 우대",
    ],
    "DevOps": [
        "EKS, GKE 등 매니지드 Kubernetes 서비스 운영 경험 우대",
        "ArgoCD, Flux 등 GitOps 도구 사용 경험 우대",
        "Vault를 이용한 시크릿 관리 경험 우대",
        "FinOps(클라우드 비용 최적화) 경험 우대",
        "AWS/GCP 자격증 보유자 우대",
        "Python 또는 Go를 이용한 자동화 스크립트 작성 경험 우대",
        "ITSM/ITIL 프로세스 이해 우대",
        "대규모 서비스(트래픽 1Gbps 이상) 인프라 운영 경험 우대",
        "Chaos Engineering 경험 우대",
        "멀티 클라우드 또는 하이브리드 클라우드 운영 경험 우대",
    ],
    "Data Science": [
        "논문 구현 및 최신 딥러닝 트렌드 적용 경험 우대",
        "추천 시스템 설계 및 개발 경험 우대",
        "NLP(자연어 처리) 또는 Computer Vision 프로젝트 경험 우대",
        "MLflow, Kubeflow 등 MLOps 도구 사용 경험 우대",
        "Tableau, Looker 등 BI 도구 활용 경험 우대",
        "Kaggle 등 데이터 분석 대회 입상 경력 우대",
        "데이터 파이프라인(Airflow, dbt) 구축 경험 우대",
        "관련 학위(통계학, 컴퓨터공학, 수학 등) 또는 석박사 우대",
        "클라우드 기반 ML 플랫폼(SageMaker, Vertex AI) 사용 경험 우대",
        "R 언어를 이용한 통계 분석 경험 우대",
    ],
}


def pick_requirements(position: str, exp_level: str) -> str:
    pool = REQUIREMENTS_POOL[position]
    selected = random.sample(pool, k=random.randint(3, 5))
    years = {"신입": "0", "1~3년": "1", "3~5년": "3", "5~8년": "5", "9년+": "9"}.get(exp_level, "3")
    result = []
    for s in selected:
        result.append(s.format(years=years))
    return ", ".join(result)


def pick_preferred(position: str) -> str:
    pool = PREFERRED_POOL[position]
    selected = random.sample(pool, k=random.randint(2, 4))
    return ", ".join(selected)


def pick_tech_stack(position: str) -> str:
    techs = TECH_MAP[position]
    selected = random.sample(techs, k=random.randint(4, 8))
    return ", ".join(selected)


def pick_title(position: str, company: str, exp: str) -> str:
    template = random.choice(TITLE_TEMPLATES[position])
    return template.format(company=company, exp=exp)


# ---------------------------------------------------------------------------
# 데이터 생성
# ---------------------------------------------------------------------------

def generate_records(n: int = 100) -> list[dict]:
    records = []
    now = datetime.now(timezone.utc).isoformat()

    for i in range(1, n + 1):
        position = random.choice(POSITIONS)
        exp_level = random.choice(EXPERIENCE_LEVELS)
        company = random.choice(COMPANIES)

        record = {
            "source": "wanted",
            "source_id": f"seed_{i:03d}",
            "title": pick_title(position, company, exp_level),
            "company": company,
            "position": position,
            "experience_level": exp_level,
            "requirements": pick_requirements(position, exp_level),
            "preferred": pick_preferred(position),
            "tech_stack": pick_tech_stack(position),
            "location": random.choice(LOCATIONS),
            "salary_info": random.choice(SALARY_OPTIONS),
            "raw_data": {},
            "crawled_at": now,
        }
        records.append(record)

    return records


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main() -> None:
    print("Supabase 클라이언트 초기화 중...")
    client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("데이터 100건 생성 중...")
    records = generate_records(100)

    print(f"raw_job_postings 테이블에 {len(records)}건 INSERT 중...")

    # 기존 seed 데이터 삭제 (재실행 대비)
    print("  기존 seed 데이터 삭제 중 (source_id: seed_*)...")
    try:
        client.table("raw_job_postings").delete().like("source_id", "seed_%").execute()
        print("  기존 데이터 삭제 완료.")
    except Exception as e:
        print(f"  삭제 중 오류 (무시): {e}")

    # 배치 INSERT
    batch_size = 50
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        client.table("raw_job_postings").insert(batch).execute()
        print(f"  -> {min(i + batch_size, len(records))}/{len(records)} 완료")

    print("\n모든 데이터 삽입 완료!")

    # 샘플 출력
    print("\n[샘플 데이터 5건]")
    for r in records[:5]:
        print(f"  [{r['position']:>12}] {r['company']:15} | {r['title'][:40]}")


if __name__ == "__main__":
    main()
