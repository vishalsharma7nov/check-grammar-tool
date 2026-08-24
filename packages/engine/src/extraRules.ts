import type { Category, Match } from "../../protocol/src/index";

type Skip = (index: number) => boolean;

function add(
  matches: Match[],
  offset: number,
  length: number,
  ruleId: string,
  message: string,
  explanation: string,
  replacements: string[],
  category: Category = "grammar",
) {
  matches.push({ offset, length, ruleId, category, message, explanation, replacements });
}

function each(text: string, re: RegExp, skip: Skip, fn: (m: RegExpExecArray) => void) {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (skip(m.index)) continue;
    fn(m);
    if (!re.global) break;
  }
}

function wordInMatch(m: RegExpExecArray, word: string): { offset: number; length: number } | null {
  const idx = m[0].toLowerCase().lastIndexOf(word.toLowerCase());
  if (idx < 0) return null;
  return { offset: m.index + idx, length: word.length };
}

export function checkExtraRules(text: string, skip: Skip): Match[] {
  const matches: Match[] = [];

  // Modals: could/would/should of → have
  each(text, /\b(could|would|should|might|must)\s+of\b/gi, skip, (m) => {
    const modal = m[1].toLowerCase();
    add(matches, m.index, m[0].length, "GRAMMAR_MODAL_OF", `Use “${modal} have”, not “${modal} of”.`, "Could/would/should + have, not of.", [`${modal} have`]);
  });

  // peak/peek
  each(text, /\b(?:take|took|taking|get|got|getting|have|had|a)\s+a\s+peak\s+at\b/gi, skip, (m) => {
    const span = wordInMatch(m, "peak");
    if (!span) return;
    add(matches, span.offset, span.length, "GRAMMAR_PEEK_PEAK", "“Peek at”, not “peak at”.", "Peek = look quickly. Peak = top/summit.", ["peek"]);
  });

  // bare/bear
  each(text, /\b(?:can't|cannot|couldn't|can not)\s+bare\b/gi, skip, (m) => {
    const span = wordInMatch(m, "bare");
    if (!span) return;
    add(matches, span.offset, span.length, "GRAMMAR_BEAR_BARE", "“Bear” (endure) fits here, not “bare”.", "Bear = endure/carry. Bare = uncovered.", ["bear"]);
  });

  each(text, /\bbare\s+with\s+me\b/gi, skip, (m) => {
    add(matches, m.index, 4, "GRAMMAR_BEAR_WITH", "“Bear with me”, not “bare with me”.", "Bear = endure. Bare = uncovered.", ["bear"]);
  });

  each(text, /\bbare\s+(?:feet|foot|hand|hands|skin|bones|minimum|necessities|essentials|facts|truth|metal|wire|floor|walls|room|cupboard|shelves)\b/gi, skip, (m) => {
    // correct bare usage — no flag
  });

  // brake/break
  each(text, /\b(?:hit|apply|press|step|pump|check|test|use|engage|release|lock|unlock|adjust|fix|repair|replace|change|swap|install|remove|bleed|service|maintain|inspect)\s+the\s+breaks?\b/gi, skip, (m) => {
    const brk = m[0].match(/\bbreaks?\b/i);
    if (!brk || brk.index === undefined) return;
    add(matches, m.index + brk.index, brk[0].length, "GRAMMAR_BRAKE_BREAK", "“Brake/brakes” (stopping device) fits here.", "Brake = stopping device. Break = fracture/rest.", ["brakes", "brake"]);
  });

  each(text, /\b(?:take|need|want|have|get|schedule|plan|arrange|set|put|add|include|build|create|make|offer|provide|grant|enable|force|require|mandate|demand|request|ask|expect|intend|hope|wish|prefer|choose|decide|elect|select|pick|opt|agree|consent|volunteer|promise|commit|pledge|vow|swear|guarantee|ensure|assure|confirm|verify|validate|check|test|try|attempt|manage|succeed|fail|avoid|prevent|stop|halt|pause|delay|postpone|defer|cancel|abort|terminate|end|finish|complete|close|open|start|begin|continue|resume|restart|renew|refresh|reset|restore|recover|repair|fix|correct|adjust|modify|change|alter|update|upgrade|downgrade|migrate|transfer|move|shift|switch|swap|replace|substitute|exchange|trade|barter|sell|buy|purchase|acquire|obtain|receive|accept|reject|decline|refuse|deny|approve|permit|allow|enable|disable|block|ban|prohibit|forbid|restrict|limit|constrain)\s+a\s+brake\b/gi, skip, (m) => {
    const span = wordInMatch(m, "brake");
    if (!span) return;
    add(matches, span.offset, span.length, "GRAMMAR_BREAK_BRAKE", "“Break” (rest/fracture) fits here, not “brake”.", "Break = rest/fracture. Brake = stopping device.", ["break"]);
  });

  // principle/principal
  each(text, /\b(?:school|college|university|head|deputy|assistant|vice|acting|former|retired|new|current|incoming|outgoing|interim|permanent|full-time|part-time|visiting|adjunct|tenured|elected|appointed|named|designated)\s+principle\b/gi, skip, (m) => {
    const span = wordInMatch(m, "principle");
    if (!span) return;
    add(matches, span.offset, span.length, "GRAMMAR_PRINCIPAL_PERSON", "“Principal” (head of school) fits here.", "Principal = head person or main amount. Principle = rule/belief.", ["principal"]);
  });

  each(text, /\b(?:moral|ethical|fundamental|basic|core|key|main|primary|central|guiding|overarching|foundational|underlying|general|universal|cardinal)\s+principal\b/gi, skip, (m) => {
    const span = wordInMatch(m, "principal");
    if (!span) return;
    add(matches, span.offset, span.length, "GRAMMAR_PRINCIPLE_RULE", "“Principle” (rule/belief) fits here.", "Principle = rule/belief. Principal = main person/amount.", ["principle"]);
  });

  each(text, /\b(?:principal|main|primary|key|core|central|major|largest|biggest|greatest|highest|top|leading|chief|head|net|gross|total|overall|aggregate|combined|joint|shared|common|mutual|direct|indirect|nominal|real|adjusted|constant|current|present|future|past|historical|projected|estimated|expected|anticipated|forecast|budgeted|allocated|assigned|designated|earmarked|reserved|set|fixed|variable|floating|adjustable|flexible|rigid|static|dynamic|stable|volatile|steady)\s+(?:amount|sum|balance|payment|repayment|installment|instalment|loan|mortgage|debt|investment|contribution|deposit|withdrawal|transfer|allocation|distribution|disbursement)\b/gi, skip, (m) => {
    const pr = m[0].match(/\bprincipal\b/i);
    if (!pr || pr.index === undefined) return;
    add(matches, m.index + pr.index, 9, "GRAMMAR_PRINCIPAL_AMOUNT", "“Principal” (main amount) fits here.", "Principal = main amount/person. Principle = rule/belief.", ["principal"]);
  });

  // complement/compliment
  each(text, /\b(?:colors?|colours?|shirts?|dresses?|outfits?|wine|wines|beer|beers|spices?|herbs?|sauces?|flavors?|flavours?|tastes?|scents?|fragrances?|aromas?|tones?|shades?|hues?|accents?|highlights?|lowlights?|features?|elements?|components?|parts?|pieces?|items?|products?|services?|options?|choices?|selections?|sets?|pairs?|groups?|teams?|departments?|units?|sections?|modules?)\s+compliment\b/gi, skip, (m) => {
    const span = wordInMatch(m, "compliment");
    if (!span) return;
    add(matches, span.offset, span.length, "GRAMMAR_COMPLEMENT", "“Complement” (complete/match) fits here.", "Complement = complete/match. Compliment = praise.", ["complement"]);
  });

  each(text, /\b(?:pay|pays|paid|giving|give|gives|gave|offer|offers|offered|extend|extends|extended|accept|accepts|accepted|receive|receives|received|return|returns|returned|take|takes|took|taking|get|gets|got|getting|send|sends|sent|sending|write|writes|wrote|writing|make|makes|made|making|pass|passes|passed|passing|exchange|exchanges|exchanged|trade|trades|traded|barter|barters|bartered|share|shares|shared|sharing|express|expresses|expressed|convey|conveys|conveyed|communicate|communicates|communicated|deliver|delivers|delivered|present|presents|presented)\s+(?:a|the|my|your|our|his|her|their|its|some|any|no|this|that|each|every|another|other|same|similar|different|main|primary|key|core|major|minor|nice|kind|warm|sincere|genuine|heartfelt|gracious|generous|thoughtful|lovely|beautiful|wonderful|great|good|big|small|quick|short|brief|long|formal|informal|casual|professional|personal|public|private|verbal|written|spoken|oral|visual|subtle|direct|indirect|explicit|implicit|clear|vague|ambiguous|specific|general|particular|special|unique|common|rare|unusual|unexpected|surprising)\s+complement\b/gi, skip, (m) => {
    const span = wordInMatch(m, "complement");
    if (!span) return;
    add(matches, span.offset, span.length, "GRAMMAR_COMPLIMENT", "“Compliment” (praise) fits here.", "Compliment = praise. Complement = complete/match.", ["compliment"]);
  });

  // stationary/stationery
  each(text, /\b(?:remain|stays?|stayed|staying|keep|keeps|kept|keeping|hold|holds|held|holding|be|is|are|was|were|been|being|appear|appears|appeared|seem|seems|seemed|look|looks|looked|stand|stands|stood|standing|sit|sits|sat|sitting|lie|lies|lay|lying|rest|rests|rested|resting|wait|waits|waited|waiting|park|parks|parked|parking|stop|stops|stopped|stopping|halt|halts|halted|halting|freeze|freezes|froze|frozen|freezing|lock|locks|locked|locking|fix|fixes|fixed|fixing|anchor|anchors|anchored|anchoring|root|roots|rooted|rooting|plant|plants|planted|planting|mount|mounts|mounted|mounting|install|installs|installed|installing|deploy|deploys|deployed|deploying|position|positions|positioned|positioning|place|places|placed|placing|set|sets|setting|put|puts|putting|leave|leaves|left|leaving|maintain|maintains|maintained|maintaining|preserve|preserves|preserved|preserving|protect|protects|protected|protecting|defend|defends|defended|defending|guard|guards|guarded|guarding|secure|secures|secured|securing|safeguard|safeguards|safeguarded|safeguarding|shield|shields|shielded|shielding|cover|covers|covered|covering|hide|hides|hid|hidden|hiding|conceal|conceals|concealed|concealing|reveal|reveals|revealed|revealing|expose|exposes|exposed|exposing|uncover|uncovers|uncovered|uncovering|discover|discovers|discovered|discovering|detect|detects|detected|detecting|identify|identifies|identified|identifying|recognize|recognizes|recognised|recognized|recognising|recognizing|distinguish|distinguishes|distinguished|distinguishing|differentiate|differentiates|differentiated|differentiating|separate|separates|separated|separating|divide|divides|divided|dividing|split|splits|split|splitting|merge|merges|merged|merging|combine|combines|combined|combining|join|joins|joined|joining|connect|connects|connected|connecting|link|links|linked|linking|relate|relates|related|relating|associate|associates|associated|associating|attach|attaches|attached|attaching|bind|binds|bound|binding|tie|ties|tied|tying|fasten|fastens|fastened|fastening|implement|implements|implemented|implementing|execute|executes|executed|executing|perform|performs|performed|performing|conduct|conducts|conducted|conducting|carry|carries|carried|carrying|run|runs|ran|running|operate|operates|operated|operating|manage|manages|managed|managing|handle|handles|handled|handling|deal|deals|dealt|dealing|address|addresses|addressed|addressing|resolve|resolves|resolved|resolving|solve|solves|solved|solving|repair|repairs|repaired|repairing|correct|corrects|corrected|correcting|adjust|adjusts|adjusted|adjusting|modify|modifies|modified|modifying|change|changes|changed|changing|alter|alters|altered|altering|update|updates|updated|updating|upgrade|upgrades|upgraded|upgrading|downgrade|downgrades|downgraded|downgrading|migrate|migrates|migrated|migrating|transfer|transfers|transferred|transferring|move|moves|moved|moving|shift|shifts|shifted|shifting|switch|switches|switched|switching|swap|swaps|swapped|swapping|replace|replaces|replaced|replacing|substitute|substitutes|substituted|substituting|exchange|exchanges|exchanged|exchanging|trade|trades|traded|trading|barter|barters|bartered|bartering|sell|sells|sold|selling|buy|buys|bought|buying|purchase|purchases|purchased|purchasing|acquire|acquires|acquired|acquiring|obtain|obtains|obtained|obtaining|receive|receives|received|receiving|accept|accepts|accepted|accepting|reject|rejects|rejected|rejecting|decline|declines|declined|declining|refuse|refuses|refused|refusing|deny|denies|denied|denying|approve|approves|approved|approving|permit|permits|permitted|permitting|allow|allows|allowed|allowing|enable|enables|enabled|enabling|disable|disables|disabled|disabling|block|blocks|blocked|blocking|ban|bans|banned|banning|prohibit|prohibits|prohibited|prohibiting|forbid|forbids|forbade|forbidden|forbidding|restrict|restricts|restricted|restricting|limit|limits|limited|limiting|constrain|constrains|constrained|constraining|bound|bounds|bounded|bounding|cap|caps|capped|capping|floor|floors|floored|flooring|ceiling|ceilings|threshold|thresholds|tolerance|tolerances|margin|margins|buffer|buffers|reserve|reserves|reserved|reserving|backup|backups|fallback|fallbacks|default|defaults|baseline|baselines|reference|references|source|sources|origin|origins|root|roots|cause|causes|caused|causing|reason|reasons|factor|factors|driver|drivers|trigger|triggers|triggered|triggering|event|events|incident|incidents|issue|issues|problem|problems|bug|bugs|defect|defects|error|errors|fault|faults|failure|failures|outage|outages|downtime|downtimes|delay|delays|blocker|blockers|bottleneck|bottlenecks|risk|risks|threat|threats|vulnerability|vulnerabilities|exposure|exposures|impact|impacts|consequence|consequences|effect|effects|benefit|benefits|advantage|advantages|disadvantage|disadvantages|tradeoff|tradeoffs|cost|costs|price|prices|value|values|return|returns|roi|rois|payoff|payoffs|upside|upsides|downside|downsides)\s+stationery\b/gi, skip, (m) => {
    const span = wordInMatch(m, "stationery");
    if (!span) return;
    add(matches, span.offset, span.length, "GRAMMAR_STATIONARY", "“Stationary” (not moving) fits here.", "Stationary = not moving. Stationery = paper supplies.", ["stationary"]);
  });

  each(text, /\b(?:office|letterhead|writing|school|business|corporate|company|personal|custom|branded|printed|fine|quality|premium|luxury|designer|handmade|handwritten|calligraphy|calligraphic|monogrammed|embossed|engraved|stamped|sealed|signed|dated|numbered|limited|edition|special|exclusive|private|confidential|internal|external|official|unofficial|formal|informal|casual|professional|personal|legal|illegal|valid|invalid|correct|incorrect|accurate|inaccurate|precise|imprecise|exact|approximate|rough|detailed|brief|short|long|quick|slow|fast|early|late|soon|later|now|then|always|never|sometimes|often|rarely|usually|generally|typically|normally|commonly|frequently|occasionally|constantly|continuously|regularly|irregularly|periodically|sporadically|intermittently|consistently|inconsistently|reliably|unreliably|predictably|unpredictably|expectedly|unexpectedly|surprisingly|unsurprisingly|obviously|clearly|apparently|seemingly|presumably|supposedly|allegedly|reportedly|purportedly|ostensibly|nominally|technically|practically|theoretically|hypothetically|realistically|optimistically|pessimistically|honestly|frankly|seriously|literally|figuratively|metaphorically|symbolically|ironically|coincidentally|accidentally|intentionally|deliberately|purposely|inadvertently|mistakenly|wrongly|rightly|correctly|incorrectly|properly|improperly|appropriately|inappropriately|suitably|unsuitably|adequately|inadequately|sufficiently|insufficiently|completely|incompletely|partially|fully|entirely|wholly|totally|absolutely|definitely|certainly|surely|probably|possibly|maybe|perhaps|likely|unlikely|doubtfully|questionably|arguably|debatably|undeniably|unquestionably|undoubtedly|indisputably|incontestably|irrefutably|unmistakably|unambiguously|explicitly|implicitly|directly|indirectly|openly|secretly|publicly|privately|formally|informally|officially|unofficially|legally|illegally|ethically|unethically|morally|immorally|socially|politically|economically|financially|commercially|personally|professionally|academically|scientifically|technically|medically|legally|historically|geographically|environmentally|ecologically|biologically|culturally|religiously|spiritually|emotionally|psychologically|physically|mentally|intellectually|creatively|artistically|musically|literarily|poetically|dramatically|comically|humorously|seriously|casually|formally|informally|politely|rudely|kindly|unkindly|gently|roughly|softly|loudly|quietly|silently|noisily|calmly|anxiously|nervously|confidently|uncertainly|happily|sadly|angrily|peacefully|violently|aggressively|passively|actively|proactively|reactively|strategically|tactically|operationally|functionally|practically|theoretically|conceptually|abstractly|concretely|specifically|generally|broadly|narrowly|widely|locally|globally|internationally|nationally|regionally|domestically|externally|internally)\s+stationary\b/gi, skip, (m) => {
    const span = wordInMatch(m, "stationary");
    if (!span) return;
    add(matches, span.offset, span.length, "GRAMMAR_STATIONERY", "“Stationery” (paper/supplies) fits here.", "Stationery = paper supplies. Stationary = not moving.", ["stationery"]);
  });

  // lose/loose
  each(text, /\b(?:will|would|should|could|can|may|might|must|shall|to|try|trying|tries|tried|begin|began|start|started|continue|continued|help|helped|helps|need|needed|needs|want|wanted|wants|like|liked|likes|love|loved|loves|hope|hoped|hopes|expect|expected|expects|intend|intended|intends|plan|planned|plans|aim|aimed|aims|seek|sought|seeks|fail|failed|fails|manage|managed|manages|attempt|attempted|attempts|strive|strove|strives|struggle|struggled|struggles|work|worked|works|keep|kept|keeps|stop|stopped|stops|avoid|avoided|avoids|prevent|prevented|prevents|reduce|reduced|reduces|increase|increased|increases|improve|improved|improves|worsen|worsened|worsens|change|changed|changes|alter|altered|alters|modify|modified|modifies|impact|impacted|impacts|influence|influenced|influences|shape|shaped|shapes|determine|determined|determines|decide|decided|decides|control|controlled|controls|limit|limited|limits|restrict|restricted|restricts|enhance|enhanced|enhances|boost|boosted|boosts|hurt|hurts|harm|harmed|harms|damage|damaged|damages|weaken|weakened|weakens|strengthen|strengthened|strengthens|undermine|undermined|undermines|support|supported|supports|undercut|undercut|undercuts)\s+to\s+loose\b/gi, skip, (m) => {
    const span = wordInMatch(m, "loose");
    if (!span) return;
    add(matches, span.offset, span.length, "GRAMMAR_LOSE_LOOSE", "“Lose” (misplace/fail) fits here, not “loose”.", "Lose = misplace/fail. Loose = not tight.", ["lose"]);
  });

  return matches;
}
