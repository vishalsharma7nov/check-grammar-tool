export default function PricingPage() {
  return (
    <main className="page">
      <h1>Pricing</h1>
      <p>The checker is Apache-2.0 and stays free. We sell hosting and org features.</p>
      <h2>Community — $0</h2>
      <ul>
        <li>Spelling, grammar, punctuation, clarity rules</li>
        <li>Indian English / Hinglish dialect pack</li>
        <li>In-browser privacy engine</li>
        <li>Extension, VS Code, desktop against local/self-hosted API</li>
        <li>Style-as-code YAML</li>
        <li>Small from-scratch GEC weights + MLX trainer</li>
      </ul>
      <h2>Pro — hosted GPU</h2>
      <ul>
        <li>Everything in Community</li>
        <li>Hosted inference of our larger weights (you do not need an M2)</li>
        <li>Higher rewrite quota on our GPUs</li>
      </ul>
      <h2>Team</h2>
      <ul>
        <li>Shared style guides</li>
        <li>SSO / SAML placeholder</li>
        <li>Audit export</li>
      </ul>
      <p>Create an account via <code>POST /v1/auth/register</code>. Checkout is a stub until Stripe keys are set.</p>
    </main>
  );
}
