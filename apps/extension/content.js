/**
 * Live overlay: as you type in a field, underline issues and offer a card + next word.
 * Uses the bundled on-device engine when present; otherwise /v1/check.
 */
const HOST_ID = "check-grammar-overlay-host";

function engine() {
  return globalThis.CheckGrammar || null;
}

function ensureHost() {
  let host = document.getElementById(HOST_ID);
  if (host) return host.shadowRoot;
  host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText =
    "all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483646;visibility:visible !important;";
  document.documentElement.appendChild(host);
  return host.attachShadow({ mode: "open" });
}

function cardStyles() {
  return `
    .u{position:absolute;border-bottom:2px wavy #b42318;pointer-events:auto;cursor:pointer;height:1.1em}
    .u.grammar,.u.punctuation{border-bottom-color:#b54708}
    .u.clarity,.u.style,.u.tone{border-bottom-color:#175cd3}
    .u.dialect{border-bottom-color:#0f6b5c}
    .card,.chips{position:fixed;background:#fff;color:#1c1917;border:1px solid #d6cbb8;border-radius:12px;
      box-shadow:0 12px 40px rgba(28,25,23,.18);font:14px system-ui;pointer-events:auto;z-index:2}
    .card{width:300px;padding:12px 14px}
    .kind{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#57534e;margin:0 0 8px}
    .fix{display:block;width:100%;text-align:left;border:1px dashed #d6cbb8;border-radius:8px;padding:8px 10px;background:#faf7f2;cursor:pointer;font:inherit}
    .from{text-decoration:line-through;color:#57534e;margin-right:6px}
    .to{font-weight:700;color:#0f6b5c}
    .why{font-size:13px;color:#57534e;margin:8px 0 10px;line-height:1.4}
    .row{display:flex;gap:6px;flex-wrap:wrap}
    .row button{font:inherit;padding:6px 10px;border:1px solid #d6cbb8;border-radius:6px;background:#fffdf8;cursor:pointer}
    .row .ok{background:#0f6b5c;color:#fff;border-color:#0f6b5c}
    .chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px 8px;max-width:420px}
    .chips span{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#0f6b5c}
    .chips button{font:inherit;font-size:13px;padding:3px 10px;border:1px solid #d6cbb8;border-radius:999px;background:#fffdf8;cursor:pointer}
  `;
}

function getText(el) {
  if (!el) return "";
  if (typeof el.value === "string") return el.value;
  return el.innerText || "";
}

function caretOf(el) {
  if (typeof el.selectionStart === "number") return el.selectionStart;
  const sel = document.getSelection();
  if (!sel || !sel.rangeCount) return getText(el).length;
  try {
    const r = sel.getRangeAt(0).cloneRange();
    r.selectNodeContents(el);
    r.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
    return r.toString().length;
  } catch {
    return getText(el).length;
  }
}

function setValue(el, next, cursor) {
  if (typeof el.value === "string") {
    el.value = next;
    if (typeof cursor === "number") {
      try {
        el.setSelectionRange(cursor, cursor);
      } catch {
        /* password / number inputs */
      }
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  el.innerText = next;
  el.dispatchEvent(new InputEvent("input", { bubbles: true }));
}

function mirrorRect(el, start, end) {
  const cs = getComputedStyle(el);
  const text = getText(el);
  const mirror = document.createElement("div");
  const props = [
    "boxSizing",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "letterSpacing",
    "lineHeight",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "textAlign",
    "whiteSpace",
    "wordWrap",
    "wordBreak",
    "overflowWrap",
    "tabSize",
  ];
  mirror.style.cssText =
    "position:absolute;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;overflow:hidden;left:0;top:0;";
  mirror.style.width = `${el.clientWidth}px`;
  for (const p of props) {
    mirror.style[p] = cs[p];
  }
  const span = document.createElement("span");
  span.textContent = text.slice(start, end) || " ";
  mirror.append(text.slice(0, start), span);
  document.body.appendChild(mirror);
  const sr = span.getBoundingClientRect();
  const tr = el.getBoundingClientRect();
  const mr = mirror.getBoundingClientRect();
  mirror.remove();
  return {
    left: tr.left + (sr.left - mr.left) - (el.scrollLeft || 0),
    top: tr.top + (sr.top - mr.top) - (el.scrollTop || 0),
    width: sr.width,
    height: sr.height,
    bottom: tr.top + (sr.bottom - mr.top) - (el.scrollTop || 0),
  };
}

function isEditable(el) {
  return typeof el.value === "string" || el.isContentEditable;
}

function rangeRect(el, start, end) {
  return mirrorRect(el, start, end);
}

function showCard(root, el, match) {
  root.querySelector(".card")?.remove();
  const original = getText(el).slice(match.offset, match.offset + match.length);
  const r = rangeRect(el, match.offset, match.offset + match.length);
  const card = document.createElement("div");
  card.className = "card";
  card.style.left = Math.min(Math.max(8, r.left || r.x || 8), window.innerWidth - 312) + "px";
  card.style.top = Math.min((r.bottom || 80) + 8, window.innerHeight - 200) + "px";
  const repl = (match.replacements && match.replacements[0]) || "";
  card.innerHTML = `
    <div class="kind">${match.category || "suggestion"}</div>
    ${repl ? `<button class="fix" data-act="accept"><span class="from"></span><span class="to"></span></button>` : ""}
    <p class="why"></p>
    <div class="row">
      ${repl ? `<button class="ok" data-act="accept">Accept</button>` : ""}
      <button data-act="dismiss">Dismiss</button>
    </div>`;
  card.querySelector(".why").textContent = match.explanation || match.message || "";
  const from = card.querySelector(".from");
  const to = card.querySelector(".to");
  if (from) from.textContent = original;
  if (to) to.textContent = repl ? " → " + repl : "";
  card.addEventListener("click", (ev) => {
    const act = ev.target.closest("[data-act]")?.getAttribute("data-act");
    if (act === "accept" && repl) {
      const cg = engine();
      const next = cg?.applyReplacement
        ? cg.applyReplacement(getText(el), match.offset, match.length, repl)
        : getText(el).slice(0, match.offset) + repl + getText(el).slice(match.offset + match.length);
      setValue(el, next, match.offset + repl.length);
    }
    card.remove();
  });
  root.appendChild(card);
}

function showChips(root, el, suggestions) {
  root.querySelector(".chips")?.remove();
  if (!suggestions?.length) return;
  const caret = caretOf(el);
  const r = rangeRect(el, Math.max(0, caret - 1), caret);
  const bar = document.createElement("div");
  bar.className = "chips";
  bar.style.left = Math.min(Math.max(8, r.left || 8), window.innerWidth - 360) + "px";
  bar.style.top = Math.min((r.bottom || 40) + 6, window.innerHeight - 48) + "px";
  const label = document.createElement("span");
  label.textContent = suggestions[0].kind === "complete" ? "Finish" : "Next";
  bar.append(label);
  for (const s of suggestions.slice(0, 5)) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = s.token;
    b.title = s.hint || "";
    b.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const cg = engine();
      if (!cg?.insertSuggestion) return;
      const out = cg.insertSuggestion(getText(el), caretOf(el), s);
      setValue(el, out.text, out.cursor);
    });
    bar.append(b);
  }
  root.appendChild(bar);
}

function paint(el, matches, help) {
  const root = ensureHost();
  root.innerHTML = "";
  const style = document.createElement("style");
  style.textContent = cardStyles();
  root.appendChild(style);
  if (!el) return;
  if (isEditable(el)) {
    for (const m of matches || []) {
      const r = rangeRect(el, m.offset, m.offset + m.length);
      const mark = document.createElement("div");
      mark.className = "u " + (m.category || "");
      mark.style.left = r.left + "px";
      mark.style.top = r.top + r.height - 4 + "px";
      mark.style.width = Math.max(8, r.width) + "px";
      mark.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        showCard(root, el, m);
      });
      root.appendChild(mark);
    }
  }
  const caret = caretOf(el);
  const cg = engine();
  const pick =
    (cg?.matchNearCaret && cg.matchNearCaret(getText(el), matches || [], caret)) ||
    (matches || []).find((m) => caret >= m.offset && caret <= m.offset + m.length);
  if (pick) showCard(root, el, pick);
  showChips(root, el, help?.next || []);
}

function check(text, caret) {
  const cg = engine();
  if (cg?.analyze) {
    return Promise.resolve(cg.analyze({ text, dialect: "en-IN", caret }));
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "check", text, caret }, (res) => resolve(res || { matches: [] }));
  });
}

function bind(el) {
  if (el.dataset.cgBound) return;
  if (el.id === HOST_ID || el.closest("#" + HOST_ID)) return;
  el.dataset.cgBound = "1";
  let t;
  const run = () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      const text = getText(el);
      if (!text.trim()) {
        paint(el, [], { next: [] });
        return;
      }
      const res = await check(text, caretOf(el));
      const cg = engine();
      const help = cg?.writingHelp ? cg.writingHelp(text, caretOf(el)) : { next: [] };
      paint(el, res.matches || [], help);
    }, 280);
  };
  el.addEventListener("input", run);
  el.addEventListener("keyup", run);
  el.addEventListener("click", run);
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || e.shiftKey) return;
    const cg = engine();
    if (!cg?.writingHelp || !cg.insertSuggestion) return;
    const help = cg.writingHelp(getText(el), caretOf(el));
    if (!help.next?.[0]) return;
    e.preventDefault();
    const out = cg.insertSuggestion(getText(el), caretOf(el), help.next[0]);
    setValue(el, out.text, out.cursor);
  });
}

function scan() {
  document
    .querySelectorAll("textarea, input[type=text], input[type=search], input[type=email], input:not([type]), [contenteditable='true'], [contenteditable='']")
    .forEach(bind);
}

const mo = new MutationObserver(scan);
mo.observe(document.documentElement, { subtree: true, childList: true });
scan();
