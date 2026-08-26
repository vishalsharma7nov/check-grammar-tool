"use client";

type Props = {
  onDismiss: () => void;
  onTryExample: () => void;
};

export default function OnboardingBanner({ onDismiss, onTryExample }: Props) {
  return (
    <div className="onboarding-banner" role="region" aria-label="Getting started">
      <div className="onboarding-banner-body">
        <h2>Welcome to Check Grammar</h2>
        <p>
          <strong>Privacy mode</strong> runs entirely in your browser — nothing leaves this tab.{" "}
          <strong>Enhanced mode</strong> sends text to your own local API (LanguageTool + optional Ollama) for deeper
          checks when you self-host. Use <strong>Writer Studio</strong> for free open-source writing: research open
          sources, draft, naturalize, then insert into the editor.
        </p>
        <ul className="onboarding-tips">
          <li>
            <kbd>Tab</kbd> inserts the first next-word chip
          </li>
          <li>Click any wavy underline for fix suggestions</li>
          <li>Use the tone badge and chips below the editor as you type</li>
        </ul>
        <div className="onboarding-actions">
          <button type="button" className="primary" onClick={onTryExample}>
            Try example
          </button>
          <button type="button" className="ghost" onClick={onDismiss}>
            Got it
          </button>
        </div>
      </div>
      <button type="button" className="onboarding-close" onClick={onDismiss} aria-label="Dismiss welcome">
        ×
      </button>
    </div>
  );
}
