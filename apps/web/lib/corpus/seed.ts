import type { CorpusChunk } from "./types";

/**
 * Mini seed for grounded drafting when a fuller corpus is not yet loaded.
 * Public-domain / open-license excerpts only. Expand via seed.json later.
 */
export const MINI_SEED: CorpusChunk[] = [
  {
    id: "pd-democracy-1",
    title: "On Liberty (excerpt)",
    sourceUrl: "https://www.gutenberg.org/ebooks/34901",
    license: "public-domain",
    licenseNote: "John Stuart Mill — Project Gutenberg",
    topics: ["democracy", "liberty", "government", "speech", "politics"],
    text:
      "The sole end for which mankind are warranted, individually or collectively, in interfering with the liberty of action of any of their number, is self-protection. The only purpose for which power can be rightfully exercised over any member of a civilized community, against his will, is to prevent harm to others. His own good, either physical or moral, is not a sufficient warrant.",
  },
  {
    id: "pd-democracy-2",
    title: "The Federalist Papers (excerpt)",
    sourceUrl: "https://www.gutenberg.org/ebooks/1404",
    license: "public-domain",
    licenseNote: "Hamilton, Madison, Jay — Project Gutenberg",
    topics: ["democracy", "constitution", "republic", "federalism", "government"],
    text:
      "If men were angels, no government would be necessary. If angels were to govern men, neither external nor internal controls on government would be necessary. In framing a government which is to be administered by men over men, the great difficulty lies in this: you must first enable the government to control the governed; and in the next place oblige it to control itself.",
  },
  {
    id: "wiki-photosynthesis",
    title: "Photosynthesis (overview)",
    sourceUrl: "https://en.wikipedia.org/wiki/Photosynthesis",
    license: "CC-BY-SA",
    licenseNote: "Adapted educational summary; attribute Wikipedia / CC BY-SA",
    topics: ["photosynthesis", "plants", "biology", "energy", "chlorophyll", "science"],
    text:
      "Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods from carbon dioxide and water. Chlorophyll in plant cells captures light energy. Oxygen is released as a byproduct. This process sustains most food webs and shapes Earth's atmosphere.",
  },
  {
    id: "wiki-climate",
    title: "Climate and atmosphere (overview)",
    sourceUrl: "https://en.wikipedia.org/wiki/Climate",
    license: "CC-BY-SA",
    licenseNote: "Adapted educational summary; attribute Wikipedia / CC BY-SA",
    topics: ["climate", "weather", "atmosphere", "environment", "science", "earth"],
    text:
      "Climate describes long-term patterns of temperature, humidity, wind, and precipitation in a region. Weather is the short-term state of the atmosphere. Greenhouse gases trap heat and influence global temperature trends. Understanding climate helps communities plan for droughts, storms, and seasonal change.",
  },
  {
    id: "pd-writing-1",
    title: "The Elements of Style (public-domain era ideas)",
    sourceUrl: "https://www.gutenberg.org/ebooks/37134",
    license: "public-domain",
    licenseNote: "Strunk — classic clarity advice (verify edition license)",
    topics: ["writing", "style", "clarity", "prose", "editing", "grammar"],
    text:
      "Vigorous writing is concise. A sentence should contain no unnecessary words, a paragraph no unnecessary sentences. Prefer the specific to the general, the definite to the vague. Active voice usually makes prose clearer and stronger than passive constructions.",
  },
  {
    id: "wiki-internet",
    title: "Internet (overview)",
    sourceUrl: "https://en.wikipedia.org/wiki/Internet",
    license: "CC-BY-SA",
    licenseNote: "Adapted educational summary; attribute Wikipedia / CC BY-SA",
    topics: ["internet", "technology", "networks", "web", "communication"],
    text:
      "The Internet is a global system of interconnected computer networks that use standard protocols to link devices worldwide. It carries a vast range of information and services, including the World Wide Web, email, and file sharing. Open standards and distributed design help the network scale.",
  },
  {
    id: "pd-education-1",
    title: "Democracy and Education (excerpt)",
    sourceUrl: "https://www.gutenberg.org/ebooks/852",
    license: "public-domain",
    licenseNote: "John Dewey — Project Gutenberg",
    topics: ["education", "learning", "democracy", "school", "teaching"],
    text:
      "Education is not preparation for life; education is life itself. Learning grows from experience when reflection connects what we do with what follows. Schools that invite inquiry help students practice the habits a democratic society needs.",
  },
  {
    id: "wiki-nutrition",
    title: "Nutrition (overview)",
    sourceUrl: "https://en.wikipedia.org/wiki/Nutrition",
    license: "CC-BY-SA",
    licenseNote: "Adapted educational summary; attribute Wikipedia / CC BY-SA",
    topics: ["nutrition", "health", "food", "diet", "biology"],
    text:
      "Nutrition is the study of nutrients in food, how the body uses them, and the relationship between diet and health. Macronutrients include carbohydrates, proteins, and fats. Micronutrients such as vitamins and minerals support metabolism, immunity, and growth.",
  },
  {
    id: "pd-nature-1",
    title: "Walden (excerpt)",
    sourceUrl: "https://www.gutenberg.org/ebooks/205",
    license: "public-domain",
    licenseNote: "Henry David Thoreau — Project Gutenberg",
    topics: ["nature", "simplicity", "environment", "philosophy", "living"],
    text:
      "I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach. Most of the luxuries, and many of the so-called comforts of life, are not only not indispensable, but positive hindrances to the elevation of mankind.",
  },
  {
    id: "wiki-astronomy",
    title: "Solar System (overview)",
    sourceUrl: "https://en.wikipedia.org/wiki/Solar_System",
    license: "CC-BY-SA",
    licenseNote: "Adapted educational summary; attribute Wikipedia / CC BY-SA",
    topics: ["astronomy", "planets", "space", "sun", "science", "solar"],
    text:
      "The Solar System comprises the Sun and the objects bound to it by gravity, including eight planets, dwarf planets, moons, asteroids, and comets. Inner planets are rocky; outer planets are gas and ice giants. The Sun's gravity and radiation dominate the system's dynamics.",
  },
  {
    id: "wiki-ai-ethics",
    title: "Artificial intelligence (overview)",
    sourceUrl: "https://en.wikipedia.org/wiki/Artificial_intelligence",
    license: "CC-BY-SA",
    licenseNote: "Adapted educational summary; attribute Wikipedia / CC BY-SA",
    topics: ["ai", "artificial intelligence", "technology", "ethics", "machine learning"],
    text:
      "Artificial intelligence is the field of computer science that builds systems able to perform tasks that typically require human intelligence, such as recognizing patterns, understanding language, and making decisions. Practical systems raise questions about fairness, privacy, accountability, and human oversight.",
  },
  {
    id: "pd-history-1",
    title: "The History of the Peloponnesian War (excerpt)",
    sourceUrl: "https://www.gutenberg.org/ebooks/7142",
    license: "public-domain",
    licenseNote: "Thucydides — Project Gutenberg",
    topics: ["history", "war", "greece", "politics", "power"],
    text:
      "The strong do what they can and the weak suffer what they must. Thucydides recorded speeches and events not as ornament, but so readers might understand how fear, honor, and interest drive states into conflict.",
  },
];
