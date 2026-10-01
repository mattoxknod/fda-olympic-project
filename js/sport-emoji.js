// A small visual touch: a representative emoji per Olympic sport, used
// wherever a sport name is displayed (dashboard filter/charts, the report's
// scatter and diverging-bar charts). Generic pictograph emoji (not flag
// sequences) render reliably as color glyphs across browsers, unlike the
// regional-indicator flag emoji this project deliberately avoids elsewhere
// (see js/flags.js) - so plain text prefixing is safe here.
window.SPORT_EMOJI = {
  "Alpine Skiing": "⛷️", "Archery": "🏹", "Art Competitions": "🎨",
  "Athletics": "🏃", "Badminton": "🏸", "Baseball": "⚾",
  "Basketball": "🏀", "Beach Volleyball": "🏖️", "Biathlon": "🎿",
  "Bobsleigh": "🛷", "Boxing": "🥊", "Canoeing": "🛶",
  "Cricket": "🏏", "Cross Country Skiing": "🎿", "Curling": "🥌",
  "Cycling": "🚴", "Diving": "🤿", "Equestrianism": "🏇",
  "Fencing": "🤺", "Figure Skating": "⛸️", "Football": "⚽",
  "Freestyle Skiing": "🎿", "Golf": "⛳", "Gymnastics": "🤸",
  "Handball": "🤾", "Hockey": "🏑", "Ice Hockey": "🏒",
  "Judo": "🥋", "Lacrosse": "🥍", "Luge": "🛷",
  "Modern Pentathlon": "5️⃣", "Nordic Combined": "⛷️", "Polo": "🏇",
  "Rhythmic Gymnastics": "🎀", "Rowing": "🚣", "Rugby": "🏉",
  "Rugby Sevens": "🏉", "Sailing": "⛵", "Shooting": "🎯",
  "Short Track Speed Skating": "⛸️", "Skeleton": "🛷", "Ski Jumping": "🎿",
  "Snowboarding": "🏂", "Softball": "🥎", "Speed Skating": "⛸️",
  "Swimming": "🏊", "Synchronized Swimming": "🧜", "Table Tennis": "🏓",
  "Taekwondo": "🦿", "Tennis": "🎾", "Trampolining": "🤸",
  "Triathlon": "🏊🚴", "Volleyball": "🏐", "Water Polo": "🤽",
  "Weightlifting": "🏋️", "Wrestling": "🤼",
};

function sportEmoji(sport) {
  return window.SPORT_EMOJI[sport] || "🏅"; // generic medal fallback
}
