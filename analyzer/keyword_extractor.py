"""
keyword_extractor.py
정규식 기반 기술 키워드 추출기.
알려진 기술스택 사전(한글 포함)을 내장하며, keyword_mappings 동의어 사전으로 정규화한다.
"""

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 내장 기술스택 사전
# 각 항목: (정규화 표준명, [매칭 패턴 리스트])
# 패턴은 대소문자 무시(re.IGNORECASE)로 검색된다.
# ---------------------------------------------------------------------------
_RAW_TECH_DICT: list[tuple[str, list[str]]] = [
    # Frontend Frameworks
    ("React",           ["react\\.js", "reactjs", "react", "리액트"]),
    ("Vue",             ["vue\\.js", "vuejs", "vue", "뷰\\.?js", "뷰"]),
    ("Angular",         ["angular\\.js", "angularjs", "angular", "앵귤러"]),
    ("Next.js",         ["next\\.js", "nextjs", "넥스트\\.?js"]),
    ("Nuxt.js",         ["nuxt\\.js", "nuxtjs"]),
    ("Svelte",          ["svelte"]),
    ("Remix",           ["remix"]),
    # Languages
    ("JavaScript",      ["javascript", "자바스크립트", "js(?=\\b)"]),
    ("TypeScript",      ["typescript", "타입스크립트", "ts(?=\\b)"]),
    ("Python",          ["python", "파이썬"]),
    ("Java",            ["java(?!script)", "자바(?!스크립트)"]),
    ("Kotlin",          ["kotlin", "코틀린"]),
    ("Swift",           ["swift"]),
    ("Go",              ["golang", "go(?=\\b)"]),
    ("Rust",            ["rust(?!\\s*belt)"]),
    ("C++",             ["c\\+\\+", "cpp"]),
    ("C#",              ["c#", "c sharp", "csharp"]),
    ("PHP",             ["php"]),
    ("Ruby",            ["ruby(?!\\s+on\\s+rails)"]),
    ("Scala",           ["scala"]),
    # Backend Frameworks
    ("Spring",          ["spring\\s*boot", "spring\\s*framework", "spring"]),
    ("Node.js",         ["node\\.js", "nodejs", "node(?=\\b)", "노드\\.?js"]),
    ("Express",         ["express\\.js", "expressjs", "express(?=\\b)"]),
    ("FastAPI",         ["fastapi"]),
    ("Django",          ["django"]),
    ("Flask",           ["flask"]),
    ("NestJS",          ["nest\\.js", "nestjs"]),
    ("Rails",           ["ruby\\s+on\\s+rails", "rails(?=\\b)"]),
    ("Laravel",         ["laravel"]),
    # Databases
    ("MySQL",           ["mysql", "마이에스큐엘"]),
    ("PostgreSQL",      ["postgresql", "postgres(?=\\b)", "포스트그레스"]),
    ("MongoDB",         ["mongodb", "mongo(?=\\b)", "몽고\\.?db"]),
    ("Redis",           ["redis", "레디스"]),
    ("Elasticsearch",   ["elasticsearch", "elastic\\s*search"]),
    ("Oracle",          ["oracle\\s*db", "oracle(?=\\b)"]),
    ("SQLite",          ["sqlite"]),
    ("DynamoDB",        ["dynamodb"]),
    ("Cassandra",       ["cassandra"]),
    ("MariaDB",         ["mariadb"]),
    # Cloud & Infrastructure
    ("AWS",             ["aws", "amazon\\s*web\\s*services"]),
    ("GCP",             ["gcp", "google\\s*cloud(?:\\s*platform)?"]),
    ("Azure",           ["azure", "microsoft\\s*azure"]),
    ("Docker",          ["docker", "도커"]),
    ("Kubernetes",      ["kubernetes", "k8s", "쿠버네티스"]),
    ("Terraform",       ["terraform"]),
    ("Ansible",         ["ansible"]),
    # CI/CD & DevOps
    ("CI/CD",           ["ci/cd", "ci\\s*/\\s*cd", "cicd"]),
    ("Jenkins",         ["jenkins"]),
    ("GitHub Actions",  ["github\\s*actions"]),
    ("GitLab CI",       ["gitlab\\s*ci(?:/cd)?"]),
    ("ArgoCD",          ["argocd", "argo\\s*cd"]),
    # Version Control
    ("Git",             ["git(?!hub|lab)(?=\\b)", "깃"]),
    ("GitHub",          ["github", "깃허브"]),
    ("GitLab",          ["gitlab"]),
    # API & Communication
    ("REST API",        ["rest\\s*api", "restful\\s*api", "restful", "레스트\\.?api"]),
    ("GraphQL",         ["graphql", "그래프\\.?ql"]),
    ("gRPC",            ["grpc"]),
    ("WebSocket",       ["websocket", "web\\s*socket"]),
    # Frontend Tooling & Styling
    ("Tailwind",        ["tailwind(?:\\s*css)?", "테일윈드"]),
    ("Sass/SCSS",       ["sass", "scss"]),
    ("Webpack",         ["webpack"]),
    ("Vite",            ["vite(?=\\b)"]),
    # Mobile
    ("React Native",    ["react\\s*native"]),
    ("Flutter",         ["flutter"]),
    # Testing
    ("Jest",            ["jest(?=\\b)"]),
    ("Cypress",         ["cypress"]),
    ("Selenium",        ["selenium"]),
    ("Pytest",          ["pytest"]),
    # Design / Collaboration
    ("Figma",           ["figma", "피그마"]),
    ("Jira",            ["jira"]),
    ("Confluence",      ["confluence"]),
    # Message Queue
    ("Kafka",           ["kafka", "아파치\\s*카프카"]),
    ("RabbitMQ",        ["rabbitmq"]),
    # ML / Data
    ("TensorFlow",      ["tensorflow"]),
    ("PyTorch",         ["pytorch"]),
    ("Pandas",          ["pandas(?=\\b)"]),
    ("NumPy",           ["numpy"]),
    ("Spark",           ["apache\\s*spark", "spark(?=\\b)"]),
    # Monitoring
    ("Prometheus",      ["prometheus"]),
    ("Grafana",         ["grafana"]),
]

# 컴파일된 패턴 캐시: {표준명: compiled_pattern}
_COMPILED: dict[str, re.Pattern] = {}


def _build_patterns() -> None:
    """_RAW_TECH_DICT 를 한 번만 컴파일해 _COMPILED 에 저장."""
    for canonical, patterns in _RAW_TECH_DICT:
        combined = "|".join(f"(?:{p})" for p in patterns)
        _COMPILED[canonical] = re.compile(combined, re.IGNORECASE)


_build_patterns()


class KeywordExtractor:
    """
    텍스트에서 기술 키워드를 추출하고 synonym_map 으로 정규화한다.

    Parameters
    ----------
    synonym_map : dict[str, str], optional
        {원본 키워드: 표준 키워드} 매핑 (keyword_mappings 테이블에서 로드).
    """

    def __init__(self, synonym_map: Optional[dict[str, str]] = None) -> None:
        self.synonym_map: dict[str, str] = synonym_map or {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def extract(self, text: str) -> list[str]:
        """
        텍스트에서 기술 키워드를 추출해 중복 제거 후 정렬된 리스트로 반환.
        synonym_map 이 설정되어 있으면 정규화를 적용한다.
        """
        if not text or not isinstance(text, str):
            return []

        found: set[str] = set()
        for canonical, pattern in _COMPILED.items():
            if pattern.search(text):
                found.add(canonical)

        normalized: set[str] = set()
        for kw in found:
            normalized.add(self._normalize(kw))

        return sorted(normalized)

    def extract_multi(
        self,
        requirements: Optional[str],
        preferred: Optional[str],
        tech_stack: Optional[str],
    ) -> dict[str, list[str]]:
        """
        세 컬럼을 각각 추출해 {'requirements': [...], 'preferred': [...], 'tech_stack': [...]} 반환.
        합집합도 'all' 키로 포함한다.
        """
        req_kw = self.extract(requirements or "")
        pref_kw = self.extract(preferred or "")
        tech_kw = self.extract(tech_stack or "")
        all_kw = sorted(set(req_kw) | set(pref_kw) | set(tech_kw))
        return {
            "requirements": req_kw,
            "preferred": pref_kw,
            "tech_stack": tech_kw,
            "all": all_kw,
        }

    def apply_synonym_map(self, keywords: list[str]) -> list[str]:
        """키워드 리스트에 synonym_map 을 적용해 정규화된 리스트 반환."""
        return sorted({self._normalize(kw) for kw in keywords})

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _normalize(self, keyword: str) -> str:
        return self.synonym_map.get(keyword, keyword)
