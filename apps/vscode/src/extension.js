const vscode = require("vscode");
const { spawnSync } = require("child_process");
const path = require("path");

/** @type {Map<string, { matches: Array<{ offset: number; length: number; ruleId: string; replacements?: string[] }> }>} */
const lastResults = new Map();

function bundledCheck(text, dialect, personalDictionary, caret) {
  const shim = path.join(__dirname, "..", "..", "..", "server", "shim", "check-cli.mjs");
  const body = JSON.stringify({ text, dialect, personalDictionary: personalDictionary || [], caret });
  const res = spawnSync("node", [shim], { input: body, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  if (res.status !== 0 || !res.stdout) return null;
  try {
    return JSON.parse(res.stdout);
  } catch {
    return null;
  }
}

function activate(context) {
  const collection = vscode.languages.createDiagnosticCollection("check-grammar");
  context.subscriptions.push(collection);

  async function lint(doc) {
    if (!["markdown", "plaintext", "latex"].includes(doc.languageId)) return;
    const cfg = vscode.workspace.getConfiguration("checkGrammar");
    const url = cfg.get("apiUrl") || "http://127.0.0.1:8080";
    const dialect = cfg.get("dialect") || "en-IN";
    const useBundled = cfg.get("useBundledEngine") !== false;
    const personalDictionary = cfg.get("personalDictionary") || [];
    const editor = vscode.window.activeTextEditor;
    const caret =
      editor?.document === doc ? doc.offsetAt(editor.selection.active) : undefined;
    const text = doc.getText();
    const checkPayload = { text, dialect, personalDictionary, caret };

    let body = null;
    try {
      const res = await fetch(`${url}/v1/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkPayload),
      });
      if (res.ok) body = await res.json();
    } catch {
      /* API unavailable — try bundled shim */
    }

    if (!body && useBundled) {
      body = bundledCheck(text, dialect, personalDictionary, caret);
    }

    lastResults.set(doc.uri.toString(), body || { matches: [] });

    const diags = (body?.matches || []).map((m) => {
      const start = doc.positionAt(m.offset);
      const end = doc.positionAt(m.offset + m.length);
      const d = new vscode.Diagnostic(
        new vscode.Range(start, end),
        `${m.message} (${m.ruleId})`,
        vscode.DiagnosticSeverity.Warning,
      );
      d.source = "check-grammar";
      d.code = m.ruleId;
      return d;
    });
    collection.set(doc.uri, diags);
  }

  const provider = {
    provideCodeActions(document, _range, context) {
      const stored = lastResults.get(document.uri.toString());
      if (!stored?.matches?.length) return [];
      const actions = [];
      for (const diag of context.diagnostics) {
        if (diag.source !== "check-grammar") continue;
        const offset = document.offsetAt(diag.range.start);
        const length = document.offsetAt(diag.range.end) - offset;
        const match = stored.matches.find(
          (m) => m.offset === offset && m.length === length && m.ruleId === diag.code,
        );
        if (!match?.replacements?.length) continue;
        for (const repl of match.replacements.slice(0, 3)) {
          const action = new vscode.CodeAction(`Accept: ${repl}`, vscode.CodeActionKind.QuickFix);
          const edit = new vscode.WorkspaceEdit();
          edit.replace(document.uri, diag.range, repl);
          action.edit = edit;
          action.diagnostics = [diag];
          action.isPreferred = repl === match.replacements[0];
          actions.push(action);
        }
      }
      return actions;
    },
  };

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      [{ language: "markdown" }, { language: "plaintext" }, { language: "latex" }],
      provider,
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] },
    ),
    vscode.workspace.onDidSaveTextDocument(lint),
    vscode.workspace.onDidOpenTextDocument(lint),
    vscode.workspace.onDidChangeTextDocument((e) => {
      clearTimeout(activate._t);
      activate._t = setTimeout(() => lint(e.document), 500);
    }),
  );
  if (vscode.window.activeTextEditor) lint(vscode.window.activeTextEditor.document);
}

function deactivate() {}
module.exports = { activate, deactivate };
