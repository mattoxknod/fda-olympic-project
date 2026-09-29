// Flags for NOC (country) codes, hand-drawn as colored bands + a simple
// accent (star / circle / cross) rather than relying on Unicode flag emoji.
// Emoji flags depend on the viewer's OS having a color-emoji font, and don't
// reliably render inside SVG <text> across browsers - so instead every flag
// here is drawn directly (a few rects, sometimes a circle), which renders
// identically everywhere.
//
// This also solves the "old flags" ask cleanly: defunct entities that show
// up in the data as their OWN NOC code - the Soviet Union (URS) and East
// Germany (GDR) chief among them - get their own historical flag, distinct
// from their modern successor's flag. Deliberately NOT attempted: any
// Nazi-era German flag. This dataset's "GER" code spans every German era in
// one bucket (pre-war through today), so GER simply always shows modern
// Germany's flag; the swastika era is never rendered here, full stop.
// Also NOT mapped: Chinese Taipei (TPE), which competes at the Olympics
// under a special neutral banner rather than any national flag.
//
// Coverage is curated (not all 230 NOCs) - real flags for the countries
// most likely to actually appear in the charts and dashboard, and an
// honest neutral placeholder (not a wrong flag) for everything else.

const FLAG_SPECS = {
  // --- Historical / defunct entities ---
  URS: { bands: ["#CC0000"], accent: { type: "star", color: "#FFD100" } },
  GDR: { bands: ["#000000", "#D00000", "#FFCC00"], accent: { type: "circle", color: "#FFCC00", r: 2.4 } },
  TCH: { bands: ["#FFFFFF", "#D7141A"], accent: { type: "triangle", color: "#11457E" } },
  // The Yugoslav star is red with a gold border, not solid gold.
  YUG: { bands: ["#0C4076", "#FFFFFF", "#D7141A"], accent: { type: "star", color: "#D7141A" } },

  // --- Americas ---
  // USA: 13 stripes approximated as 5 red/white bands, plus the navy canton
  // (real flag: 7 red + 6 white stripes and a star-filled blue canton).
  USA: { bands: ["#B22234", "#FFFFFF", "#B22234", "#FFFFFF", "#B22234"], accent: { type: "canton", color: "#3C3B6E" } },
  CAN: { bands: ["#D80621", "#FFFFFF", "#D80621"], orientation: "v" },
  MEX: { bands: ["#006847", "#FFFFFF", "#CE1126"], orientation: "v" },
  BRA: { bands: ["#009739"], accent: { type: "diamond", color: "#FEDD00" } },
  ARG: { bands: ["#74ACDF", "#FFFFFF", "#74ACDF"] },
  // Chile: white over red, with a blue canton (star omitted - no room to nest it).
  CHI: { bands: ["#FFFFFF", "#D52B1E"], accent: { type: "canton", color: "#0039A6", w: 0.4, h: 0.5 } },
  COL: { bands: ["#FCD116", "#003893", "#CE1126"] },
  PER: { bands: ["#D91023", "#FFFFFF", "#D91023"], orientation: "v" },
  URU: { bands: ["#FFFFFF", "#0038A8", "#FFFFFF", "#0038A8", "#FFFFFF"] },
  CUB: { bands: ["#002A8F", "#FFFFFF", "#002A8F", "#FFFFFF", "#002A8F"], accent: { type: "triangle", color: "#CF142B" } },
  JAM: { bands: ["#000000", "#FED100", "#007847"] },
  VEN: { bands: ["#FFCC00", "#00247D", "#CF142B"] },
  ECU: { bands: ["#FFDD00", "#034EA2", "#ED1C24"] },
  BOL: { bands: ["#D52B1E", "#FFD500", "#007A33"] },
  PAR: { bands: ["#D52B1E", "#FFFFFF", "#0038A8"] },
  CRC: { bands: ["#002B7F", "#FFFFFF", "#CE1126", "#FFFFFF", "#002B7F"] },
  // Panama's real design is quartered (not stripes) - simplified to its two
  // dominant colors rather than risk a misplaced star.
  PAN: { bands: ["#FFFFFF", "#DA121A"], orientation: "v" },
  // Dominican Republic: a white cross on a blue/red field (not 3 plain bands).
  DOM: { bands: ["#002D62", "#CE1126"], accent: { type: "cross", color: "#FFFFFF" } },

  // --- Western / Northern Europe ---
  GBR: { bands: ["#012169", "#FFFFFF", "#C8102E"], accent: { type: "cross", color: "#FFFFFF" } },
  IRL: { bands: ["#169B62", "#FFFFFF", "#FF883E"], orientation: "v" },
  FRA: { bands: ["#0055A4", "#FFFFFF", "#EF4135"], orientation: "v" },
  GER: { bands: ["#000000", "#DD0000", "#FFCE00"] },
  FRG: { bands: ["#000000", "#DD0000", "#FFCE00"] },
  NED: { bands: ["#AE1C28", "#FFFFFF", "#21468B"] },
  BEL: { bands: ["#000000", "#FAE042", "#ED2939"], orientation: "v" },
  LUX: { bands: ["#EF3340", "#FFFFFF", "#00A1DE"] },
  SUI: { bands: ["#D52B1E"], accent: { type: "cross", color: "#FFFFFF" } },
  AUT: { bands: ["#ED2939", "#FFFFFF", "#ED2939"] },
  ITA: { bands: ["#009246", "#FFFFFF", "#CE2B37"], orientation: "v" },
  ESP: { bands: ["#AA151B", "#F1BF00", "#AA151B"] },
  POR: { bands: ["#046A38", "#DA291C"], orientation: "v" },
  GRE: { bands: ["#0D5EAF", "#FFFFFF", "#0D5EAF", "#FFFFFF"] },
  MLT: { bands: ["#FFFFFF", "#CF142B"], orientation: "v" },
  CYP: { bands: ["#FFFFFF"], accent: { type: "circle", color: "#D57800", r: 2.4 } },

  SWE: { bands: ["#006AA7"], accent: { type: "cross", color: "#FECC02" } },
  // Norway's cross is navy blue (with a white fimbriation, omitted here), not white.
  NOR: { bands: ["#EF2B2D"], accent: { type: "cross", color: "#00205B" } },
  DEN: { bands: ["#C8102E"], accent: { type: "cross", color: "#FFFFFF" } },
  FIN: { bands: ["#FFFFFF"], accent: { type: "cross", color: "#003580" } },
  ISL: { bands: ["#02529C"], accent: { type: "cross", color: "#DC1E35" } },

  // --- Central / Eastern Europe ---
  POL: { bands: ["#FFFFFF", "#DC143C"] },
  CZE: { bands: ["#FFFFFF", "#D7141A"], accent: { type: "triangle", color: "#11457E" } },
  SVK: { bands: ["#FFFFFF", "#0B4EA2", "#EE1C25"] },
  HUN: { bands: ["#CE2939", "#FFFFFF", "#477050"] },
  ROU: { bands: ["#002B7F", "#FCD116", "#CE1126"], orientation: "v" },
  BUL: { bands: ["#FFFFFF", "#00966E", "#D62612"] },
  ALB: { bands: ["#E41E20"], accent: { type: "star", color: "#000000" } },
  SRB: { bands: ["#C6363C", "#0C4076", "#FFFFFF"] },
  CRO: { bands: ["#FF0000", "#FFFFFF", "#171796"] },
  SLO: { bands: ["#FFFFFF", "#005CE7", "#FF0000"] },
  BIH: { bands: ["#002395", "#FECB00"] },
  // Both are predominantly RED fields with a gold emblem, not half-gold bands.
  MNE: { bands: ["#C40308"], accent: { type: "circle", color: "#D3AF52", r: 3 } },
  MKD: { bands: ["#D20000"], accent: { type: "circle", color: "#FFE600", r: 3 } },
  UKR: { bands: ["#0057B7", "#FFD700"] },
  BLR: { bands: ["#D22730", "#00AF66"] },
  LTU: { bands: ["#FDB913", "#006A44", "#C1272D"] },
  LAT: { bands: ["#9E3039", "#FFFFFF", "#9E3039"] },
  EST: { bands: ["#0072CE", "#000000", "#FFFFFF"] },
  MDA: { bands: ["#003DA5", "#FFD200", "#CC092F"], orientation: "v" },
  GEO: { bands: ["#FFFFFF"], accent: { type: "cross", color: "#FF0000" } },
  ARM: { bands: ["#D90012", "#0033A0", "#F2A800"] },
  AZE: { bands: ["#00B9E4", "#EF3340", "#00AF66"], accent: { type: "crescent", color: "#FFFFFF" } },
  KAZ: { bands: ["#00AFCA"], accent: { type: "circle", color: "#FEC50C", r: 2.4 } },
  RUS: { bands: ["#FFFFFF", "#0039A6", "#D52B1E"] },

  // --- Asia ---
  CHN: { bands: ["#DE2910"], accent: { type: "star", color: "#FFDE00" } },
  JPN: { bands: ["#FFFFFF"], accent: { type: "circle", color: "#BC002D", r: 2.6 } },
  KOR: { bands: ["#FFFFFF"], accent: { type: "circle", color: "#C60C30", r: 2.2 } },
  PRK: { bands: ["#024FA2", "#FFFFFF", "#ED1C27", "#FFFFFF", "#024FA2"] },
  IND: { bands: ["#FF9933", "#FFFFFF", "#138808"], accent: { type: "circle", color: "#000080", r: 1.4 } },
  PAK: { bands: ["#01411C"], accent: { type: "crescent", color: "#FFFFFF" } },
  BAN: { bands: ["#006A4E"], accent: { type: "circle", color: "#F42A41", r: 2.4 } },
  // Sri Lanka's real flag is a maroon field with green/saffron hoist stripes
  // and a lion emblem - approximated here as three vertical bands.
  SRI: { bands: ["#00534E", "#FF9933", "#8D153A"], orientation: "v" },
  MGL: { bands: ["#C4272F", "#015197", "#C4272F"], orientation: "v" },
  THA: { bands: ["#A51931", "#F4F5F8", "#2D2A4A", "#F4F5F8", "#A51931"] },
  VIE: { bands: ["#DA251D"], accent: { type: "star", color: "#FFFF00" } },
  PHI: { bands: ["#0038A8", "#CE1126"], accent: { type: "star", color: "#FCD116" } },
  // Malaysia is predominantly red/white stripes (14 of them) with a small
  // blue canton, not half navy/half red.
  MAS: { bands: ["#CC0001", "#FFFFFF", "#CC0001", "#FFFFFF"], accent: { type: "canton", color: "#010066" } },
  SIN: { bands: ["#EF3340", "#FFFFFF"], accent: { type: "star", color: "#FFFFFF" } },
  INA: { bands: ["#FF0000", "#FFFFFF"] },
  HKG: { bands: ["#DE2910"], accent: { type: "circle", color: "#FFFFFF", r: 2.6 } },

  // --- Middle East ---
  TUR: { bands: ["#E30A17"], accent: { type: "crescent", color: "#FFFFFF" } },
  ISR: { bands: ["#FFFFFF", "#0038B8", "#FFFFFF"], accent: { type: "star", color: "#0038B8" } },
  IRI: { bands: ["#239F40", "#FFFFFF", "#DA0000"] },
  IRQ: { bands: ["#CE1126", "#FFFFFF", "#000000"] },
  KSA: { bands: ["#006C35"] },
  UAE: { bands: ["#00732F", "#FFFFFF", "#000000"] },
  // Qatar's split is vertical (white at hoist), not horizontal.
  QAT: { bands: ["#FFFFFF", "#8D1B3D"], orientation: "v" },
  // Jordan's hoist triangle is red, not a red star on plain green.
  JOR: { bands: ["#000000", "#FFFFFF", "#007A3D"], accent: { type: "triangle", color: "#CE1126" } },
  LIB: { bands: ["#EE161F", "#FFFFFF", "#EE161F"], accent: { type: "circle", color: "#00A651", r: 2 } },
  EGY: { bands: ["#CE1126", "#FFFFFF", "#000000"] },

  // --- Africa ---
  RSA: { bands: ["#007A4D", "#FFB612", "#000000"] },
  KEN: { bands: ["#000000", "#BB0000", "#006600"] },
  NGR: { bands: ["#008751", "#FFFFFF", "#008751"], orientation: "v" },
  ETH: { bands: ["#078930", "#FCDD09", "#DA121A"] },
  GHA: { bands: ["#CE1126", "#FCD116", "#006B3F"], accent: { type: "star", color: "#000000" } },
  MAR: { bands: ["#C1272D"], accent: { type: "star", color: "#006233" } },
  ALG: { bands: ["#006233", "#FFFFFF"], accent: { type: "crescent", color: "#D21034" } },
  TUN: { bands: ["#E70013"], accent: { type: "circle", color: "#FFFFFF", r: 2.6 } },
  ZIM: { bands: ["#006400", "#FFD200", "#D40000", "#000000"] },
  UGA: { bands: ["#000000", "#FCDC04", "#D90000"] },
  CMR: { bands: ["#007A5E", "#CE1126", "#FCD116"], orientation: "v", accent: { type: "star", color: "#FCD116" } },
  CIV: { bands: ["#F77F00", "#FFFFFF", "#009E60"], orientation: "v" },
  SEN: { bands: ["#00853F", "#FDEF42", "#E31B23"], orientation: "v", accent: { type: "star", color: "#00853F" } },
  // Namibia's real flag is a diagonal design (blue/red/green with a gold
  // sun) - approximated here as a wider band set so red isn't lost entirely.
  NAM: { bands: ["#003580", "#FFFFFF", "#D21034", "#FFFFFF", "#009543"] },

  // --- Oceania ---
  AUS: { bands: ["#00008B"], accent: { type: "star", color: "#FFFFFF" } },
  NZL: { bands: ["#00247D"], accent: { type: "star", color: "#CC142B" } },
  FIJ: { bands: ["#68BFE5"] },
};

function drawKind(code) {
  const spec = FLAG_SPECS[code];
  if (!spec) return { type: "none" };
  return { type: "flag", spec };
}

// Kept for API compatibility with earlier drafts of this module.
function flagFor(noc) {
  return drawKind(noc);
}

window.Flags = { flagFor, FLAG_SPECS };
