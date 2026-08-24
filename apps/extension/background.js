const API = "http://127.0.0.1:8080";
const DICT_KEY = "personalDictionary";

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

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "check") {
    loadDict().then((dict) => {
      fetch(`${API}/v1/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: msg.text,
          dialect: msg.dialect || "en-IN",
          caret: msg.caret,
          personalDictionary: dict,
        }),
      })
        .then((r) => r.json())
        .then(sendResponse)
        .catch((e) => sendResponse({ error: String(e), matches: [] }));
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
