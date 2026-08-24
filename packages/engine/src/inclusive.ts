import type { Match } from "../../protocol/src/index";

type Skip = (index: number) => boolean;

type InclusiveRule = {
  re: RegExp;
  ruleId: string;
  message: string;
  explanation: string;
  replacements: string[];
};

const RULES: InclusiveRule[] = [
  {
    re: /\bmanpower\b/gi,
    ruleId: "STYLE_INCLUSIVE_MANPOWER",
    message: "Consider “workforce” or “staff” instead of “manpower”.",
    explanation: "Gender-neutral terms are clearer for mixed teams.",
    replacements: ["workforce", "staff"],
  },
  {
    re: /\bchairman\b/gi,
    ruleId: "STYLE_INCLUSIVE_CHAIRMAN",
    message: "Consider “chair” or “chairperson” instead of “chairman”.",
    explanation: "Chair and chairperson include all genders.",
    replacements: ["chair", "chairperson"],
  },
  {
    re: /\bchairmen\b/gi,
    ruleId: "STYLE_INCLUSIVE_CHAIRMEN",
    message: "Consider “chairs” or “chairpersons” instead of “chairmen”.",
    explanation: "Gender-neutral titles read more inclusively.",
    replacements: ["chairs", "chairpersons"],
  },
  {
    re: /\bpoliceman\b/gi,
    ruleId: "STYLE_INCLUSIVE_POLICEMAN",
    message: "Consider “police officer” instead of “policeman”.",
    explanation: "Police officer is the standard neutral term.",
    replacements: ["police officer"],
  },
  {
    re: /\bpolicemen\b/gi,
    ruleId: "STYLE_INCLUSIVE_POLICEMEN",
    message: "Consider “police officers” instead of “policemen”.",
    explanation: "Police officers is the standard neutral term.",
    replacements: ["police officers"],
  },
  {
    re: /\bfireman\b/gi,
    ruleId: "STYLE_INCLUSIVE_FIREMAN",
    message: "Consider “firefighter” instead of “fireman”.",
    explanation: "Firefighter is the standard neutral term.",
    replacements: ["firefighter"],
  },
  {
    re: /\bfiremen\b/gi,
    ruleId: "STYLE_INCLUSIVE_FIREMEN",
    message: "Consider “firefighters” instead of “firemen”.",
    explanation: "Firefighters is the standard neutral term.",
    replacements: ["firefighters"],
  },
  {
    re: /\bmankind\b/gi,
    ruleId: "STYLE_INCLUSIVE_MANKIND",
    message: "Consider “humanity” or “humankind” instead of “mankind”.",
    explanation: "Humankind and humanity include everyone.",
    replacements: ["humanity", "humankind"],
  },
  {
    re: /\bblacklist(?:ed|ing|s)?\b/gi,
    ruleId: "STYLE_INCLUSIVE_BLACKLIST",
    message: "Consider “blocklist” or “denylist” instead of “blacklist”.",
    explanation: "Blocklist/denylist avoids racialized metaphors.",
    replacements: ["blocklist", "denylist"],
  },
  {
    re: /\bwhitelist(?:ed|ing|s)?\b/gi,
    ruleId: "STYLE_INCLUSIVE_WHITELIST",
    message: "Consider “allowlist” or “safelist” instead of “whitelist”.",
    explanation: "Allowlist/safelist avoids racialized metaphors.",
    replacements: ["allowlist", "safelist"],
  },
];

function keepCase(src: string, next: string): string {
  if (src[0] === src[0]?.toUpperCase() && /[A-Za-z]/.test(src[0])) {
    return next[0].toUpperCase() + next.slice(1);
  }
  return next;
}

export function checkInclusiveLanguage(text: string, skip: Skip): Match[] {
  const matches: Match[] = [];
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(text))) {
      if (skip(m.index)) continue;
      matches.push({
        offset: m.index,
        length: m[0].length,
        ruleId: rule.ruleId,
        category: "style",
        message: rule.message,
        explanation: rule.explanation,
        replacements: rule.replacements.map((r) => keepCase(m![0], r)),
      });
    }
  }
  return matches;
}
