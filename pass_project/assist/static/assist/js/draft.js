// 초안 관련 기능
App.draft = {
  // 특허 초안 표시 (마크다운 렌더링)
  display(content) {
    const noDraftMessage = document.getElementById('noDraftMessage');
    const draftContent = document.getElementById('draftContent');
    
    if (noDraftMessage) noDraftMessage.style.display = 'none';
    if (draftContent) {
      draftContent.style.display = 'block';
      
      // 기존 textarea 제거하고 마크다운 렌더링 영역 생성
      const existingTextarea = draftContent.querySelector('#draft_text');
      if (existingTextarea) {
        existingTextarea.remove();
      }
      
      const existingMarkdown = draftContent.querySelector('.markdown-content');
      if (existingMarkdown) {
        existingMarkdown.remove();
      }
      
      // 마크다운 컨텐츠 영역 생성
      const markdownDiv = document.createElement('div');
      markdownDiv.className = 'markdown-content';
      markdownDiv.innerHTML = App.utils.convertMarkdownToHTML(content);
      
      // 버튼 행 앞에 삽입
      const buttonRow = draftContent.querySelector('.button-row');
      draftContent.insertBefore(markdownDiv, buttonRow);
      
      // 버튼 상태 초기화
      const normalButtons = document.getElementById('normalButtons');
      const editButtons = document.getElementById('editButtons');
      if (normalButtons) normalButtons.style.display = 'flex';
      if (editButtons) editButtons.style.display = 'none';
    }
    
    App.utils.showNotification('특허 명세서 초안이 마크다운 형식으로 생성되었습니다.');
  },

  // === AI 추천 기능 ===
  requestRecommendation() {
    const currentDraft = App.data.currentDraftContent || '';
    const currentEvaluation = App.data.currentEvaluation || '';
    
    if (!currentDraft.trim()) {
      alert('개선할 명세서가 없습니다.');
      return;
    }
    
    if (!currentEvaluation.trim()) {
      alert('먼저 평가를 실행해주세요.');
      return;
    }
    
    // 추천 요청 실행
    this.executeRecommendation(currentDraft, currentEvaluation);
  },

  executeRecommendation(currentDraft, currentEvaluation) {
    const context = `원본 명세서:\n${currentDraft}\n\n평가 결과:\n${currentEvaluation}`;
    const prompt = this.buildPrompt('PATENT_RECOMMENDATION', context, '');
    const payload = { query: prompt };

    const evaluationContent = document.getElementById('evaluationContent');
    const panelTitle = document.getElementById('eval-header');
    
    if (evaluationContent && panelTitle) {
      // 헤더 변경
      panelTitle.innerHTML = '<div class="panel-title">🤖 추천된 개선 명세서</div>';
      
      evaluationContent.innerHTML = '';
      evaluationContent.style.color = '#FF5A5A'; // 추천 내용 강조

      let fullRecommendationContent = '';

      this.openAssistStreamPost(
        payload,
        token => {
          fullRecommendationContent += token;
          evaluationContent.innerText = fullRecommendationContent;
        },
        () => {
          console.log('추천 완료');
          const finalRecommendation = this.extractFinalContent(fullRecommendationContent);
          
          // 추천 결과 저장
          App.data.currentRecommendation = finalRecommendation;
          
          // 추천 버튼들 표시
          this.showRecommendationButtons();
          
          App.utils.showNotification('개선된 명세서가 생성되었습니다.');
        },
        err => alert('추천 오류: ' + err)
      );
    }
  },

  // 추천 버튼들 표시
  showRecommendationButtons() {
    const container = document.getElementById("after-eval");
    if (!container) return;

    // 기존 버튼들 제거
    container.innerHTML = "";

    // 취소 버튼 (평가로 돌아가기)
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "draft-cancelbutton";
    cancelBtn.innerText = "취소";
    cancelBtn.onclick = () => {
      this.restoreEvaluationView();
    };

    // 재추천 버튼 (같은 평가로 다시 추천)
    const reRecommendBtn = document.createElement("button");
    reRecommendBtn.className = "draft-reRecommentbutton";
    reRecommendBtn.innerText = "재추천";
    reRecommendBtn.onclick = () => {
      const currentDraft = App.data.currentDraftContent || '';
      const currentEvaluation = App.data.currentEvaluation || '';
      this.executeRecommendation(currentDraft, currentEvaluation);
    };

    // 반영 버튼 (추천 내용을 현재 초안으로 적용)
    const applyBtn = document.createElement("button");
    applyBtn.className = "draft-modifybutton";
    applyBtn.style.border = "2px solid white";
    applyBtn.innerText = "반영";
    applyBtn.onclick = () => {
      this.applyRecommendation();
    };

    // 버튼 추가
    container.appendChild(cancelBtn);
    container.appendChild(reRecommendBtn);
    container.appendChild(applyBtn);
  },

  // 평가 화면 복원
  restoreEvaluationView() {
    const evaluationContent = document.getElementById('evaluationContent');
    const panelTitle = document.getElementById('eval-header');
    const container = document.getElementById("after-eval");

    if (panelTitle) {
      panelTitle.innerHTML = '<div class="panel-title">초안에 대한 평가</div>';
    }

    if (evaluationContent) {
      evaluationContent.style.color = ''; // 원래 색상으로 복원
      if (App.data.currentEvaluation) {
        evaluationContent.innerText = App.data.currentEvaluation;
      }
    }

    if (container) {
      container.innerHTML = `
        <button type="button" class="draft-cancelbutton" onclick="App.navigation.backToNormal()">취소</button>
        <button type="button" class="draft-modifybutton" onclick="App.draft.requestRecommendation()">추천</button>
      `;
    }
  },

  // 추천 내용 반영
  applyRecommendation() {
    if (!App.data.currentRecommendation) {
      alert('반영할 추천 내용이 없습니다.');
      return;
    }

    // 현재 초안을 추천 내용으로 교체
    App.data.currentDraftContent = App.data.currentRecommendation;
    
    // 평가 캐시 무효화 (새로운 초안이므로)
    App.data.evaluationCached = false;
    App.data.currentEvaluation = '';
    
    // Draft 패널에 반영
    this.display(App.data.currentRecommendation);
    
    // 일반 화면으로 돌아가기
    const fullPanel = document.getElementById('fullPanelContainer');
    const evaluationLayout = document.getElementById('evaluationLayout');
    
    if (fullPanel && evaluationLayout) {
      fullPanel.style.display = 'flex';
      evaluationLayout.style.display = 'none';
    }
    
    App.utils.showNotification('✅ 추천 내용이 반영되었습니다.');
  },

  // === 기존 기능들 ===
  
  // 저장 기능
  save() {
    // 직접 수정 모드인 경우 textarea의 내용을 가져옴
    const textarea = document.getElementById('draft_text');
    if (textarea) {
      App.data.currentDraftContent = textarea.value;
    }
    
    if (!App.data.currentDraftContent) {
      App.utils.showNotification('저장할 내용이 없습니다.');
      return;
    }

    if (window.CURRENT_TEMPLATE_ID == null) {
      alert('template_id가 없습니다.');
      return;
    }

    console.log("template_id::", window.CURRENT_TEMPLATE_ID);

    let parsedResult = this.parseDraftContent(App.data.currentDraftContent);
    parsedResult['sc_flag'] = 'update';
    parsedResult['create_draft'] = App.data.currentDraftContent;
    parsedResult['template_id'] = window.CURRENT_TEMPLATE_ID;
    
    const now = new Date();
    const timestamp = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0') + '_' + 
      String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0');

    fetch('/assist/insert_patent_report/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': this.getCSRFToken(),
      },
      body: JSON.stringify(parsedResult)
    })
    .then(response => {
      if(!response.ok) {
        throw new Error('서버 응답 오류');
      }
      return response.json();
    })
    .then(data => {
      console.log('서버 응답:',data);
      if(data.status == "error") {
        let errorMsg = data.message;
        App.utils.showNotification(errorMsg);
      } else {
        App.data.currentDraftId = data.draft_id;
        App.utils.showNotification(`특허명세서_${timestamp}로 저장되었습니다.`);
      }
    })
    .catch(error => {
      console.error('저장 중 오류 발생:', error);
      App.utils.showNotification('저장 중 오류가 발생했습니다.');
    })
    
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

    if(currentKey && sections[currentKey]) {
      result[sections[currentKey]] = currentContent.join('\n').trim();
    }

    return result
  },
  
  // 직접 수정 모드 활성화
  enableEdit() {
    const draftContent = document.getElementById('draftContent');
    const markdownContent = draftContent.querySelector('.markdown-content');
    const normalButtons = document.getElementById('normalButtons');
    const editButtons = document.getElementById('editButtons');
    
    if (markdownContent) {
      // 마크다운 렌더링 영역 제거
      markdownContent.remove();
      
      // textarea 생성
      const textarea = document.createElement('textarea');
      textarea.id = 'draft_text';
      textarea.className = 'textarea-input editing';
      textarea.value = App.data.currentDraftContent;
      
      // 버튼 행 앞에 삽입
      const buttonRow = draftContent.querySelector('.button-row');
      draftContent.insertBefore(textarea, buttonRow);
      
      // 버튼 변경
      normalButtons.style.display = 'none';
      editButtons.style.display = 'flex';
      
      textarea.focus();
      App.utils.showNotification('수정 모드가 활성화되었습니다. 자유롭게 편집하세요.');
    }
  },
  
  // 수정 취소
  cancelEdit() {
    const draftContent = document.getElementById('draftContent');
    const textarea = draftContent.querySelector('#draft_text');
    const normalButtons = document.getElementById('normalButtons');
    const editButtons = document.getElementById('editButtons');
    
    if (textarea) {
      // textarea 제거
      textarea.remove();
      
      // 마크다운 컨텐츠 영역 다시 생성
      const markdownDiv = document.createElement('div');
      markdownDiv.className = 'markdown-content';
      markdownDiv.innerHTML = App.utils.convertMarkdownToHTML(App.data.currentDraftContent);
      
      // 버튼 행 앞에 삽입
      const buttonRow = draftContent.querySelector('.button-row');
      draftContent.insertBefore(markdownDiv, buttonRow);
      
      // 버튼 변경
      editButtons.style.display = 'none';
      normalButtons.style.display = 'flex';
      
      App.utils.showNotification('수정이 취소되었습니다.');
    }
  },
  
  // 수정 완료
  saveEdit() {
    const textarea = document.getElementById('draft_text');
    const draftContent = document.getElementById('draftContent');
    const normalButtons = document.getElementById('normalButtons');
    const editButtons = document.getElementById('editButtons');
    
    if (textarea) {
      // 수정된 내용 저장
      App.data.currentDraftContent = textarea.value;
      
      // textarea 제거
      textarea.remove();
      
      // 마크다운 컨텐츠 영역 다시 생성
      const markdownDiv = document.createElement('div');
      markdownDiv.className = 'markdown-content';
      markdownDiv.innerHTML = App.utils.convertMarkdownToHTML(App.data.currentDraftContent);
      
      // 버튼 행 앞에 삽입
      const buttonRow = draftContent.querySelector('.button-row');
      draftContent.insertBefore(markdownDiv, buttonRow);
      
      // 버튼 변경
      editButtons.style.display = 'none';
      normalButtons.style.display = 'flex';
      
      App.utils.showNotification('수정이 완료되었습니다.');
    }
  },
  
  // AI 요청 기능
  requestAI() {
    const requestAIDiv = document.getElementById("activeRequestAI");
    if(requestAIDiv.style.display !== "block"){
        requestAIDiv.style.display = "block";
        const buttonRowDivs = document.getElementsByClassName('button-row');
        for (const div of buttonRowDivs) {
          div.style.paddingTop = "2px";
        }
    } else {
        requestAIDiv.style.display = 'none';
    }
  },
  
  // 다운로드 기능 (모달 열기)
  download() {
    if (App.download) {
      App.download.openModal();
    } else {
      // 백업 다운로드 (모달 모듈이 없는 경우)
      this.fallbackDownload();
    }
  },
  
  // 백업 다운로드 함수
  fallbackDownload() {
    if (!App.data.currentDraftContent) {
      App.utils.showNotification('다운로드할 내용이 없습니다.');
      return;
    }
    
    const now = new Date();
    const timestamp = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0');
    
    // 마크다운 파일로 다운로드
    const blob = new Blob([App.data.currentDraftContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `특허명세서_초안_${timestamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    App.utils.showNotification('특허 명세서가 마크다운 파일로 다운로드되었습니다.');
  },
  
  // === 추천 기능을 위한 헬퍼 함수들 ===
  
  buildPrompt(taskType, context, input) {
    const INFERENCE_INSTRUCTIONS = {
      PATENT_RECOMMENDATION: `평가 결과를 바탕으로 특허 명세서를 개선하여 완전한 명세서를 다시 작성하세요.
기존 구조를 유지하면서 평가에서 지적된 문제점들을 해결하세요.

주의: 한국어로만 구사해주세요.`
    };

    const OUTPUT_FORMATS = {
      PATENT_RECOMMENDATION: `
[발명의 명칭]
(개선된 발명명)

[요약]
(개선된 요약)

[특허청구범위]
청구항 1: (개선된 독립항)
청구항 2: (개선된 종속항)

[기술분야]
(개선된 기술분야)

[배경기술]
(개선된 배경기술)

[해결하려는 과제]
(개선된 과제)

[과제의 해결 수단]
(개선된 해결수단)

[발명의 효과]
(개선된 효과)

[발명을 실시하기 위한 구체적인 내용]
(개선된 구체적 내용)

[도면의 간단한 설명]
(개선된 도면 설명)
`
    };

    const unifiedInferencePrompt = `
Below is a fixed instruction that guides the assistant to work as a Korean patent AI assistant.
The assistant must identify the task type and respond accordingly in Korean.
Think step-by-step before responding.
The final response should be written in Korean and MUST follow the EXACT format specified below.
**Respond in Korean.**

### Task Type: {task_type}

### Instruction:
{instruction}

### Context:
{context}

### Input:
{input}

### REQUIRED OUTPUT FORMAT (FOLLOW EXACTLY):
{output_format}

### Output:
`;

    return unifiedInferencePrompt
      .replace('{task_type}', taskType)
      .replace('{instruction}', INFERENCE_INSTRUCTIONS[taskType])
      .replace('{context}', context || '')
      .replace('{input}', input || '')
      .replace('{output_format}', OUTPUT_FORMATS[taskType]);
  },

  async openAssistStreamPost(payload, onToken, onDone, onError) {
    const ASSIST_STREAM_URL = '/assist/api/qwen/assist-stream/';
    
    try {
      const response = await fetch(ASSIST_STREAM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCSRFToken(),
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          ...payload,
          max_new_tokens: 32768
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';
      let showingOutput = false;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onDone();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onDone();
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'token') {
                fullResponse += parsed.content;
                
                // ### Output: 이후의 내용만 사용자에게 표시
                if (!showingOutput && fullResponse.includes('### Output:')) {
                  showingOutput = true;
                  const outputIndex = fullResponse.indexOf('### Output:') + '### Output:'.length;
                  const outputContent = fullResponse.substring(outputIndex).trim();
                  onToken(outputContent);
                } else if (showingOutput) {
                  onToken(parsed.content);
                }
              } else if (parsed.type === 'error') {
                onError(parsed.message);
                return;
              }
            } catch (e) {
              console.warn('JSON 파싱 오류:', e, data);
            }
          }
        }
      }
    } catch (error) {
      console.error('스트리밍 오류:', error);
      onError(error.message);
    }
  },

  extractFinalContent(fullResponse) {
    if (fullResponse.includes('### Output:')) {
      const outputIndex = fullResponse.indexOf('### Output:') + '### Output:'.length;
      return fullResponse.substring(outputIndex).trim();
    }
    return fullResponse.trim();
  },
  
  getCSRFToken() {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for(let cookie of cookies) {
      const trimmed = cookie.trim();
      if(trimmed.startsWith(name + '=')) {
        return trimmed.substring(name.length + 1);
      }
    }
    
    const metaToken = document.querySelector('meta[name="csrf-token"]');
    if (metaToken) {
      return metaToken.getAttribute('content');
    }
    
    const hiddenToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (hiddenToken) {
      return hiddenToken.value;
    }
    
    return '';
  }
};
