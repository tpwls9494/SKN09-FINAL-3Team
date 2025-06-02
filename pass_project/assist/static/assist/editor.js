let generateDraftTimeout = null;
document.addEventListener('DOMContentLoaded', function() {
  // 글자 수 카운팅 기능
  const textInputs = document.querySelectorAll('.text-input, .textarea-input');
  
  textInputs.forEach(input => {
    input.addEventListener('input', function() {
      updateCharCounter(this);
      validateInput(this);
    });
    
    // 초기 글자 수 표시
    updateCharCounter(input);
  });
  
  // 파일 업로드 기능
  const fileInput = document.getElementById('drawing-upload');
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      handleFileSelect(this);
    });
  }
  
  // 양식 유효성 검사
  const templateForm = document.getElementById('templateForm');
  if (templateForm) {
    templateForm.addEventListener('submit', function(e) {
      // 폼 제출 방지
      e.preventDefault();
      
      // 폼 검증 로직 유지 (이미 있는 코드)
      let isValid = true;
      const requiredInputs = document.querySelectorAll('[required]');
      requiredInputs.forEach(input => {
        if (!input.value.trim()) {
          showError(input, `${getFieldName(input)} 항목을 입력해주세요.`);
          isValid = false;
        } else if (input.type !== 'file' && !validateInput(input)) {
          isValid = false;
        }
      });
      
      if (!isValid) {
        // 첫 번째 오류 필드로 스크롤
        const firstError = document.querySelector('.input-error');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return; // 유효성 검사 실패 시 여기서 중단
      }
      
      // 로딩 오버레이 표시
      showLoadingOverlay();
      
      // 1분 40초(100초) 후에 특허 초안 생성
      generateDraftTimeout = setTimeout(function() {
        generateFixedDraft();
      }, 100000);
    });
  }
});

// 글자 수 업데이트
function updateCharCounter(input) {
  const counter = input.nextElementSibling;
  if (counter && counter.classList.contains('char-counter')) {
    const currentCount = input.value.length;
    const maxLength = input.getAttribute('maxlength');
    
    const countDisplay = counter.querySelector('.current-count');
    if (countDisplay) {
      countDisplay.textContent = currentCount;
    }
    
    // 글자 수 제한에 가까워지면 강조
    if (currentCount >= maxLength * 0.9) {
      counter.classList.add('limit-reached');
    } else {
      counter.classList.remove('limit-reached');
    }
  }
}

// 파일 선택 처리
function handleFileSelect(input) {
  const fileInfo = input.parentNode.querySelector('.file-info');
  const filePreview = input.parentNode.querySelector('.file-preview');
  
  // 이전 미리보기 제거
  if (filePreview) {
    filePreview.remove();
  }
  
  if (input.files && input.files[0]) {
    const file = input.files[0];
    fileInfo.textContent = `선택된 파일: ${file.name} (${formatFileSize(file.size)})`;
    
    // 미리보기 컨테이너 생성
    const previewContainer = document.createElement('div');
    previewContainer.className = 'file-preview';
    
    if (file.type === 'application/pdf') {
      // PDF 미리보기
      const iframe = document.createElement('iframe');
      iframe.src = URL.createObjectURL(file);
      previewContainer.appendChild(iframe);
    } else if (file.type.startsWith('image/')) {
      // 이미지 미리보기
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.onload = function() {
        URL.revokeObjectURL(this.src);
      };
      previewContainer.appendChild(img);
    }
    
    input.parentNode.appendChild(previewContainer);
  } else {
    fileInfo.textContent = '';
  }
}

// 파일 크기 포맷팅
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 입력 유효성 검증
function validateInput(input) {
  // 입력 제한 패턴 (한국어, 영어, 허용된 특수문자)
  const allowedPattern = /^[ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9`~!@#$%^&*()_\-+=:{}[\]\\\n|<>?/,. ]*$/;
  
  if (input.value && !allowedPattern.test(input.value)) {
    showError(input, "허용되지 않는 문자가 포함되어 있습니다. 한국어, 영어, 지정된 특수문자만 입력 가능합니다.");
    return false;
  } else {
    clearError(input);
    return true;
  }
}

// 오류 메시지 표시
function showError(element, message) {
  // 이미 오류 표시가 있으면 제거
  clearError(element);
  
  // 오류 스타일 적용
  element.classList.add('input-error');
  
  // 오류 메시지 추가
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  
  // 글자 수 카운터 다음에 오류 메시지 삽입
  const parent = element.parentNode;
  if (parent.classList.contains('select-wrapper')) {
    parent.insertAdjacentElement('afterend', errorDiv);
  } else {
    const counter = element.nextElementSibling;
    if (counter && counter.classList.contains('char-counter')) {
      counter.insertAdjacentElement('afterend', errorDiv);
    } else {
      element.insertAdjacentElement('afterend', errorDiv);
    }
  }
}

// 오류 메시지 제거
function clearError(element) {
  element.classList.remove('input-error');
  
  // 기존 오류 메시지 제거
  const parent = element.parentNode;
  const errorMessages = parent.parentNode.querySelectorAll('.error-message');
  errorMessages.forEach(msg => {
    msg.parentNode.removeChild(msg);
  });
}

// 필드 이름 가져오기
function getFieldName(input) {
  const section = input.closest('.input-section');
  if (section) {
    const titleElement = section.querySelector('.section-title');
    if (titleElement) {
      return titleElement.textContent;
    }
  }
  
  // 사람 정보 필드인 경우
  if (input.closest('.person-info-row')) {
    const label = input.closest('.person-info-row').querySelector('label');
    if (label) {
      const section = input.closest('.input-section');
      const titleElement = section.querySelector('.section-title');
      return `${titleElement ? titleElement.textContent : '정보'} - ${label.textContent}`;
    }
  }
  
  return "이 필드";
}

// 수정 모드 활성화
function enableEdit() {
  const textarea = document.getElementById('draft_text');
  if (textarea) {
    textarea.removeAttribute('readonly');
    textarea.style.backgroundColor = '#fffde7';
    textarea.focus();
    
    // 알림 표시
    showNotification('수정 모드가 활성화되었습니다.');
  }
}

// 알림 표시 함수
function showNotification(message) {
  // 기존 알림이 있으면 제거
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    document.body.removeChild(existingNotification);
  }
  
  // 알림 요소 생성
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  
  // 스타일 설정
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.backgroundColor = '#333';
  notification.style.color = 'white';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '5px';
  notification.style.zIndex = '1000';
  
  // 문서에 추가
  document.body.appendChild(notification);
  
  // 일정 시간 후 제거
  setTimeout(function() {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    
    setTimeout(function() {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}

// 로딩 오버레이 생성 함수
function showLoadingOverlay() {
  // 이미 존재하는 오버레이 제거
  removeLoadingOverlay();
  
  // 새 오버레이 생성
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.zIndex = '9999';
  
  // 로딩 스피너
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  spinner.style.width = '50px';
  spinner.style.height = '50px';
  spinner.style.border = '5px solid #f3f3f3';
  spinner.style.borderTop = '5px solid #3498db';
  spinner.style.borderRadius = '50%';
  spinner.style.animation = 'spin 1s linear infinite';
  
  // 애니메이션 스타일 추가
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
  
  // 메시지 텍스트
  const message = document.createElement('div');
  message.style.color = 'white';
  message.style.marginTop = '20px';
  message.style.fontSize = '18px';
  message.style.fontWeight = 'bold';
  message.textContent = '특허 초안이 생성중입니다.';
  
  // 취소 버튼
  const cancelButton = document.createElement('button');
  cancelButton.textContent = '취소';
  cancelButton.style.marginTop = '20px';
  cancelButton.style.padding = '8px 16px';
  cancelButton.style.backgroundColor = '#e74c3c';
  cancelButton.style.color = 'white';
  cancelButton.style.border = 'none';
  cancelButton.style.borderRadius = '4px';
  cancelButton.style.cursor = 'pointer';
  
  cancelButton.addEventListener('click', function() {
    // setTimeout 취소
    if (generateDraftTimeout) {
      clearTimeout(generateDraftTimeout);
      generateDraftTimeout = null;
    }
    
    // 오버레이 제거
    removeLoadingOverlay();
    
    // 취소 메시지 표시
    showNotification('특허 초안 생성이 취소되었습니다.');
  });
  
  // 요소 조합
  overlay.appendChild(spinner);
  overlay.appendChild(message);
  overlay.appendChild(cancelButton);
  
  // 문서에 추가
  document.body.appendChild(overlay);
}

// 로딩 오버레이 제거 함수
function removeLoadingOverlay() {
  const existingOverlay = document.getElementById('loading-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
}

// 고정된 특허 초안 생성 함수
function generateFixedDraft() {
  const fixedPatentDraft = "【발명의 명칭】  \n공유자원을 이용한 인공지능 공동연구 시스템  \n{AI Collaborative Research System Using Shared Resources}\n\n【기술분야】  \n본 발명은 인공지능(AI) 공동연구 분야에 관한 것으로, 여러 연구자가 공유자원을 기반으로 효율적으로 협업할 수 있는 시스템을 제공합니다. 이 기술은 데이터 수집, 표준화된 연구환경 관리, 실시간 데이터 공유 등의 기능을 포함하여, 연구자들이 보다 유연하고 협업 중심의 연구 환경을 구축할 수 있도록 지원합니다.\n\n【배경기술】  \n기존의 인공지능 연구 환경에서는 연구자들이 개별적으로 서버를 구축하고 데이터를 관리해야 했으며, 이로 인해 데이터 공유 및 협업의 효율성이 떨어졌습니다. 또한, 데이터 형식의 불일치로 인해 연구자 간의 통합 및 협업이 어려웠습니다. 이러한 한계를 극복하기 위해, 본 발명은 공유자원을 기반으로 한 협업형 인공지능 연구 환경을 제공함으로써 연구의 효율성을 높이는 필요성이 대두되었습니다.\n\n【해결하려는 과제】  \n기존 기술은 데이터 공유 및 연구 환경의 표준화에 한계가 있었으며, 이로 인해 연구자 간의 협업이 어려웠습니다. 본 발명은 이러한 문제를 해결하기 위해 데이터의 일관성을 유지하고 실시간으로 공유할 수 있는 시스템을 제공하여, 연구자들이 보다 효율적으로 협업할 수 있도록 지원합니다. 또한, 제한된 자원에서도 최적의 연구 결과를 도출할 수 있는 환경을 조성하는 것이 주요 과제입니다.\n\n【과제의 해결 수단】  \n본 발명은 데이터관리유닛, 표준환경관리유닛, 연구환경관리유닛 및 자원관리유닛으로 구성되어, 연구자들이 필요한 연구환경을 자동으로 생성하고 표준화된 데이터를 관리할 수 있도록 합니다. 또한, 실시간 모니터링 및 데이터 공유 기능을 통해 협업을 강화하며, 자원의 효율적인 관리로 인해 연구자들이 보다 유연하게 작업할 수 있도록 지원합니다. 이러한 구조는 기존의 분산 서버 기반 연구 방식을 혁신적으로 개선합니다.\n\n【발명의 효과】  \n본 발명은 데이터 수집 및 가공 과정의 자동화를 통해 시간과 자원을 절약할 수 있으며, 연구자 간의 협업 효율성을 극대화합니다. 또한, 표준화된 연구환경 제공으로 인해 데이터 형식의 불일치를 방지하고, 연구자들이 개별적으로 구축해야 했던 환경을 통합하여 제공함으로써, 인공지능 연구 분야의 혁신을 가속화할 수 있는 기술적 효과를 제공합니다.\n\n【발명을 실시하기 위한 구체적인 내용】  \n본 발명은 데이터관리유닛, 표준환경관리유닛, 연구환경관리유닛 및 자원관리유닛으로 구성되어 있으며, 각 유닛은 특정 기능을 수행합니다. 데이터관리유닛은 외부 데이터를 수집하고 가공하여 저장하며, 표준환경관리유닛은 연구환경의 기반을 제공합니다. 연구환경관리유닛은 인공지능 연산을 요청하고, 자원관리유닛은 연구자에게 필요한 자원을 할당합니다. 이러한 구조는 연구자들이 실시간으로 데이터를 공유하고 협업할 수 있도록 하며, 시스템의 효율성을 극대화합니다.\n\n【도면의 간단한 설명】  \n도면은 본 발명의 인공지능 공동연구 시스템의 구성 요소를 시각적으로 표현하고 있으며, 각 유닛 간의 연동 방식을 보여줍니다. 데이터관리유닛, 표준환경관리유닛, 연구환경관리유닛 및 자원관리유닛의 상호작용을 통해 연구자들이 협업할 수 있는 구조를 설명합니다.\n\n【특허청구범위】  \n1. 공유자원을 이용한 인공지능 공동연구 시스템은 데이터관리유닛, 표준환경관리유닛, 연구환경관리유닛 및 자원관리유닛으로 구성되며, 이 유닛들은 연구자들이 공유자원을 기반으로 효율적으로 협업할 수 있도록 하는 기능을 수행하는 것을 특징으로 합니다.  \n2. 제1항에 기술된 시스템에서, 데이터관리유닛은 외부 데이터를 수집하고 가공하여 저장하며, 표준환경관리유닛은 연구환경의 기반을 제공하는 것을 포함합니다.  \n3. 제1항에 기술된 시스템에서, 연구환경관리유닛은 인공지능 연산을 요청하고, 자원관리유닛은 연구자에게 필요한 자원을 할당하는 것을 포함합니다.  \n4. 제1항에 기술된 시스템에서, 데이터관리유닛은 메타데이터를 통해 데이터를 접근할 수 있도록 하는 기능을 포함합니다.  \n5. 제1항에 기술된 시스템에서, 표준환경관리유닛은 연구자들이 필요에 따라 표준환경을 생성 및 관리할 수 있도록 하는 기능을 포함합니다.  \n\n※ 본 특허청구범위는 특허법 제42조 제2~5항 및 시행규칙 제21조에 따라 작성되었습니다.  \n※ 모든 기술적 내용은 모범명세서 가이드에 따라 체계적으로 기술되어 있습니다.";

  // 오른쪽 패널의 draft_text 요소를 찾거나 생성
  let draftText = document.getElementById('draft_text');
  if (!draftText) {
    // 결과 패널에 내용이 없는 경우, 필요한 요소 생성
    const resultPanel = document.querySelector('.result-panel .panel-body');
    if (resultPanel) {
      resultPanel.innerHTML = `
        <form method="post">
          <input type="hidden" name="csrfmiddlewaretoken" value="${document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''}">
          <input type="hidden" name="draft_id" value="demo_draft">
          <textarea name="draft_text" id="draft_text" class="textarea-input" readonly>${fixedPatentDraft}</textarea>
          
          <div class="button-row">
            <button type="button" onclick="enableEdit()" class="btn btn-secondary">직접 수정</button>
            <button type="submit" name="save_draft" class="btn btn-primary">저장</button>
          </div>
        </form>
      `;
    }
  } else {
    // 이미 요소가 존재하는 경우, 내용만 업데이트
    draftText.value = fixedPatentDraft;
  }
  
  // 로딩 오버레이 제거
  removeLoadingOverlay();
  
  // 성공 메시지 표시
  showNotification('특허 초안이 생성되었습니다.');
}