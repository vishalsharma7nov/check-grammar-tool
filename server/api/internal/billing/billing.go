package billing

// Entitlements keep core checking free. Paid plans unlock hosted GPU of OUR weights,
// team style guides, and SSO — never the rule engine.

type Plan string

const (
	PlanFree Plan = "free"
	PlanPro  Plan = "pro"
	PlanTeam Plan = "team"
)

type Entitlements struct {
	Plan              Plan `json:"plan"`
	RulesUnlimited    bool `json:"rulesUnlimited"`
	LocalLLM          bool `json:"localLLM"`
	HostedGPURewrite  bool `json:"hostedGpuRewrite"`
	HostedMonthlyCap  int  `json:"hostedMonthlyCap"`
	TeamStyleGuides   bool `json:"teamStyleGuides"`
	SSO               bool `json:"sso"`
	AuditExport       bool `json:"auditExport"`
}

func ForPlan(plan string, freeQuota int) Entitlements {
	e := Entitlements{
		Plan:             PlanFree,
		RulesUnlimited:   true,
		LocalLLM:         true,
		HostedMonthlyCap: freeQuota,
	}
	switch plan {
	case "pro":
		e.Plan = PlanPro
		e.HostedGPURewrite = true
		e.HostedMonthlyCap = 2000
	case "team":
		e.Plan = PlanTeam
		e.HostedGPURewrite = true
		e.HostedMonthlyCap = 10000
		e.TeamStyleGuides = true
		e.SSO = true
		e.AuditExport = true
	}
	return e
}
