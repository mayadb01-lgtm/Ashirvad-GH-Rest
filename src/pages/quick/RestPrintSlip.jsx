// Restaurant daily report, printed from the browser in the counter receipt layout (80 mm roll; also fine on A4).
// Same sections and words as the hotel PC thermal slip: expenses, staff advance, receivables, room food bills (POS),
// payables, old dues collected, daily summary. Rendered into <body> only while printing (print CSS hides the app).
import { useEffect } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { chargeParts } from "../../utils/payParts";
import { BUSINESS } from "../../business";

dayjs.extend(customParseFormat);

const num = (v) => Number(v) || 0;
const inr = (v) => `${num(v) < 0 ? "-" : ""}₹${Math.abs(Math.round(num(v))).toLocaleString("en-IN")}`;
const modeLabel = (m) => (m === "PP" ? "PP (UPI)" : m || "-");
const POS_MODE = { CASH: "Cash", UPI: "PP", CARD: "Card" };

const CSS = `
@media screen { .rest-slip { display: none; } }
@media print {
  @page { size: 80mm auto; margin: 3mm; }
  body > *:not(.rest-slip) { display: none !important; }
  html, body { background: #fff !important; }
  .rest-slip { display: block; width: 72mm; color: #000; font: 11px/1.35 "Roboto Mono", "Consolas", "Courier New", monospace; }
  .rest-slip .title { text-align: center; font-weight: 700; font-size: 14px; }
  .rest-slip .center { text-align: center; }
  .rest-slip .small { font-size: 9.5px; }
  .rest-slip .dash { border-top: 1px dashed #000; margin: 4px 0; }
  .rest-slip .bar { background: #000 !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;
    font-weight: 700; text-align: center; padding: 1px 0; margin: 8px 0 3px; }
  .rest-slip table { width: 100%; border-collapse: collapse; }
  .rest-slip td { padding: 0.5px 0; vertical-align: top; }
  .rest-slip td.n { width: 5mm; }
  .rest-slip td.r { text-align: right; white-space: nowrap; padding-left: 4px; }
  .rest-slip tr.head td { font-weight: 700; border-bottom: 1px solid #000; }
  .rest-slip tr.b td { font-weight: 700; }
  .rest-slip tr.line td { border-top: 1px solid #000; }
  .rest-slip .sign { display: flex; justify-content: space-between; margin-top: 34px; font-size: 9.5px; }
}`;

const LISTS = [
  ["expenses", "EXPENSES", "Expense", "Total Expenses"],
  ["upad", "STAFF ADVANCE", "Staff", "Total Staff advance"],
  ["pending", "RECEIVABLES", "Collect from", "Total Receivables"],
  ["pendingUsers", "PAYABLES", "Vendor", "Total Payables"],
];

const List = ({ rows, head, renderName, total, extra }) => (
  <table>
    <tbody>
      <tr className="head">
        <td className="n">#</td>
        <td>{head}</td>
        {extra && <td>{extra.head}</td>}
        <td className="r">Amount</td>
      </tr>
      {rows.length === 0 && (
        <tr>
          <td className="n">-</td>
          <td colSpan={extra ? 3 : 2}>None</td>
        </tr>
      )}
      {rows.map((r, i) => (
        <tr key={i}>
          <td className="n">{i + 1}</td>
          <td>{renderName(r)}</td>
          {extra && <td>{extra.cell(r)}</td>}
          <td className="r">{inr(r.amount)}</td>
        </tr>
      ))}
      {total && (
        <tr className="b">
          <td colSpan={extra ? 3 : 2}>{total[0]}</td>
          <td className="r">{total[1]}</td>
        </tr>
      )}
    </tbody>
  </table>
);

const RestPrintSlip = ({ open, onDone, date, doc, posDay, dues, roomLinks, showTotals, printedBy }) => {
  useEffect(() => {
    if (!open) return undefined;
    const after = () => onDone();
    window.addEventListener("afterprint", after);
    const t = setTimeout(() => window.print(), 150); // let the slip render first
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", after);
    };
  }, [open, onDone]);

  if (!open || !doc) return null;

  const rowsOf = (k) => (doc[k] || []).filter((r) => num(r.amount) > 0);
  const sums = Object.fromEntries(LISTS.map(([k]) => [k, rowsOf(k).reduce((s, r) => s + num(r.amount), 0)]));
  const roomRows = posDay?.room_bills?.rows || [];

  // money received at the restaurant counter this day for OLD bills (never today's sale)
  const old = [];
  (dues?.receipts || [])
    .filter((r) => !r.cancelled && num(r.amount) > 0)
    .forEach((r) => old.push({ name: r.source === "gh" ? `${r.name} (from GH cashier)` : r.name, mode: r.mode, amount: num(r.amount) }));
  (dues?.roomBills?.paidToday || []).forEach((c) =>
    chargeParts(c).forEach((p) => num(p.amount) > 0 && old.push({ name: `Room ${c.roomNo} food bill${c.guestName ? ` · ${c.guestName}` : ""} (${c.date})`, mode: p.mode, amount: num(p.amount) })),
  );
  (posDay?.old_paid?.rows || []).forEach((o) =>
    old.push({ name: `POS bill ${o.billNo || `#${o.id}`} · ${o.name}${o.bill_date ? ` (${o.bill_date})` : ""}`, mode: POS_MODE[o.method] || o.method, amount: num(o.amount) }),
  );
  const oldByMode = {};
  old.forEach((r) => (oldByMode[r.mode] = (oldByMode[r.mode] || 0) + r.amount));
  const dayLabel = dayjs(date, "DD-MM-YYYY", true).isValid() ? dayjs(date, "DD-MM-YYYY").format("DD-MM-YYYY (dddd)") : date;

  return createPortal(
    <div className="rest-slip">
      <style>{CSS}</style>
      <div className="title">{BUSINESS.shortName || BUSINESS.name}</div>
      <div className="title">RESTAURANT DAILY REPORT</div>
      <div className="center">
        <b>Date: {dayLabel}</b>
      </div>
      <div className="dash" />

      {LISTS.map(([k, title, head, totalLabel]) => (
        <div key={k}>
          <div className="bar">[ {title} ]</div>
          <List
            rows={rowsOf(k)}
            head={head}
            renderName={(r) => {
              if (k === "expenses") return r.expenseName || r.fullname;
              const link = k === "pending" ? roomLinks?.[r.id] : null;
              return link ? `${r.fullname} · Room ${link.roomNo}${link.guestName ? ` · ${link.guestName}` : ""}` : r.fullname;
            }}
            extra={k === "expenses" ? { head: "Category", cell: (r) => r.categoryName || "" } : null}
            total={[totalLabel, inr(sums[k])]}
          />
          {k === "pending" && (
            <>
              <div className="bar">[ ROOM FOOD BILLS (POS) ]</div>
              <div className="center small">Automatic from POS - added to the room bill</div>
              <List
                rows={roomRows}
                head="Room / guest"
                renderName={(c) => `Room ${c.roomNo}${c.guestName ? ` · ${c.guestName}` : ""}${c.isPaid ? " (paid at GH)" : ""}`}
                total={roomRows.length ? (showTotals ? ["Total Room food bills", inr(roomRows.reduce((s, c) => s + num(c.amount), 0))] : [`${roomRows.length} room bill${roomRows.length > 1 ? "s" : ""}`, ""]) : null}
              />
            </>
          )}
        </div>
      ))}

      <div className="bar">[ OLD DUES COLLECTED ]</div>
      <div className="center small">Old bills / old udhaar paid today - not today&apos;s sale</div>
      <List rows={old} head="Name" renderName={(r) => r.name} extra={{ head: "Mode", cell: (r) => modeLabel(r.mode) }} total={["Total Old dues", inr(old.reduce((s, r) => s + r.amount, 0))]} />

      <div className="bar">[ DAILY SUMMARY &amp; SETTLEMENT ]</div>
      <div className="center small">Cash collection / Sales - today&apos;s bills only</div>
      <table>
        <tbody>
          {[
            ["Counter cash", doc.totalCash],
            ["Card", doc.totalCard],
            ["PP (UPI)", doc.totalPP],
          ].map(([l, v]) => (
            <tr key={l} className="b">
              <td>{l}</td>
              <td className="r">{inr(v)}</td>
            </tr>
          ))}
          {[
            ["Total Expenses", sums.expenses],
            ["Total Staff advance", sums.upad],
            ["Total Receivables", sums.pending],
            ["Total Payables", sums.pendingUsers],
          ].map(([l, v], i) => (
            <tr key={l} className={`b${i === 0 ? " line" : ""}`}>
              <td>{l}</td>
              <td className="r">{inr(v)}</td>
            </tr>
          ))}
          {Object.entries(oldByMode).map(([m, v], i) => (
            <tr key={m} className={`b${i === 0 ? " line" : ""}`}>
              <td>Old dues · {modeLabel(m)}</td>
              <td className="r">{inr(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showTotals && (
        <>
          <div className="bar">[ OWNER CHECK ]</div>
          <table>
            <tbody>
              {num(doc.posRoomBills) > 0 && (
                <tr>
                  <td>Room food bills (POS)</td>
                  <td className="r">{inr(doc.posRoomBills)}</td>
                </tr>
              )}
              {num(doc.posPayLater) > 0 && (
                <tr>
                  <td>Pay later bills (POS)</td>
                  <td className="r">{inr(doc.posPayLater)}</td>
                </tr>
              )}
              <tr className="b">
                <td>Grand total</td>
                <td className="r">{inr(doc.grandTotal)}</td>
              </tr>
              <tr>
                <td>Computer amount</td>
                <td className="r">{inr(doc.computerAmount)}</td>
              </tr>
              <tr className="b">
                <td>Difference</td>
                <td className="r">{inr(doc.extraAmount)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      <div className="dash" style={{ marginTop: 8 }} />
      <div className="center small">
        Submitted: {doc.enteredBy || "-"}
        {doc.enteredAt ? ` · ${dayjs(doc.enteredAt).format("hh:mm A")}` : ""}
        {doc.updatedBy ? ` · Edited: ${doc.updatedBy}` : ""}
      </div>
      <div className="center small">
        Printed: {printedBy || "-"} · {dayjs().format("DD-MM-YYYY hh:mm A")}
      </div>
      <div className="sign">
        <span>Cashier ____________</span>
        <span>Office ____________</span>
      </div>
    </div>,
    document.body,
  );
};

export default RestPrintSlip;
