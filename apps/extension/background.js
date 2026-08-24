const DEFAULT_API = "http://127.0.0.1:8080";
const DICT_KEY = "personalDictionary";
const SETTINGS_KEY = "checkGrammarSettings";

let apiUrl = DEFAULT_API;
let enhancedMode = false;

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([SETTINGS_KEY], (data) => {
      const s = data[SETTINGS_KEY] || {};
      apiUrl = String(s.apiUrl || DEFAULT_API).replace(/\/$/, "");
      enhancedMode = Boolean(s.enhancedMode);
      resolve({ apiUrl, enhancedMode });
    });
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !changes[SETTINGS_KEY]) return;
  const s = changes[SETTINGS_KEY].newValue || {};
  apiUrl = String(s.apiUrl || DEFAULT_API).replace(/\/$/, "");
  enhancedMode = Boolean(s.enhancedMode);
});

loadSettings();

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "cg-accept",
    title: "Accept suggestion",
    contexts: ["editable"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "cg-accept" || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "acceptSuggestion" });
});

function loadDict() {
  return new Promise((resolve) => {
    chrome.storage.local.get([DICT_KEY], (data) => {
      const list = data[DICT_KEY];
      resolve(Array.isArray(list) ? list : []);
    });
  });
}

function postCheck(body) {
  return fetch(`${apiUrl}/v1/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (r) => {
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "check") {
    loadSettings()
      .then(() => loadDict())
      .then((dict) => {
        const useEnhanced = msg.enhanced ?? enhancedMode;
        const body = {
          text: msg.text,
          dialect: msg.dialect || "en-IN",
          caret: msg.caret,
          personalDictionary: dict,
          ...(useEnhanced ? { includeLLM: true } : {}),
        };
        return postCheck(body);
      })
      .then(sendResponse)
      .catch((e) => sendResponse({ error: String(e), matches: [] }));
    return true;
  }
  if (msg.type === "getSettings") {
    loadSettings().then((s) => sendResponse(s));
    return true;
  }
  if (msg.type === "setSettings") {
    const next = {
      apiUrl: String(msg.apiUrl || DEFAULT_API).replace(/\/$/, ""),
      enhancedMode: Boolean(msg.enhancedMode),
    };
    chrome.storage.sync.set({ [SETTINGS_KEY]: next }, () => {
      apiUrl = next.apiUrl;
      enhancedMode = next.enhancedMode;
      sendResponse({ ok: true, ...next });
    });
    return true;
  }
  if (msg.type === "addToDictionary") {
    loadDict().then((dict) => {
      const w = String(msg.word || "").trim();
      if (!w) {
        sendResponse({ ok: false });
        return;
      }
      const lower = w.toLowerCase();
      if (!dict.some((x) => String(x).toLowerCase() === lower)) dict.push(w);
      chrome.storage.local.set({ [DICT_KEY]: dict }, () => sendResponse({ ok: true, dict }));
    });
    return true;
  }
  if (msg.type === "getDictionary") {
    loadDict().then((dict) => sendResponse({ dict }));
    return true;
  }
});
