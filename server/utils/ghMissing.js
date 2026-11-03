// 📅 Pichhle 30 din (aaj chhod ke) jin dino room bhare the lekin GH ka din Submit nahi hua. Sirf PADHTA hai.
// staffGuard bhi isse use karta hai: staff in "chhoote hue" dino ko khol ke Submit kar sake (baaki purane din band).
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import Stay from "../model/stay.js";
import Entry from "../model/entry.js";

dayjs.extend(customParseFormat);
const F = "DD-MM-YYYY";
let cache = { at: 0, data: [] };
export const clearGhMissing = () => (cache = { at: 0, data: [] });

export const ghMissingDays = async ({ fresh = false } = {}) => {
  if (!fresh && Date.now() - cache.at < 60 * 1000) return cache.data;
  const today = dayjs(new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10));
  const from = today.subtract(30, "day");
  const dates = [];
  for (let x = from; x.isBefore(today, "day"); x = x.add(1, "day")) dates.push(x.format(F));
  const [stays, entries] = await Promise.all([
    Stay.find({ startCreateDate: { $gte: from.subtract(60, "day").toDate(), $lt: today.startOf("day").toDate() } }, { roomNo: 1, startDate: 1, status: 1, checkoutDate: 1 }).lean(),
    Entry.find({ date: { $in: dates } }, { date: 1 }).lean(),
  ]);
  const done = new Set(entries.map((e) => e.date));
  const rooms = {};
  stays.forEach((s) => {
    const st = dayjs(s.startDate, F, true);
    if (!st.isValid()) return;
    const end = s.status === "active" || !s.checkoutDate ? today.subtract(1, "day") : dayjs(s.checkoutDate, F, true).subtract(1, "day");
    for (let x = st.isBefore(from, "day") ? from : st; !x.isAfter(end, "day") && x.isBefore(today, "day"); x = x.add(1, "day")) {
      const k = x.format(F);
      (rooms[k] ||= new Set()).add(s.roomNo);
    }
  });
  const data = dates.filter((d) => rooms[d] && !done.has(d)).map((d) => ({ date: d, rooms: rooms[d].size }));
  cache = { at: Date.now(), data };
  return data;
};
