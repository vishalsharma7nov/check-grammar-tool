"use client";

import LandingHero from "../components/LandingHero";
import Editor from "../components/Editor";

export default function Page() {
  return (
    <>
      <LandingHero />
      <div id="editor">
        <Editor />
      </div>
    </>
  );
}
