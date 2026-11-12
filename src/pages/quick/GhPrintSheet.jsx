// Guest House day report on A4 paper (browser print). Rendered into <body> only while printing; the rest of the app is
// hidden by the print CSS. Staff copy: every room line and the money by payment mode — plus the grand totals when totals are shown.
import { useEffect } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);
// day keys are DD-MM-YYYY (some old rows YYYY-MM-DD)
const dmy = (d) => {
  const x = dayjs(d, ["DD-MM-YYYY", "YYYY-MM-DD"], true);
  return x.isValid() ? x : dayjs(d);
};

const inr = (v) => `₹${Math.round(Number(v) || 0).toLocaleString("en-IN")}`;

const CSS = `
@media screen { .gh-a4 { display: none; } }
@media print {
  @page { size: A4 portrait; margin: 12mm; }
  body > *:not(.gh-a4) { display: none !important; }
  html, body { background: #fff !important; }
  .gh-a4 { display: block; color: #000; font: 11px/1.35 Arial, Helvetica, sans-serif; }
  .gh-a4 h1 { font-size: 18px; margin: 0; }
  .gh-a4 h2 { font-size: 13px; margin: 14px 0 4px; border-bottom: 1.5px solid #000; padding-bottom: 2px; }
  .gh-a4 .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 6px; }
  .gh-a4 table { width: 100%; border-collapse: collapse; }
  .gh-a4 th, .gh-a4 td { border: 1px solid #555; padding: 3px 5px; text-align: left; vertical-align: top; }
  .gh-a4 th { background: #eee !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10px; }
  .gh-a4 td.r, .gh-a4 th.r { text-align: right; white-space: nowrap; }
  .gh-a4 tr { page-break-inside: avoid; }
  .gh-a4 .muted { color: #444; }
  .gh-a4 .sum { width: 60%; margin-top: 4px; }
  .gh-a4 .bold td { font-weight: 700; }
  .gh-a4 .sign { display: flex; justify-content: space-between; margin-top: 40px; }
  .gh-a4 .sign div { border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 3px; }
  .gh-a4 .foot { margin-top: 10px; font-size: 9px; color: #444; }
}`;

const modeOf = (r) => (Array.isArray(r.split) && r.split.length ? r.split.map((x) => `${x.mode} ${inr(x.amount)}`).join(" + ") : r.modeOfPayment === "UnPaid" ? "Unpaid" : r.modeOfPayment || "—");

const GhPrintSheet = ({ open, onDone, date, draft, periods, summary, showTotals, status, printedBy }) => {
  useEffect(() => {
    if (!open) return undefined;
    const after = () => onDone();
    window.addEventListener("afterprint", after);
    const t = setTimeout(() => window.print(), 150); // let the sheet render first
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", after);
    };
  }, [open, onDone]);

  if (!open) return null;

  const rows = Object.entries(draft.rooms || {})
    .map(([k, r]) => {
      const [p, roomNo] = k.split("|");
      return { ...r, period: p, roomNo };
    })
    .filter((r) => Number(r.rate) > 0 || String(r.fullname || "").trim())
    .sort((a, b) => periods.findIndex((x) => x.key === a.period) - periods.findIndex((x) => x.key === b.period) || Number(a.roomNo) - Number(b.roomNo));
  const label = (k) => periods.find((x) => x.key === k)?.label || k;
  const modeRows = (m) => Object.entries(m || {}).sort((a, b) => b[1].amt - a[1].amt);

  return createPortal(
    <div className="gh-a4">
      <style>{CSS}</style>
      <div className="head">
        <div>
          <h1>Hotel Ashirvad · Guest House</h1>
          <div>Daily report</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <b style={{ fontSize: 14 }}>{dmy(date).format("DD-MM-YYYY (ddd)")}</b>
          <div className="muted">
            {rows.length} room line{rows.length === 1 ? "" : "s"} · {Object.entries(summary.per || {}).map(([p, n]) => `${label(p)} ${n}`).join(" · ") || "no rooms"}
          </div>
        </div>
      </div>

      <h2>Rooms</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Shift</th>
            <th>Room</th>
            <th>Guest</th>
            <th>Mobile</th>
            <th>Type</th>
            <th className="r">People</th>
            <th>In / Out</th>
            <th>Payment</th>
            <th className="r">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={10}>No rooms entered.</td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={`${r.period}|${r.roomNo}`}>
              <td>{i + 1}</td>
              <td>{label(r.period)}</td>
              <td>
                <b>{r.roomNo}</b>
              </td>
              <td>{r.fullname || "—"}</td>
              <td>{r.mobileNumber || ""}</td>
              <td>{r.type || ""}</td>
              <td className="r">{r.noOfPeople || ""}</td>
              <td>
                {r.checkInTime || ""}
                {r.checkOutTime ? ` → ${r.checkOutTime}` : ""}
              </td>
              <td>{modeOf(r)}</td>
              <td className="r">{inr(r.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {(draft.jama || []).length > 0 && (
        <>
          <h2>Old dues collected today (not today's sale)</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Stay date</th>
                <th>Room</th>
                <th>Guest</th>
                <th>Payment</th>
                <th className="r">Amount</th>
              </tr>
            </thead>
            <tbody>
              {draft.jama.map((j, i) => (
                <tr key={j.id || i}>
                  <td>{i + 1}</td>
                  <td>{j.createDate ? dmy(j.createDate).format("DD-MM-YYYY") : ""}</td>
                  <td>{j.roomNo}</td>
                  <td>{j.fullname}</td>
                  <td>{modeOf({ ...j, modeOfPayment: j.modeOfPayment || "Cash" })}</td>
                  <td className="r">{inr(j.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>Money by payment mode</h2>
      <table className="sum">
        <thead>
          <tr>
            <th>Rooms · mode</th>
            <th className="r">Rooms</th>
            <th className="r">Amount</th>
          </tr>
        </thead>
        <tbody>
          {modeRows(summary.roomModes).map(([m, v]) => (
            <tr key={`r-${m}`}>
              <td>{m === "UnPaid" ? "Unpaid (to collect)" : m}</td>
              <td className="r">{v.n}</td>
              <td className="r">{inr(v.amt)}</td>
            </tr>
          ))}
          {modeRows(summary.jamaModes).map(([m, v]) => (
            <tr key={`j-${m}`}>
              <td>Old dues collected · {m}</td>
              <td className="r">{v.n}</td>
              <td className="r">{inr(v.amt)}</td>
            </tr>
          ))}
          {showTotals && (
            <>
              <tr className="bold">
                <td>Total room sale (today)</td>
                <td className="r">{summary.filled}</td>
                <td className="r">{inr(summary.total)}</td>
              </tr>
              <tr className="bold">
                <td>Received today (all modes, excl. unpaid)</td>
                <td />
                <td className="r">{inr(Object.entries(summary.byMode || {}).filter(([m]) => m !== "UnPaid").reduce((s, [, v]) => s + v.amt, 0))}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      <div className="sign">
        <div>Receptionist</div>
        <div>Office / Owner</div>
      </div>
      <div className="foot">
        {status?.by ? `Submitted by ${status.by}${status?.at ? ` at ${dayjs(status.at).format("hh:mm A")}` : ""}` : "Not submitted yet (draft)"}
        {status?.updatedBy ? ` · Edited by ${status.updatedBy}` : ""} · Printed by {printedBy || "—"} on {dayjs().format("DD-MM-YYYY hh:mm A")}
      </div>
    </div>,
    document.body,
  );
};

export default GhPrintSheet;
