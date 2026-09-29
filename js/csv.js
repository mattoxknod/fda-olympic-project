// Minimal quoted-CSV parser (handles embedded commas/quotes), shared by the
// dashboard. Returns typed row objects matching athlete_events.csv's columns.
function parseAthleteCSV(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }

  const header = rows[0];
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const num = (v) => (v === "NA" || v === "" ? null : Number(v));
  const str = (v) => (v === "NA" ? null : v);

  return rows.slice(1).map((r) => ({
    ID: r[idx.ID],
    Name: r[idx.Name],
    Sex: r[idx.Sex],
    Age: num(r[idx.Age]),
    Height: num(r[idx.Height]),
    Weight: num(r[idx.Weight]),
    Team: r[idx.Team],
    NOC: r[idx.NOC],
    Games: r[idx.Games],
    Year: Number(r[idx.Year]),
    Season: r[idx.Season],
    City: r[idx.City],
    Sport: r[idx.Sport],
    Event: r[idx.Event],
    Medal: str(r[idx.Medal]),
  }));
}
