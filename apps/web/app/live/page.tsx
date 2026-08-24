"use client";

import Editor from "../../components/Editor";

export default function LivePage() {
  return (
    <div>
      <p className="stats" style={{ padding: "0.75rem 1.25rem 0", maxWidth: 1200, margin: "0 auto" }}>
        Live pad — suggestions appear while you type (sentence making, spelling, next word). Keep this window beside Slack,
        Mail, or Notes; or load the browser extension to check fields on websites.
      </p>
      <Editor />
    </div>
  );
}
