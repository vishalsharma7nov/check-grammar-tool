export type ToneLabel = "formal" | "casual" | "confident";

const FORMAL = /\b(therefore|furthermore|hereby|shall|pursuant|notwithstanding|accordingly|respectfully|sincerely|dear sir|dear madam)\b/i;
const CASUAL = /\b(hey|yeah|yep|nope|gonna|wanna|kinda|sorta|lol|btw|imo|tbh|awesome|cool|stuff|guys)\b/i;
const HEDGES = /\b(maybe|perhaps|possibly|might|could be|I think|I guess|sort of|kind of|somewhat|a bit|a little)\b/gi;
const ASSERTIVE = /\b(will|must|definitely|certainly|clearly|proven|ensure|guarantee)\b/gi;

export function inferTone(text: string): ToneLabel {
  const t = text.trim();
  if (!t) return "casual";

  const formalHits = (t.match(FORMAL) || []).length;
  const casualHits = (t.match(CASUAL) || []).length + (t.match(/'/g) || []).length;
  const hedgeHits = (t.match(HEDGES) || []).length;
  const assertHits = (t.match(ASSERTIVE) || []).length;
  const exclamations = (t.match(/!/g) || []).length;

  if (formalHits >= 2 || (formalHits >= 1 && casualHits === 0)) return "formal";
  if (assertHits >= 2 && hedgeHits <= 1) return "confident";
  if (casualHits >= 2 || exclamations >= 2 || hedgeHits >= 3) return "casual";
  if (assertHits > hedgeHits) return "confident";
  if (formalHits > casualHits) return "formal";
  return "casual";
}
