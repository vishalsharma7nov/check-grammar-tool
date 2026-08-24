const ONBOARDING_KEY = "check-grammar-onboarding-seen";

export function hasSeenOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

export const DEMO_TEXT =
  "I recieve teh quarterly report and will revert back soon. Their going to review it, but its unclear whether there doing the right thing. She ate a apple while the chairman discussed manpower for the blacklist. Its effect on our team was significant — we should of checked there credentials. He go to office yesterday and I working on that report. Because the deadline is near. Please prepone the meeting and kindly revert.";
