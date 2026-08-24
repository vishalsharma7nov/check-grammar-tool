const vscode = require("vscode");

function activate(context) {
  const collection = vscode.languages.createDiagnosticCollection("check-grammar");
  context.subscriptions.push(collection);

  async function lint(doc) {
    if (!["markdown", "plaintext", "latex"].includes(doc.languageId)) return;
    const cfg = vscode.workspace.getConfiguration("checkGrammar");
    const url = cfg.get("apiUrl") || "http://127.0.0.1:8080";
    const dialect = cfg.get("dialect") || "en-IN";
    try {
      const res = await fetch(`${url}/v1/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: doc.getText(), dialect }),
      });
      const body = await res.json();
      const diags = (body.matches || []).map((m) => {
        const start = doc.positionAt(m.offset);
        const end = doc.positionAt(m.offset + m.length);
        const d = new vscode.Diagnostic(
          new vscode.Range(start, end),
          `${m.message} (${m.ruleId})`,
          vscode.DiagnosticSeverity.Information,
        );
        d.source = "check-grammar";
        return d;
      });
      collection.set(doc.uri, diags);
    } catch (e) {
      collection.set(doc.uri, []);
    }
  }

  context.subscriptions.push(
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
