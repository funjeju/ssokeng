// ssoktube.com 페이지에서 실행 — Firebase 토큰을 캡처해서 chrome.storage에 저장합니다.

// injected.js를 페이지 메인 월드에 주입 (localStorage 접근을 위해 필요)
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
(document.head || document.documentElement).appendChild(script);
script.onload = () => script.remove();

// injected.js에서 postMessage로 전달된 토큰 수신
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== 'SSOKTUBE_EXT_TOKEN') return;

  const { uid, displayName, photoURL, accessToken, refreshToken, expirationTime, apiKey } = event.data;
  if (!uid || !accessToken) return;

  chrome.storage.local.set({
    ssoktube_uid: uid,
    ssoktube_display_name: displayName,
    ssoktube_photo_url: photoURL,
    ssoktube_access_token: accessToken,
    ssoktube_refresh_token: refreshToken,
    ssoktube_token_expires: expirationTime,
    ssoktube_api_key: apiKey,
  });

  console.log('[쏙튜브 확장] 로그인 정보 저장 완료 ✅', uid);
});
