// Firebase Auth는 IndexedDB(firebaseLocalStorageDb)에 토큰을 저장합니다.
(function () {
  function postToken(data) {
    const { uid, displayName, photoURL, stsTokenManager, apiKey } = data;
    if (!uid || !stsTokenManager?.accessToken) return false;
    window.postMessage({
      type: 'SSOKTUBE_EXT_TOKEN',
      uid,
      displayName: displayName || '',
      photoURL: photoURL || '',
      accessToken: stsTokenManager.accessToken,
      refreshToken: stsTokenManager.refreshToken || '',
      expirationTime: stsTokenManager.expirationTime || 0,
      apiKey: apiKey || '',
    }, '*');
    return true;
  }

  function readFromIndexedDB() {
    const dbName = 'firebaseLocalStorageDb';
    const storeName = 'firebaseLocalStorage';
    const req = indexedDB.open(dbName);
    req.onsuccess = function (e) {
      try {
        const db = e.target.result;
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const all = store.getAll();
        all.onsuccess = function () {
          for (const item of all.result) {
            // 레코드 형식: { fbase_key: "firebase:authUser:{apiKey}:[DEFAULT]", value: {...} }
            if (item?.fbase_key?.startsWith('firebase:authUser:')) {
              const apiKey = item.fbase_key.split(':')[2] || '';
              const val = item.value || {};
              postToken({ ...val, apiKey });
              return;
            }
          }
        };
      } catch (err) {
        // 실패 무시
      }
    };
  }

  readFromIndexedDB();
  // Auth 초기화 대기 후 재시도
  setTimeout(readFromIndexedDB, 2000);
})();
