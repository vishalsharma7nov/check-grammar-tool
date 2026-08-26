"use client";

const COMPARISON = [
  { feature: "Text stays on your device", us: true, them: false },
  { feature: "Free & open source (Apache-2.0)", us: true, them: false },
  { feature: "Self-hostable API", us: true, them: false },
  { feature: "No account required", us: true, them: false },
  { feature: "Browser extension", us: true, them: true },
  { feature: "Spelling & grammar checks", us: true, them: true },
  { feature: "Next-word suggestions", us: true, them: true },
  { feature: "Tone & clarity hints", us: true, them: true },
  { feature: "Inclusive language rules", us: true, them: true },
  { feature: "Cloud AI rewrite (proprietary)", us: "Optional (Ollama)", them: true },
  { feature: "Plagiarism detection", us: false, them: true },
  { feature: "Mobile keyboard app", us: false, them: true },
] as const;

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <span className="cmp-yes">✓</span>;
  if (value === false) return <span className="cmp-no">—</span>;
  return <span className="cmp-partial">{value}</span>;
}

export default function LandingHero() {
  return (
    <section className="landing">
      <div className="landing-hero">
        <p className="landing-eyebrow">Privacy-first writing assistant</p>
        <h1 className="landing-title">
          Grammar checks that stay on <em>your</em> machine
        </h1>
        <p className="landing-lead">
          Free open-source writing for content writers — research open sources, draft, and polish in your browser. Spelling,
          grammar, homophones, inclusive language, and next-word hints with no cloud upload by default. Self-host Enhanced
          mode when you want LanguageTool and local LLM power.
        </p>
        <div className="landing-cta">
          <a href="#editor" className="landing-btn primary">
            Start writing
          </a>
          <a href="#extension-install" className="landing-btn secondary">
            Install extension
          </a>
        </div>
        <p className="landing-note">
          Not affiliated with Grammarly. Apache-2.0 — audit the code, run it yourself, or deploy Privacy mode free on
          Vercel.
        </p>
      </div>

      <div className="comparison-wrap">
        <h2 className="comparison-title">Check Grammar vs Grammarly</h2>
        <p className="comparison-sub">Honest comparison — we win on privacy, cost, and control.</p>
        <table className="comparison-table">
          <thead>
            <tr>
              <th scope="col">Feature</th>
              <th scope="col">Check Grammar</th>
              <th scope="col">Grammarly</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row) => (
              <tr key={row.feature}>
                <td>{row.feature}</td>
                <td>
                  <Cell value={row.us} />
                </td>
                <td>
                  <Cell value={row.them} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div id="extension-install" className="extension-install">
        <h3>Browser extension</h3>
        <p>
          Run <code>npm run build:extension</code> from the repo, then Chrome →{" "}
          <code>chrome://extensions</code> → Load unpacked → <code>apps/extension</code>. Checks any text field on
          the web — spelling, grammar, and next-word chips stay on your machine.
        </p>
      </div>
    </section>
  );
}
