const API = "http://127.0.0.1:8080";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "check") return;
  fetch(`${API}/v1/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: msg.text,
      dialect: msg.dialect || "en-IN",
      caret: msg.caret,
    }),
  })
    .then((r) => r.json())
    .then(sendResponse)
    .catch((e) => sendResponse({ error: String(e), matches: [] }));
  return true;
});
