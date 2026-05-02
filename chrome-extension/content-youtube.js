// YouTube 영상 페이지에서 실행 — 제목 아래 "쏙튜브 요약저장" 버튼을 주입합니다.

let currentVideoId = null;
let injected = false;
let retryTimer = null;
let retryCount = 0;
const MAX_RETRY = 10;

function getVideoId() {
  return new URL(window.location.href).searchParams.get('v');
}

// 버튼이 있는 컨테이너를 찾는 함수 — YouTube DOM 구조 변경에 대응
function findTitleContainer() {
  // 최신 YouTube 구조 우선 (2024~2025)
  return (
    document.querySelector('ytd-watch-metadata h1.ytd-watch-metadata') ||
    document.querySelector('#above-the-fold h1') ||
    document.querySelector('ytd-watch-metadata h1') ||
    document.querySelector('#above-the-fold #title h1') ||
    document.querySelector('#above-the-fold #title') ||
    document.querySelector('#title h1') ||
    document.querySelector('h1.title') ||
    document.querySelector('ytd-watch-metadata #title') ||
    null
  );
}

function injectButton() {
  const videoId = getVideoId();
  if (!videoId) return;

  // 같은 영상에 이미 주입됨
  if (injected && currentVideoId === videoId) return;

  const titleEl = findTitleContainer();
  if (!titleEl) {
    // 아직 DOM이 준비 안 됨 — 점진적 재시도 (최대 10회)
    if (retryCount >= MAX_RETRY) return;
    retryCount++;
    if (retryTimer) clearTimeout(retryTimer);
    const delay = retryCount <= 3 ? 800 : retryCount <= 6 ? 1500 : 2500;
    retryTimer = setTimeout(injectButton, delay);
    return;
  }
  retryCount = 0;

  // 이전 버튼 제거 (영상 전환 시)
  document.getElementById('ssoktube-btn-wrap')?.remove();

  currentVideoId = videoId;
  injected = true;

  // ── 버튼 컨테이너 ──
  const wrap = document.createElement('div');
  wrap.id = 'ssoktube-btn-wrap';
  wrap.style.cssText = [
    'display:flex',
    'align-items:center',
    'gap:10px',
    'margin:8px 0 4px',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  ].join(';');

  // ── 버튼 ──
  const btn = document.createElement('button');
  btn.id = 'ssoktube-btn';
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
    <span>쏙튜브 요약저장</span>
  `;
  Object.assign(btn.style, {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 16px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    lineHeight: '1',
    transition: 'background 0.15s',
    whiteSpace: 'nowrap',
  });
  btn.addEventListener('mouseenter', () => { btn.style.background = '#1d4ed8'; });
  btn.addEventListener('mouseleave', () => { if (!btn.disabled) btn.style.background = '#2563eb'; });

  // ── 상태 텍스트 ──
  const status = document.createElement('span');
  status.id = 'ssoktube-status';
  Object.assign(status.style, {
    fontSize: '12px',
    color: '#6b7280',
    transition: 'color 0.2s',
  });

  wrap.appendChild(btn);
  wrap.appendChild(status);
  titleEl.after(wrap);

  // ── 버튼 클릭 핸들러 ──
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;animation:ssoktube-spin 1s linear infinite">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.3"/>
        <path d="M12 2a10 10 0 0 1 10 10"/>
      </svg>
      <span>요약 중...</span>
    `;
    btn.style.background = '#6b7280';
    status.textContent = '최대 2~3분 소요됩니다';
    status.style.color = '#9ca3af';

    // 1분 경과 시 메시지 변경
    const t1 = setTimeout(() => {
      if (btn.disabled) {
        status.textContent = '자막 분석 중... 조금만 더 기다려 주세요';
        status.style.color = '#f59e0b';
      }
    }, 60_000);

    // 3분 경과 시 타임아웃 처리
    const t2 = setTimeout(() => {
      if (btn.disabled) {
        clearTimeout(t1);
        btn.disabled = false;
        btn.innerHTML = `<span>쏙튜브 요약저장</span>`;
        btn.style.background = '#2563eb';
        status.style.color = '#dc2626';
        status.innerHTML = `시간 초과 — <a href="https://www.ssoktube.com/?v=${getVideoId()}" target="_blank" style="color:#2563eb;text-decoration:underline">쏙튜브에서 직접 열기</a>`;
      }
    }, 180_000);

    let response;
    try {
      response = await chrome.runtime.sendMessage({
        type: 'SUMMARIZE_AND_SAVE',
        videoUrl: window.location.href,
      });
    } catch (e) {
      response = { success: false, error: '확장 오류: ' + e.message };
    }

    clearTimeout(t1);
    clearTimeout(t2);
    btn.disabled = false;

    if (response?.success) {
      // 요약 완료 — 기존 버튼 제거 후 새 확인 버튼으로 교체 (이벤트 리스너 완전 제거)
      btn.remove();

      const confirmBtn = document.createElement('button');
      confirmBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>확인하기</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.7">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      `;
      Object.assign(confirmBtn.style, {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 16px',
        background: '#16a34a',
        color: '#fff',
        border: 'none',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        lineHeight: '1',
        whiteSpace: 'nowrap',
      });
      confirmBtn.addEventListener('mouseenter', () => { confirmBtn.style.background = '#15803d'; });
      confirmBtn.addEventListener('mouseleave', () => { confirmBtn.style.background = '#16a34a'; });
      confirmBtn.addEventListener('click', () => {
        window.open(`https://www.ssoktube.com/result/${response.sessionId}`, '_blank');
      });

      wrap.insertBefore(confirmBtn, wrap.firstChild);

      const savedLabel = response.alreadySaved ? '이미 저장된 영상' : (response.saved ? '라이브러리에 저장됨' : '');
      status.textContent = savedLabel;
      status.style.color = '#16a34a';

    } else if (response?.error === 'login_required') {
      btn.innerHTML = `<span>쏙튜브 요약저장</span>`;
      btn.style.background = '#2563eb';
      status.textContent = '⚠ ssoktube.com에 먼저 로그인해 주세요';
      status.style.color = '#dc2626';

    } else {
      btn.innerHTML = `<span>쏙튜브 요약저장</span>`;
      btn.style.background = '#2563eb';
      const msg = response?.error || '알 수 없는 오류';
      status.textContent = `오류: ${msg.slice(0, 40)}`;
      status.style.color = '#dc2626';
    }
  });

  // ── 스피너 CSS ──
  if (!document.getElementById('ssoktube-style')) {
    const style = document.createElement('style');
    style.id = 'ssoktube-style';
    style.textContent = `@keyframes ssoktube-spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
}

function resetAndInject() {
  injected = false;
  currentVideoId = null;
  retryCount = 0;
  document.getElementById('ssoktube-btn-wrap')?.remove();
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(injectButton, 1000);
}

// ── YouTube SPA 네비게이션 감지 ──
document.addEventListener('yt-navigate-finish', resetAndInject);

// ── 초기 로드 ──
if (document.readyState === 'complete') {
  setTimeout(injectButton, 1500);
} else {
  window.addEventListener('load', () => setTimeout(injectButton, 1500));
}
