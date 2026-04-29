const statusBox = document.getElementById('status-box');
const hintEl = document.getElementById('hint');
const logoutBtn = document.getElementById('logout-btn');

chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, (response) => {
  if (response?.loggedIn) {
    statusBox.className = 'status-box ok';
    statusBox.innerHTML = `✓ 로그인됨${response.displayName ? ': <strong>' + response.displayName + '</strong>' : ''}
      <div class="uid">${response.uid}</div>`;
    hintEl.textContent = 'YouTube 영상 페이지를 열면 제목 아래에 버튼이 나타납니다.';
    logoutBtn.style.display = 'block';
  } else {
    statusBox.className = 'status-box warn';
    statusBox.textContent = '⚠ 로그인이 필요합니다';
    hintEl.textContent = '쏙튜브(ssoktube.com)에 로그인한 뒤 YouTube로 돌아오세요. 자동으로 인식됩니다.';
  }
});

logoutBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
    statusBox.className = 'status-box warn';
    statusBox.textContent = '로그아웃되었습니다';
    hintEl.textContent = '쏙튜브에 다시 로그인하면 자동 인식됩니다.';
    logoutBtn.style.display = 'none';
  });
});
