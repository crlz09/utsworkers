export const US_STATE_ABBREVIATIONS = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
};

export function normalizeZipCode(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 5);
}

export function getFullStateName(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  const upper = trimmed.toUpperCase();
  return US_STATE_ABBREVIATIONS[upper] || trimmed;
}

export function findLocationIdByState(locations, stateName) {
  const normalizedState = getFullStateName(stateName).toLowerCase();
  if (!normalizedState) return "";

  return (
    locations.find((location) => location.name?.toLowerCase() === normalizedState)?.id ||
    ""
  );
}

export async function lookupUsZipCode(zipCode) {
  const zip = normalizeZipCode(zipCode);
  if (zip.length !== 5) return null;

  const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
  if (!response.ok) return null;

  const data = await response.json();
  const place = data?.places?.[0];
  if (!place) return null;

  return {
    city: place["place name"] || "",
    state: getFullStateName(place.state || place["state abbreviation"]),
    stateAbbreviation: place["state abbreviation"] || "",
  };
}
