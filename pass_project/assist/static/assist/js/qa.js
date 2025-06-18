// Q&A 관련 기능 - 안전한 초기화
(function() {
  'use strict';
  
  // App 객체가 없으면 생성
  if (!window.App) {
    window.App = {};
  }
  
  // App.utils가 없으면 기본 함수 생성
  if (!window.App.utils) {
    window.App.utils = {
      showNotification: function(message) {
        console.log('Notification:', message);
        alert(message); // 임시 대체
      },
      
      getCSRFToken: function() {
        const c = document.cookie.split(';').find(r => r.trim().startsWith('csrftoken='));
        if (c) return c.split('=')[1];

        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) return meta.getAttribute('content');

        const input = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (input) return input.value;

        return '';
      }
    };
  }
  
  // Q&A 기능 정의
  window.App.qa = {
    /* 초기화 */
    init() {
      this.resetLayout();
      this.bindEvents();
    },

    /* 엔터키 전송 등 이벤트 */
    bindEvents() {
      const first = document.getElementById('qaInput');
      if (first) {
        first.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.sendQuestion();
          }
        });
      }

      const follow = document.getElementById('qaInputResponse');
      if (follow) {
        follow.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.sendFollowupQuestion();
          }
        });
      }
    },

    /* 초기 레이아웃으로 되돌리기 */
    resetLayout() {
      const qaInitial  = document.getElementById('qaInitial');
      const qaResponse = document.getElementById('qaResponse');
      const qaInput    = document.getElementById('qaInput');

      if (qaInitial)  qaInitial.style.display  = 'flex';
      if (qaResponse) qaResponse.style.display = 'none';
      if (qaInput)    qaInput.value = '';
    },

    /* 추천 질문 클릭 시 */
    setQuestion(question) {
      const qaInput = document.getElementById('qaInput');
      if (qaInput) {
        qaInput.value = question;
        qaInput.focus();
      }
    },

    /* 공통 fetch 래퍼 */
    async postQuestion(question) {
      const res = await fetch('/assist/api/qa/ask/', {
        method : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken' : getCSRFToken()
        },
        body   : JSON.stringify({ question })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },

    /* 최초 질문 전송 */
    async sendQuestion() {
      const qaInput = document.getElementById('qaInput');
      const question = (qaInput?.value || '').trim();

      if (!question) {
        window.App.utils.showNotification('질문을 입력해주세요.');
        return;
      }

      window.App.utils.showNotification('AI가 답변을 생성하고 있습니다...');

      try {
        const result = await this.postQuestion(question);
        if (result.success) {
          this.showAnswer(question, result.answer);
        } else {
          window.App.utils.showNotification(result.message);
        }
      } catch (err) {
        console.error('Network error', err);
        window.App.utils.showNotification('네트워크 오류가 발생했습니다.');
      }
    },

    /* 후속 질문 전송 */
    async sendFollowupQuestion() {
      const qaInputResponse = document.getElementById('qaInputResponse');
      const question = (qaInputResponse?.value || '').trim();

      if (!question) {
        window.App.utils.showNotification('추가 질문을 입력해주세요.');
        return;
      }

      window.App.utils.showNotification('AI가 답변을 생성하고 있습니다...');

      try {
        const result = await this.postQuestion(question);
        if (result.success) {
          this.addFollowupAnswer(question, result.answer);
          qaInputResponse.value = '';
        } else {
          window.App.utils.showNotification(result.message);
        }
      } catch (err) {
        console.error('Network error', err);
        window.App.utils.showNotification('네트워크 오류가 발생했습니다.');
      }
    },

    /* 최초 답변 출력 */
    showAnswer(question, answer) {
      const qaInitial  = document.getElementById('qaInitial');
      const qaResponse = document.getElementById('qaResponse');
      const userQuestion = document.getElementById('userQuestion');
      const aiAnswer     = document.getElementById('aiAnswer');

      if (qaInitial)  qaInitial.style.display  = 'none';
      if (qaResponse) qaResponse.style.display = 'flex';

      if (userQuestion) {
        const qText = userQuestion.querySelector('.question-text');
        if (qText) qText.textContent = question;
        else       userQuestion.textContent = question;
      }

      if (aiAnswer) aiAnswer.innerHTML = answer;

      window.App.utils.showNotification('답변이 완료되었습니다.');
    },

    /* 후속 답변 추가 */
    addFollowupAnswer(question, answer) {
      const conv = document.querySelector('.qa-conversation');
      if (!conv) return;

      const qBox = document.createElement('div');
      qBox.className = 'user-question-box';
      qBox.innerHTML = `
        <div class="question-icon">질문 내용</div>
        <div class="question-text">${question}</div>
      `;

      const aBox = document.createElement('div');
      aBox.className = 'ai-answer-box';
      aBox.innerHTML = `
        <h4 class="answer-title">답변</h4>
        <div class="ai-answer">${answer}</div>
      `;

      conv.appendChild(qBox);
      conv.appendChild(aBox);
      conv.scrollTop = conv.scrollHeight;

      window.App.utils.showNotification('추가 답변이 완료되었습니다.');
    }
  };
  
  // 페이지 로드 시 초기화
  document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('qaLayout')) {
      window.App.qa.init();
    }
  });
})();
