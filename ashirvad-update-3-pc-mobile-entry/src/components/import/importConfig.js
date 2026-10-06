// Column definitions + client-side validation for each importable data type.
// Server repeats the same checks (never trust the browser alone).

const GH_TYPES = ["Single", "Couple", "Family", "Employee", "NRI", "Foreigner", "Group", "Other"];
const GH_MODES = ["Cash", "Card", "PPC", "PPS", "UnPaid"];
const GH_PERIODS = ["Day", "Night", "Extra Day", "Extra Night"];
const OFFICE_MODES = ["Cash", "Card", "PP", "PPS", "PPC", "UnPaid"];

const s = (v) => (v === undefined || v === null ? "" : String(v).trim());
const n = (v) => (s(v) === "" ? NaN : Number(s(v).replace(/[₹,\s]/g, "")));
const inList = (list, v) => list.some((x) => x.toLowerCase() === s(v).toLowerCase());
const isDate = (v) => /^\d{2}-\d{2}-\d{4}$/.test(s(v));

const findCat = (cats, name) => cats.find((c) => c.categoryName.toLowerCase() === s(name).toLowerCase());
const hasExpense = (cat, name) =>
  (cat?.expense || []).some((e) => e.expenseName.toLowerCase() === s(name).toLowerCase());

const categoryValidValues = (cats) => [
  ["Category", "Expense", "Vendor?"],
  ...cats.flatMap((c) =>
    (c.expense?.length ? c.expense : [{ expenseName: "" }]).map((e) => [
      c.categoryName,
      e.expenseName,
      e.isVendor ? "Yes" : "",
    ])
  ),
];

const today = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

export const IMPORT_MODULES = {
  gh: {
    title: "Guest House – room entries",
    endpoint: "gh-entries",
    templateName: "GH_Entries_Template",
    amountKey: "rate",
    supportsDuplicateMode: true,
    description:
      "One row per room per period. Each room can have only one Day and one Night entry on a date. Room cost and room type are filled automatically from the room number.",
    columns: [
      { key: "date", header: "Date", type: "date", required: true, aliases: ["entrydate", "checkindate"], help: "Entry date, e.g. 15-08-2026" },
      { key: "period", header: "Period", required: true, aliases: ["shift", "daynight"], help: GH_PERIODS.join(" / ") },
      { key: "roomNo", header: "Room No", type: "number", required: true, aliases: ["room", "roomnumber"], width: 80, help: "Must match a room in the system (see Valid Values)" },
      { key: "rate", header: "Rate", type: "number", required: true, aliases: ["amount", "rent"], width: 90, help: "Amount charged for this room" },
      { key: "noOfPeople", header: "People", type: "number", required: true, aliases: ["noofpeople", "persons", "pax"], width: 70, help: "Number of guests" },
      { key: "type", header: "Guest Type", required: true, aliases: ["type", "category"], help: GH_TYPES.join(" / ") },
      { key: "modeOfPayment", header: "Payment Mode", required: true, aliases: ["mode", "modeofpayment", "payment"], help: GH_MODES.join(" / ") },
      { key: "fullname", header: "Guest Name", required: true, aliases: ["name", "fullname"], flex: 1, help: "Guest full name" },
      { key: "mobileNumber", header: "Mobile", aliases: ["mobilenumber", "phone", "mobileno"], help: "10 digit mobile (optional)" },
      { key: "discount", header: "Discount", type: "number", aliases: [], width: 80, help: "Optional, default 0" },
      { key: "checkInTime", header: "Check-in Time", aliases: ["checkin"], help: "Optional, e.g. 10:00 AM" },
      { key: "checkOutTime", header: "Check-out Time", aliases: ["checkout"], help: "Optional, e.g. 10:00 AM" },
    ],
    examples: ({ rooms }) => {
      const r1 = rooms[0]?.roomNumber ?? 101;
      const r2 = rooms[1]?.roomNumber ?? 102;
      return [
        [today(), "Day", r1, 1200, 2, "Couple", "Cash", "Ramesh Patel", "9876543210", 0, "10:00 AM", "10:00 AM"],
        [today(), "Night", r2, 1500, 3, "Family", "UnPaid", "Suresh Shah", "9123456780", 100, "08:00 PM", "10:00 AM"],
      ];
    },
    validValues: ({ rooms }) => {
      const max = Math.max(rooms.length, GH_TYPES.length, GH_MODES.length, GH_PERIODS.length);
      const out = [["Room No", "Room Type", "Room Cost", "Period", "Guest Type", "Payment Mode"]];
      for (let i = 0; i < max; i++) {
        out.push([
          rooms[i]?.roomNumber ?? "",
          rooms[i]?.roomType ?? "",
          rooms[i]?.roomCost ?? "",
          GH_PERIODS[i] ?? "",
          GH_TYPES[i] ?? "",
          GH_MODES[i] ?? "",
        ]);
      }
      return out;
    },
    validate: (r, { rooms }) => {
      const e = [];
      if (!isDate(r.date)) e.push("Invalid date");
      if (!inList(["day", "night", "extra day", "extra night", "extraday", "extranight"], r.period)) e.push("Bad period");
      if (rooms.length && !rooms.some((x) => x.roomNumber === n(r.roomNo))) e.push(`Room ${s(r.roomNo) || "?"} not found`);
      if (!(n(r.rate) > 0)) e.push("Rate must be > 0");
      if (!(n(r.noOfPeople) > 0)) e.push("People must be > 0");
      if (!inList(GH_TYPES, r.type)) e.push("Bad guest type");
      if (!inList(GH_MODES, r.modeOfPayment)) e.push("Bad payment mode");
      if (!s(r.fullname)) e.push("Name missing");
      const m = s(r.mobileNumber).replace(/\D/g, "");
      if (m && m.length !== 10) e.push("Mobile not 10 digits");
      if (s(r.discount) && !(n(r.discount) >= 0)) e.push("Bad discount");
      return e;
    },
    duplicateKey: (r) =>
      isDate(r.date) && s(r.roomNo) ? `${r.date}|${s(r.period).toLowerCase().replace(/\s/g, "")}|${n(r.roomNo)}` : null,
  },

  office: {
    title: "Office Book – In / Out",
    endpoint: "office-book",
    templateName: "Office_Book_Template",
    amountKey: "amount",
    description:
      "One row per transaction. Section = In (money received) or Out (money paid). Category and Expense must already exist under Office Category.",
    columns: [
      { key: "date", header: "Date", type: "date", required: true, aliases: [], help: "Transaction date, e.g. 15-08-2026" },
      { key: "section", header: "Section", required: true, aliases: ["inout", "type"], width: 80, help: "In or Out" },
      { key: "amount", header: "Amount", type: "number", required: true, aliases: ["amt"], width: 100, help: "Amount in ₹" },
      { key: "modeOfPayment", header: "Payment Mode", required: true, aliases: ["mode", "modeofpayment"], help: OFFICE_MODES.join(" / ") },
      { key: "fullname", header: "Name", required: true, aliases: ["fullname", "party", "partyname"], flex: 1, help: "Person / party name" },
      { key: "categoryName", header: "Category", required: true, aliases: ["categoryname"], help: "See Valid Values sheet" },
      { key: "expenseName", header: "Expense", required: true, aliases: ["expensename", "head"], help: "Must belong to the category" },
      { key: "isVendor", header: "Vendor (Yes/No)", aliases: ["vendor", "isvendor"], width: 90, help: "Optional" },
      { key: "remark", header: "Remark", aliases: ["note", "notes"], flex: 1, help: "Optional" },
    ],
    examples: ({ officeCats }) => {
      const c = officeCats[0];
      const cat = c?.categoryName ?? "Banquet";
      const exp = c?.expense?.[0]?.expenseName ?? "Booking";
      return [
        [today(), "In", 25000, "Card", "Mehta Family", cat, exp, "No", "Advance"],
        [today(), "Out", 3500, "Cash", "Shree Decorators", cat, exp, "Yes", ""],
      ];
    },
    validValues: ({ officeCats }) => categoryValidValues(officeCats),
    validate: (r, { officeCats }) => {
      const e = [];
      if (!isDate(r.date)) e.push("Invalid date");
      if (!inList(["in", "out", "office in", "office out", "credit", "debit", "jama", "udhar", "kharch"], r.section)) e.push("Section must be In/Out");
      if (!(n(r.amount) > 0)) e.push("Amount must be > 0");
      if (!inList(OFFICE_MODES, r.modeOfPayment)) e.push("Bad payment mode");
      if (!s(r.fullname)) e.push("Name missing");
      if (officeCats.length) {
        const cat = findCat(officeCats, r.categoryName);
        if (!cat) e.push(`Category "${s(r.categoryName)}" not found`);
        else if (!hasExpense(cat, r.expenseName)) e.push(`Expense "${s(r.expenseName)}" not in ${cat.categoryName}`);
      }
      return e;
    },
  },

  rest: {
    title: "Restaurant – expenses",
    endpoint: "rest-expenses",
    templateName: "Restaurant_Expenses_Template",
    amountKey: "amount",
    description:
      "One row per expense. Rows are added to that date's restaurant entry and the day's totals are recalculated. Category and Expense must already exist.",
    columns: [
      { key: "date", header: "Date", type: "date", required: true, aliases: [], help: "Expense date, e.g. 15-08-2026" },
      { key: "amount", header: "Amount", type: "number", required: true, aliases: ["amt"], width: 100, help: "Amount in ₹" },
      { key: "categoryName", header: "Category", required: true, aliases: ["categoryname"], help: "See Valid Values sheet" },
      { key: "expenseName", header: "Expense", required: true, aliases: ["expensename", "head"], help: "Must belong to the category" },
      { key: "fullname", header: "Staff / Party Name", aliases: ["name", "fullname", "staff"], flex: 1, help: "Optional; use for Staff salaries" },
      { key: "isVendor", header: "Vendor (Yes/No)", aliases: ["vendor", "isvendor"], width: 90, help: "Optional; defaults to the expense setting" },
    ],
    examples: ({ restCats }) => {
      const c = restCats[0];
      const cat = c?.categoryName ?? "Grocery";
      const exp = c?.expense?.[0]?.expenseName ?? "Vegetables";
      return [
        [today(), 1850, cat, exp, "", ""],
        [today(), 640, cat, exp, "", ""],
      ];
    },
    validValues: ({ restCats }) => categoryValidValues(restCats),
    validate: (r, { restCats }) => {
      const e = [];
      if (!isDate(r.date)) e.push("Invalid date");
      if (!(n(r.amount) > 0)) e.push("Amount must be > 0");
      if (restCats.length) {
        const cat = findCat(restCats, r.categoryName);
        if (!cat) e.push(`Category "${s(r.categoryName)}" not found`);
        else if (!hasExpense(cat, r.expenseName)) e.push(`Expense "${s(r.expenseName)}" not in ${cat.categoryName}`);
      }
      return e;
    },
  },
};
