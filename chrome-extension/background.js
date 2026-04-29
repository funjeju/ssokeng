// Service Worker — API 호출 및 Firebase 토큰 갱신을 담당합니다.

const SSOKTUBE_API = 'https://www.ssoktube.com';

// ─── 토큰 관리 ───────────────────────────────────────────────────────────────

async function getValidToken() {
  const data = await chrome.storage.local.get([
    'ssoktube_uid',
    'ssoktube_access_token',
    'ssoktube_refresh_token',
    'ssoktube_token_expires',
    'ssoktube_api_key',
  ]);

  if (!data.ssoktube_uid) return null;

  // 만료까지 5분 이상 남아있으면 현재 토큰 사용
  const now = Date.now();
  if (data.ssoktube_token_expires && (data.ssoktube_token_expires - now) > 5 * 60 * 1000) {
    return data.ssoktube_access_token;
  }

  // 토큰 만료 → refreshToken으로 갱신
  if (!data.ssoktube_refresh_token || !data.ssoktube_api_key) return null;

  try {
    const res = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${data.ssoktube_api_key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: data.ssoktube_refresh_token,
        }),
      }
    );
    if (!res.ok) return null;

    const json = await res.json();
    const newToken = json.id_token;
    const newRefresh = json.refresh_token;
    const newExpires = Date.now() + parseInt(json.expires_in, 10) * 1000;

    await chrome.storage.local.set({
      ssoktube_access_token: newToken,
      ssoktube_refresh_token: newRefresh,
      ssoktube_token_expires: newExpires,
    });
    return newToken;
  } catch {
    return null;
  }
}

// ─── 요약 + 저장 메인 로직 ────────────────────────────────────────────────────

async function handleSummarizeAndSave(videoUrl) {
  // 1. 토큰 확인
  const token = await getValidToken();
  if (!token) {
    return { success: false, error: 'login_required' };
  }

  // 2. 요약 API 호출 (인증 불필요, 최대 5분 소요)
  let summary;
  try {
    const res = await fetch(`${SSOKTUBE_API}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: videoUrl }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || 'summarize_failed' };
    }

    summary = await res.json();
    if (summary.error) {
      return { success: false, error: summary.error };
    }
  } catch (e) {
    return { success: false, error: '네트워크 오류: ' + e.message };
  }

  // 3. 저장 API 호출 (Bearer 토큰 인증) — 실패해도 sessionId는 반환
  const resultBase = {
    success: true,
    sessionId: summary.sessionId,
    title: summary.title || '',
  };

  try {
    const saveRes = await fetch(`${SSOKTUBE_API}/api/extension/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ sessionId: summary.sessionId }),
    });

    if (!saveRes.ok) {
      // 저장 실패해도 요약 결과는 볼 수 있도록 success: true 유지
      return { ...resultBase, saved: false };
    }

    const saveData = await saveRes.json();
    return { ...resultBase, saved: true, alreadySaved: saveData.alreadySaved || false };
  } catch {
    return { ...resultBase, saved: false };
  }
}

// ─── 메시지 핸들러 ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SUMMARIZE_AND_SAVE') {
    handleSummarizeAndSave(message.videoUrl).then(sendResponse);
    return true; // async response
  }

  if (message.type === 'CHECK_AUTH') {
    chrome.storage.local.get(['ssoktube_uid', 'ssoktube_display_name']).then((data) => {
      sendResponse({
        loggedIn: !!data.ssoktube_uid,
        uid: data.ssoktube_uid || '',
        displayName: data.ssoktube_display_name || '',
      });
    });
    return true;
  }

  if (message.type === 'LOGOUT') {
    chrome.storage.local.remove([
      'ssoktube_uid',
      'ssoktube_display_name',
      'ssoktube_photo_url',
      'ssoktube_access_token',
      'ssoktube_refresh_token',
      'ssoktube_token_expires',
      'ssoktube_api_key',
    ]).then(() => sendResponse({ success: true }));
    return true;
  }
});
