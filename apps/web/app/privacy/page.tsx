export default function PrivacyPage() {
  return (
    <main className="page">
      <h1>Where does my text go?</h1>
      <p>Check Grammar is local-first. This page matches the flags in the API.</p>
      <h2>Privacy mode (default)</h2>
      <p>The TypeScript engine in <code>packages/engine</code> runs in your browser. Checking does not send text anywhere.</p>
      <h2>Local API</h2>
      <p>
        POST <code>/v1/check</code> on your machine or VPS. Optional rewrite calls <code>LLM_BASE_URL</code> (llama.cpp / MLX /
        Ollama) on the host. Docker on macOS does not get Metal, so the model is not in Compose.
      </p>
      <h2>Hosted Pro (opt-in)</h2>
      <p>Only if you sign in and enable it. Runs our GEC weights on GPUs we operate. Rule underlines stay free.</p>
      <h2>BYOK (opt-in)</h2>
      <p>Off unless you set cloud keys and explicitly request hosted/cloud rewrite. Demos never silently call OpenAI.</p>
    </main>
  );
}
