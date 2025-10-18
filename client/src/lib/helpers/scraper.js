import * as cheerio from "cheerio";

function parsePercentageText(fullness) {
  /*
    accepts '84%', '100% Full', '53 %', 'Full', 'Open', 'N/A', etc.
    returns an int 0–100, or None when no numeric signal.
  */

  if (typeof fullness !== "string") return null;

  // word-only signals
  const formattedFullness = fullness.trim().toLowerCase();
  const acceptedValues = ["open", "n/a", "na", "-", "—"];
  if (formattedFullness === "full") {
    return 100;
  } else if (acceptedValues.includes(formattedFullness)) {
    return 0;
  }

  //  numeric anywhere in the string (e.g., '100% Full', '53 %')
  const hasNumsRegex = new RegExp(/(\d+)/, "g");
  if (hasNumsRegex.test(formattedFullness)) {
    const fullnessVal = Number(formattedFullness.replace(/\D/g, ""));
    return fullnessVal;
  }

  return null;
}

export function scrapeData(html) {
  const $ = cheerio.load(html);

  // Last Updated Raw: "10/9/2025 10:00 AM"
  const lastUpdatedRaw = $("p.timestamp")
    .text()
    .replace("Last updated ", "")
    .replace(" Refresh", "");
  const lastUpdated = new Date(lastUpdatedRaw).toISOString();

  const garages = $("div.garage").find("span.garage__fullness");
  const parkingLots = [
    "sjsu-south-garage",
    "sjsu-west-garage",
    "sjsu-north-garage",
    "sjsu-south-campus-garage",
  ];
  let data = [];
  garages.each((index, element) => {
    const garage = $(element);
    data.push({
      lot_id: parkingLots[index],
      occupancy_pct: parsePercentageText(garage.text()),
      observed_at: lastUpdated,
    });
  });

  return data;
}
