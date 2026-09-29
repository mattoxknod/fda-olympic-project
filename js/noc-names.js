// Readable names for the NOC codes referenced in the report and dashboard.
// Only covers codes that actually appear in the charted findings; the raw
// NOC code is used as a fallback for anything not listed here.
window.NOC_NAMES = {
  USA: "United States", URS: "Soviet Union", GER: "Germany", GBR: "Great Britain",
  FRA: "France", ITA: "Italy", SWE: "Sweden", CHN: "China", RUS: "Russia",
  AUS: "Australia", GDR: "East Germany", HUN: "Hungary", JPN: "Japan",
  CAN: "Canada", NOR: "Norway", KOR: "South Korea", ESP: "Spain", GRE: "Greece",
  BRA: "Brazil", NED: "Netherlands", FIN: "Finland", POL: "Poland",
  SUI: "Switzerland", ROU: "Romania", BUL: "Bulgaria", CUB: "Cuba",
  DEN: "Denmark", NZL: "New Zealand", BEL: "Belgium", CZE: "Czech Republic",
};
function nocName(code) {
  return window.NOC_NAMES[code] || code;
}
