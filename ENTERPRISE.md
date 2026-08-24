# Enterprise / Pro (commercial add-ons)

The community checker stays complete. We charge for **hosting and organization features**, not for grammar itself.

| Add-on | What you pay for |
| --- | --- |
| Hosted cloud | We run Docker, backups, uptime |
| Hosted GPU | Inference of **our** larger GEC weights on GPUs we operate |
| Team style guides | Shared brand voice, snippets, admin |
| SSO / SAML / SCIM | Identity for companies |
| Audit & DLP | Logs and data-residency controls |
| Stage 5 checkpoints | Optional Pro download of 1B+ cluster-trained weights |

Billing is implemented behind `internal/billing` in the Go API and Stripe Checkout. Core `/v1/check` rule matches are never gated on a plan.

To use commercial packages you need a license key or a hosted account. The open-source rule engine and small local GGUF keep working without one.
