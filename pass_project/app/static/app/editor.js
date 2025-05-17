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
      let isValid = true;
      
      // 필수 입력 필드 검사
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
        e.preventDefault();
        // 첫 번째 오류 필드로 스크롤
        const firstError = document.querySelector('.input-error');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
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
  const allowedPattern = /^[가-힣a-zA-Z0-9`~!@#$%^&*()_\-+={}[\]\\|<>?/,.]*$/;
  
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