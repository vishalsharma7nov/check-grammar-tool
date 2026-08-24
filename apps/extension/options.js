const DEFAULT_API = "http://127.0.0.1:8080";

const apiUrlEl = document.getElementById("apiUrl");
const enhancedEl = document.getElementById("enhancedMode");
const statusEl = document.getElementById("status");

function setStatus(msg) {
  statusEl.textContent = msg;
}

chrome.runtime.sendMessage({ type: "getSettings" }, (res) => {
  if (!res) return;
  apiUrlEl.value = res.apiUrl || DEFAULT_API;
  enhancedEl.checked = Boolean(res.enhancedMode);
});

document.getElementById("save").addEventListener("click", () => {
  const apiUrl = String(apiUrlEl.value || DEFAULT_API).trim().replace(/\/$/, "");
  const enhancedMode = enhancedEl.checked;
  chrome.runtime.sendMessage({ type: "setSettings", apiUrl, enhancedMode }, (res) => {
    if (res?.ok) setStatus("Saved — reload tabs for changes to apply.");
    else setStatus("Could not save settings.");
  });
});
