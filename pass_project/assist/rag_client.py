# assist/rag_client.py
import requests
import json
from django.conf import settings
from typing import Dict, List, Optional
import logging
import time
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

class RAGClient:
    def __init__(self):
        # RunPod 서버 URL
        self.base_url = getattr(
            settings, 
            'RAG_SERVER_URL', 
            'http://4gz2mlt3fj6myv-7860.proxy.runpod.net'
        )
        self.timeout = 120  # 타임아웃 줄이기
        self.health_timeout = 10
        
        # 세션 설정 - 재시도 로직
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
    
    def health_check(self) -> Dict:
        """RAG 서버 상태 확인"""
        try:
            response = self.session.get(
                f"{self.base_url}/api/health",
                timeout=self.health_timeout,
                verify=False
            )
            response.raise_for_status()
            result = response.json()
            logger.info(f"RAG 서버 헬스체크 성공: {result}")
            return result
        except requests.exceptions.RequestException as e:
            logger.error(f"RAG 서버 헬스체크 실패: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def generate_answer(
        self, 
        query: str, 
        max_new_tokens: int = 512, 
        top_k: int = 5, 
        temperature: float = 0.7
    ) -> Dict:
        """RAG를 사용한 답변 생성"""
        try:
            payload = {
                "query": query,
                "max_new_tokens": max_new_tokens,
                "top_k": top_k,
                "temperature": temperature
            }
            
            logger.info(f"RAG 요청 시작: {query[:100]}...")
            start_time = time.time()
            
            response = self.session.post(
                f"{self.base_url}/api/rag/generate",
                json=payload,
                timeout=self.timeout,
                verify=False
            )
            response.raise_for_status()
            
            result = response.json()
            elapsed_time = time.time() - start_time
            
            logger.info(f"RAG 응답 완료 (소요시간: {elapsed_time:.2f}초)")
            return result
            
        except requests.exceptions.Timeout:
            logger.error("RAG 요청 타임아웃")
            return {
                "status": "error",
                "message": "요청 처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.",
                "answer": "죄송합니다. 요청 처리 시간이 초과되었습니다.",
                "relevant_documents": [],
                "context_used": 0,
                "query": query
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"RAG 생성 요청 실패: {str(e)}")
            return {
                "status": "error",
                "message": f"AI 서비스 연결 실패: {str(e)}",
                "answer": "죄송합니다. 현재 AI 서비스에 일시적인 문제가 발생했습니다.",
                "relevant_documents": [],
                "context_used": 0,
                "query": query
            }
        except Exception as e:
            logger.error(f"예상치 못한 오류: {str(e)}")
            return {
                "status": "error",
                "message": f"예상치 못한 오류: {str(e)}",
                "answer": "죄송합니다. 시스템 오류가 발생했습니다.",
                "relevant_documents": [],
                "context_used": 0,
                "query": query
            }

# 싱글톤 인스턴스
rag_client = RAGClient()