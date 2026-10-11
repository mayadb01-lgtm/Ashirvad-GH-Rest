// 📅 Forecast ke liye tyohar / chhutti / shaadi ke din (sirf padhne ke liye, koi DB nahi).
// Har saal naye dates yahan jodna (YYYY-MM-DD, start aur end dono shamil).
// Purane saal ke dates se app khud asar (effect) naapta hai; aage ke dates pe wahi asar lagata hai.

export const EVENTS = {
  Uttarayan: [["2025-01-14", "2025-01-15"], ["2026-01-14", "2026-01-15"], ["2027-01-14", "2027-01-15"]],
  "Republic Day": [["2025-01-26", "2025-01-26"], ["2026-01-26", "2026-01-26"], ["2027-01-26", "2027-01-26"]],
  "Valentine's Day": [["2025-02-14", "2025-02-14"], ["2026-02-14", "2026-02-14"], ["2027-02-14", "2027-02-14"]],
  "Maha Shivratri": [["2025-02-26", "2025-02-26"], ["2026-02-15", "2026-02-15"], ["2027-03-06", "2027-03-06"]],
  "Holi / Dhuleti": [["2025-03-13", "2025-03-14"], ["2026-03-03", "2026-03-04"], ["2027-03-21", "2027-03-22"]],
  "Ram Navami": [["2025-04-06", "2025-04-06"], ["2026-03-26", "2026-03-26"], ["2027-04-15", "2027-04-15"]],
  "Akshaya Tritiya": [["2025-04-30", "2025-04-30"], ["2026-04-19", "2026-04-19"], ["2027-05-09", "2027-05-09"]],
  "Raksha Bandhan": [["2025-08-09", "2025-08-09"], ["2026-08-28", "2026-08-28"], ["2027-08-17", "2027-08-17"]],
  "Independence Day": [["2025-08-15", "2025-08-15"], ["2026-08-15", "2026-08-15"], ["2027-08-15", "2027-08-15"]],
  Janmashtami: [["2025-08-15", "2025-08-17"], ["2026-09-03", "2026-09-05"], ["2027-08-24", "2027-08-26"]],
  "Ganesh Chaturthi": [["2025-08-27", "2025-08-27"], ["2026-09-14", "2026-09-14"], ["2027-09-04", "2027-09-04"]],
  "Pitru Paksha (Shraddh)": [["2025-09-07", "2025-09-21"]],
  Navratri: [["2025-09-22", "2025-10-01"], ["2026-10-11", "2026-10-19"], ["2027-09-30", "2027-10-08"]],
  Dussehra: [["2025-10-02", "2025-10-02"], ["2026-10-20", "2026-10-20"], ["2027-10-09", "2027-10-09"]],
  "Diwali week": [["2025-10-18", "2025-10-23"], ["2026-11-06", "2026-11-11"], ["2027-10-26", "2027-10-31"]],
  "After Diwali": [["2025-10-24", "2025-11-05"], ["2026-11-12", "2026-11-24"], ["2027-11-01", "2027-11-13"]],
  "Christmas–New Year": [["2024-12-24", "2025-01-01"], ["2025-12-24", "2026-01-01"], ["2026-12-24", "2027-01-01"], ["2027-12-24", "2028-01-01"]],
};

// Har tyohar pe kya karna hai (owner ke liye seedha kaam)
export const EVENT_INFO = {
  Uttarayan: { kind: "Festival", action: "Undhiyu/jalebi and terrace-party combos." },
  "Republic Day": { kind: "Holiday", action: "Short-break offer for families." },
  "Valentine's Day": { kind: "Event", action: "Couple dinner and room package." },
  "Maha Shivratri": { kind: "Festival", action: "Farali (fasting) menu." },
  "Holi / Dhuleti": { kind: "Festival", action: "Holi lunch / thandai specials." },
  "Ram Navami": { kind: "Festival", action: "Normal planning." },
  "Akshaya Tritiya": { kind: "Wedding", action: "Big wedding day: rooms fill, restaurant quieter." },
  "Raksha Bandhan": { kind: "Festival", action: "Family thali and sweets pre-orders." },
  "Independence Day": { kind: "Holiday", action: "Family lunch offer." },
  Janmashtami: { kind: "Festival", action: "Gujarat travel days: push rooms online." },
  "Ganesh Chaturthi": { kind: "Festival", action: "Rooms busier, restaurant quieter." },
  "Pitru Paksha (Shraddh)": { kind: "Season", action: "Lower stock; plan for Navratri." },
  Navratri: { kind: "Festival", action: "Navratri package or small room discount; give staff leave now." },
  Dussehra: { kind: "Festival", action: "Extra farsan stock; family dinner offer." },
  "Diwali week": { kind: "Festival", action: "Stock early, extra staff, sweet/thali boxes, pre-orders." },
  "After Diwali": { kind: "Season", action: "Raise room rates ~10%; push online bookings." },
  "Christmas–New Year": { kind: "Festival", action: "New Year dinner/party package; book group tables early." },
};

// 💍 Shaadi ke muhurat (banquet). Source: SmartPuja 2026, tempora.ltd 2027 (local panchang se pakka karein).
export const MUHURAT = {
  "2026-11": "21, 24, 25, 26",
  "2026-12": "2, 3, 4, 5, 6, 11, 12",
  "2027-01": "14, 15, 19, 20, 24, 27, 29",
  "2027-02": "3, 11, 16, 21, 23, 26, 28",
  "2027-03": "2, 4, 10, 11",
  "2027-04": "18, 19, 21, 23, 26, 28",
  "2027-05": "3, 4, 8, 9, 16, 17, 21, 23, 25, 31",
  "2027-06": "1, 5, 10, 13, 15, 19, 21, 27",
  "2027-07": "2, 9, 10",
  "2027-11": "10, 11, 16, 21, 23, 24, 26, 30",
  "2027-12": "8, 9, 13, 14",
};
