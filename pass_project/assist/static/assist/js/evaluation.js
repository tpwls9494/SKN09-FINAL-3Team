let originalEvaluationHTML = "";
// 평가 관련 기능
App.evaluation = {
  // AI 평가 시작
  start() {
    if (!App.data.currentDraftContent) {
      App.utils.showNotification('평가할 초안이 없습니다.');
      return;
    }
    
    App.utils.showNotification('AI가 특허 명세서를 평가 중입니다...');

    let parsedResult = App.draft.parseDraftContent(App.data.currentDraftContent);
    
    // 레이아웃 전환
    const fullPanel = document.getElementById('fullPanelContainer');
    const evaluationLayout = document.getElementById('evaluationLayout');
    
    if (fullPanel && evaluationLayout) {
      fullPanel.style.display = 'none';
      evaluationLayout.style.display = 'flex';
    }
    
    // 좌측에 마크다운 렌더링
    const leftPanel = evaluationLayout.querySelector('.draft-panel-left .panel-body');
    if (leftPanel) {
      leftPanel.innerHTML = '';
      
      const markdownDiv = document.createElement('div');
      markdownDiv.className = 'markdown-content';
      markdownDiv.innerHTML = App.utils.convertMarkdownToHTML(App.data.currentDraftContent);
      leftPanel.appendChild(markdownDiv);
    }
    
    App.data.isEvaluationMode = true;
    
    // AI 평가 결과 생성 (시뮬레이션)
    setTimeout(() => {
      let html = this.generateResult();

      const evaluationContent = document.getElementById('evaluationContent');
      if (evaluationContent) {
        evaluationContent.innerHTML = html; // 화면 출력
      }

      const sections = document.querySelectorAll('#evaluationContent .evaluation-section');
      const parsedEvaluation = [];

      sections.forEach(section => {
        const title = section.querySelector('h4')?.innerText.trim();
        const score = section.querySelector('.score')?.innerText.trim() || null;
        const items = [...section.querySelectorAll('li')].map(li => li.innerText.trim());
        const paragraph = section.querySelector('p')?.innerText.trim() || null;

        parsedEvaluation.push({
          title,
          score,
          paragraph,
          items
        });
      });

      const jsonString = JSON.stringify(parsedEvaluation);
      parsedResult['content'] = jsonString;

      fetch('/assist/insert_evaluation_result/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': App.draft.getCSRFToken(),
        },
        body: JSON.stringify(parsedResult)
      })
      .then(response => {
        if(!response.ok) {
          throw new Error('서버 응답 오류');
        }
      })
      .then(data => {
        console.log('서버 응답: ', data);
        App.utils.showNotification('AI 평가가 완료되었습니다.');
      })
      .catch(error => {
        console.error("저장 중 오류 발생:", error);
        App.utils.showNotification('저장 중 오류가 발생했습니다.');
      })
     
    }, 2000);

  },

  parseDraftContent(draftText) {
    const sections = {
      '발명의 명칭': 'tech_name',
      '기술분야': 'tech_description',
      '배경기술': null,
      '해결하려는 과제': 'problem_solved',
      '과제의 해결 수단': 'tech_differentation',
      '활용 분야': 'application_field',
      '발명의 효과': null,
      '발명을 실시하기 위한 구체적인 내용': null,
      '주요 구성 요소': 'components_functions',
      '구현 방식': 'implementation_example',
      '특허청구범위': null,
      '도면의 간단한 설명': 'drawing_description',
      '출원인': 'application_info',
      '발명자': 'inventor_info'
    }

    const lines = draftText.split('\n');
    const result = {};

    let currentKey = null;
    let currentContent = [];

    for(let line of lines) {
      const headingMatch = line.match(/^#{1,3}\s*(.+)$/);
      if(headingMatch) {
        const title = headingMatch[1].trim();
        if(sections.hasOwnProperty(title)) {
          if(currentKey=="발명의 명칭") {
            result['tech_title'] = currentContent.join('\n').trim();
          }
          if(currentKey && sections[currentKey]) {
            result[sections[currentKey]] = currentContent.join('\n').trim();
          }
          currentKey = title;
          currentContent = [];
        }
      } else if(line.trim() && currentKey) {
        currentContent.push(line);
      }
    }
  },
  
  // AI 평가 결과 생성
  generateResult() {
    const evaluationContent = document.getElementById('evaluationContent');
    
    if (!evaluationContent) return;
    
    const evaluationHTML = `
      <div class="evaluation-section">
        <h4>📊 전체 평가</h4>
        <div class="score">6/10점</div>
        <p>전반적으로 특허 명세서의 기본 구조는 갖추고 있으나, 일부 보완이 필요한 부분이 있습니다.</p>
      </div>
      
      <div class="evaluation-section">
        <h4>🎯 강점</h4>
        <ul>
          <li>기술 설명이 명확하고 구체적으로 작성되었습니다</li>
          <li>해결하고자 하는 문제가 잘 정의되어 있습니다</li>
          <li>발명의 효과가 체계적으로 설명되었습니다</li>
          <li>청구항의 기본 구조가 적절합니다</li>
        </ul>
      </div>
      
      <div class="evaluation-section">
        <h4>⚠️ 개선사항</h4>
        <div class="score">8/10점</div>
        <ul>
          <li>청구항에서 기술적 특징을 더욱 구체적으로 명시할 필요가 있습니다</li>
          <li>종속 청구항을 추가하여 특허 범위를 확장하는 것을 권장합니다</li>
          <li>배경기술 부분에서 선행기술과의 차이점을 더 명확히 할 필요가 있습니다</li>
          <li>도면 설명이 있다면 더욱 상세한 설명을 추가하는 것이 좋겠습니다</li>
        </ul>
      </div>
      
      <div class="evaluation-section">
        <h4>💡 추천</h4>
        <ul>
          <li><strong>우선순위 1:</strong> 청구항 1에서 핵심 기술 요소를 더 구체적으로 기재</li>
          <li><strong>우선순위 2:</strong> 종속 청구항 2-3개 추가 작성</li>
          <li><strong>우선순위 3:</strong> 실시예 부분에 구체적인 수치나 조건 추가</li>
        </ul>
      </div>
      
      <div class="evaluation-section">
        <h4>📈 품질 지표</h4>
        <ul>
          <li><strong>명확성:</strong> 7/10 - 기술 내용이 대체로 명확하나 일부 보완 필요</li>
          <li><strong>완성도:</strong> 6/10 - 기본 구조는 완성되었으나 세부 내용 보강 필요</li>
          <li><strong>특허성:</strong> 7/10 - 특허로서의 요건을 대체로 만족</li>
          <li><strong>법적 적합성:</strong> 8/10 - 특허법 요건에 대체로 부합</li>
        </ul>
      </div>
      
      <div class="evaluation-section">
        <h4>🔧 구체적 개선 제안</h4>
        <ul>
          <li><strong>청구항 보강:</strong> "상기 시스템은 [구체적 기술요소]를 포함하여..." 형태로 수정</li>
          <li><strong>배경기술 보완:</strong> 기존 기술의 구체적 한계점과 문제점을 수치로 제시</li>
          <li><strong>실시예 확장:</strong> 최소 2개 이상의 구체적 실시예 추가</li>
          <li><strong>도면 연계:</strong> 도면 부호와 설명의 일치성 확인 및 보완</li>
        </ul>
      </div>
    `;

    return evaluationHTML;
  },
  
  // 평가 기준별 점수 계산 (실제 구현 시 사용)
  calculateScores(content) {
    // 실제 AI 평가 로직이 들어갈 부분
    const scores = {
      clarity: this.evaluateClarity(content),
      completeness: this.evaluateCompleteness(content),
      patentability: this.evaluatePatentability(content),
      legalCompliance: this.evaluateLegalCompliance(content)
    };
    
    return scores;
  },
  
  // 명확성 평가
  evaluateClarity(content) {
    // 기술 설명의 명확성을 평가하는 로직
    let score = 5;
    
    // 기본 섹션 존재 여부 확인
    if (content.includes('## 기술분야')) score += 1;
    if (content.includes('## 배경기술')) score += 1;
    if (content.includes('## 해결하려는 과제')) score += 1;
    if (content.includes('## 특허청구범위')) score += 2;
    
    return Math.min(score, 10);
  },
  
  // 완성도 평가
  evaluateCompleteness(content) {
    let score = 4;
    
    // 필수 요소들 확인
    const requiredSections = [
      '발명의 명칭',
      '기술분야',
      '배경기술',
      '해결하려는 과제',
      '과제의 해결 수단',
      '발명의 효과',
      '특허청구범위'
    ];
    
    requiredSections.forEach(section => {
      if (content.includes(section)) score += 1;
    });
    
    return Math.min(score, 10);
  },
  
  // 특허성 평가
  evaluatePatentability(content) {
    let score = 6;
    
    // 신규성 관련 키워드 확인
    if (content.includes('혁신') || content.includes('새로운') || content.includes('개선')) score += 1;
    if (content.includes('차별')) score += 1;
    if (content.includes('효과')) score += 1;
    if (content.includes('해결')) score += 1;
    
    return Math.min(score, 10);
  },
  
  // 법적 적합성 평가
  evaluateLegalCompliance(content) {
    let score = 7;
    
    // 청구항 형식 확인
    if (content.includes('청구항 1')) score += 1;
    if (content.includes('출원인')) score += 1;
    if (content.includes('발명자')) score += 1;
    
    return Math.min(score, 10);
  },

  showRecommendationButtons() {
    const container = document.getElementById("after-eval");

    const panelTitle = document.getElementById('eval-header');
    panelTitle.innerHTML = `<div class="panel-title">재작성된 보고서 초안</div>`


    const draftContent = document.getElementById('draftContent');
    const evaluateContent = document.getElementById('evaluationContent');
    if (!originalEvaluationHTML) {
      originalEvaluationHTML = evaluateContent.innerHTML;
    }
    if (!container) return;

    // 기존 버튼들 제거
    container.innerHTML = "";
    evaluateContent.innerHTML = "";

    if (draftContent ) {
      const markdownDiv = draftContent.querySelector('.markdown-content');
      if (markdownDiv) {
        evaluateContent.innerHTML = markdownDiv.innerHTML;
        evaluateContent.style.color = '#FF5A5A';
      }
    }

    // 반영 버튼
    const applyBtn = document.createElement("button");
    applyBtn.className = "draft-modifybutton";
    applyBtn.style.border = "2px solid white";
    applyBtn.innerText = "반영";
    applyBtn.onclick = function () {
      App.draft.applyRecommendation();
    };

    // 재추천 버튼
    const reRecommendBtn = document.createElement("button");
    reRecommendBtn.className = "draft-reRecommentbutton";
    reRecommendBtn.innerText = "재추천";
    reRecommendBtn.onclick = function () {
      App.draft.retryRecommendation();
    };

    // 취소 버튼
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "draft-cancelbutton";
    cancelBtn.innerText = "취소";
    cancelBtn.onclick = function () {
      App.evaluation.restoreInitialButtons();
    };

    // 버튼 추가
    container.appendChild(cancelBtn);
    container.appendChild(reRecommendBtn);
    container.appendChild(applyBtn);
  },

  restoreInitialButtons() {
    const container = document.getElementById("after-eval");
    const evaluateContent = document.getElementById('evaluationContent');
    const panelTitle = document.getElementById('eval-header');

    if (!container) return;

    if (evaluateContent) {
      evaluateContent.innerHTML = originalEvaluationHTML;
      evaluateContent.style.color = "";  // 원래 색상으로 초기화
    }

    panelTitle.innerHTML = `<div class="panel-title">초안에 대한 평가</div>`;

    container.innerHTML = `
      <button type="button" class="draft-cancelbutton" onclick="App.navigation.backToNormal()">취소</button>
      <button type="button" class="draft-modifybutton" onclick="App.evaluation.showRecommendationButtons()">추천</button>
    `;
  }
};