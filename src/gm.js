import {
  GM_xmlhttpRequest,
} from '$';

export function gmRequest(options) {
  return new Promise((resolve, reject) => {
    const req = {
      method: options.method || 'GET',
      url: options.url,
      headers: options.headers || {},
      responseType: options.responseType || 'json',
      timeout: options.timeout || 20000,
      onload(res) {
        if (options.allow404 && res.status === 404) {
          resolve(null);
          return;
        }
        if (res.status >= 200 && res.status < 300) {
          const type = options.responseType || 'json';
          // Tampermonkey/Violentmonkey: text bodies are reliable on responseText.
          if (type === 'text') {
            resolve(
              res.responseText != null && res.responseText !== ''
                ? res.responseText
                : res.response
            );
          } else if (type === 'json') {
            if (res.response != null && typeof res.response === 'object') {
              resolve(res.response);
              return;
            }
            const raw = res.responseText;
            if (typeof raw === 'string' && raw.trim()) {
              try {
                resolve(JSON.parse(raw));
                return;
              } catch (_) {
                /* fall through */
              }
            }
            resolve(res.response);
          } else {
            resolve(res.response);
          }
        } else {
          reject(new Error(`HTTP ${res.status}`));
        }
      },
      onerror: () => reject(new Error('Network error')),
      ontimeout: () => reject(new Error('Timeout')),
    };
    if (typeof options.anonymous === 'boolean') {
      req.anonymous = options.anonymous;
    }
    if (options.data != null) {
      req.data =
        typeof options.data === 'string' ? options.data : JSON.stringify(options.data);
    }
    GM_xmlhttpRequest(req);
  });
}
