// Invoice dekho / PDF banao. /invoice/:id
// PDF: "PDF / Print" dabao → printer mein "Save as PDF" chuno (mobile pe bhi chalta hai).
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { HOTEL, inWords, money } from "./invoiceShared";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;
const BROWN = "#5B2222";
const GOLD = "#E8C27A";

const css = `
.inv-wrap{background:#E5E7EB;min-height:100vh;padding:16px 8px;font-family:"Segoe UI",Roboto,Arial,sans-serif;color:#1F2937}
.inv-bar{max-width:794px;margin:0 auto 12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.inv-bar button{border:0;border-radius:8px;padding:10px 16px;font-weight:700;font-size:15px;cursor:pointer}
.inv-paper{background:#fff;max-width:794px;margin:0 auto;padding:28px 30px;box-shadow:0 4px 18px rgba(0,0,0,.12);position:relative}
.inv-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:3px solid ${BROWN};padding-bottom:12px}
.inv-head img{height:64px}
.inv-addr{text-align:right;font-size:11.5px;line-height:1.5;max-width:330px}
.inv-tag{font-weight:700;color:${BROWN};font-size:12.5px;letter-spacing:.3px}
.inv-title{display:flex;justify-content:space-between;align-items:center;margin:14px 0 10px}
.inv-title h1{margin:0;font-size:20px;letter-spacing:2px;color:${BROWN}}
.inv-badge{background:${GOLD};color:${BROWN};font-weight:800;font-size:11px;padding:4px 10px;border-radius:20px}
.inv-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px}
.inv-box{border:1px solid #E5E7EB;border-radius:6px;padding:8px 10px;line-height:1.55}
.inv-box b.lbl{display:block;font-size:10.5px;color:#6B7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:2px}
.inv-t{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
.inv-t th{background:${BROWN};color:#fff;font-weight:600;padding:7px 6px;text-align:right;font-size:11px}
.inv-t th:first-child,.inv-t th:nth-child(2),.inv-t td:first-child,.inv-t td:nth-child(2){text-align:left}
.inv-t td{padding:7px 6px;border-bottom:1px solid #E5E7EB;text-align:right;vertical-align:top}
.inv-sum{display:flex;justify-content:space-between;gap:16px;margin-top:12px;font-size:12px}
.inv-sum table{border-collapse:collapse;min-width:260px}
.inv-sum td{padding:4px 6px;text-align:right}
.inv-sum tr.g td{border-top:2px solid ${BROWN};font-size:15px;font-weight:800;color:${BROWN};padding-top:7px}
.inv-words{font-size:12px;margin-top:10px;padding:8px 10px;background:#FBF6EC;border-left:4px solid ${GOLD}}
.inv-foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:28px;font-size:11px;color:#4B5563}
.inv-sign{text-align:center;min-width:200px}
.inv-sign div{border-top:1px solid #9CA3AF;margin-top:44px;padding-top:4px;font-weight:700;color:#1F2937}
.inv-cancel{position:absolute;top:42%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);font-size:84px;font-weight:900;color:rgba(220,38,38,.18);border:8px solid rgba(220,38,38,.18);padding:4px 24px;pointer-events:none}
.inv-thanks{text-align:center;font-size:11px;color:#6B7280;margin-top:16px}
@media (max-width:600px){.inv-paper{padding:16px}.inv-head{flex-direction:column}.inv-addr{text-align:left}.inv-grid{grid-template-columns:1fr}.inv-t{font-size:10.5px}}
@page{size:A4;margin:10mm}
@media print{.inv-wrap{background:#fff;padding:0}.inv-bar{display:none}.inv-paper{box-shadow:none;max-width:none;padding:0}
  .inv-head{flex-direction:row}.inv-addr{text-align:right}.inv-grid{grid-template-columns:1fr 1fr}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

export const InvoiceDocument = ({ inv }) => {
  const gst = inv.series === "GST";
  const c = inv.customer || {};
  const st = inv.stay || {};
  const rates = [...new Set((inv.items || []).map((x) => x.taxRate).filter(Boolean))];
  return (
    <div className="inv-paper">
      {inv.status === "cancelled" && <div className="inv-cancel">CANCELLED</div>}
      <div className="inv-head">
        <img src="/ashirvad-logo.png" alt={HOTEL.name} />
        <div className="inv-addr">
          <div className="inv-tag">{HOTEL.tagline}</div>
          <div>{HOTEL.address}</div>
          <div>📞 {HOTEL.phones}</div>
          {gst && (
            <div>
              <b>GSTIN: {HOTEL.gstin}</b> · State: {HOTEL.state} ({HOTEL.stateCode})
            </div>
          )}
        </div>
      </div>

      <div className="inv-title">
        <h1>{gst ? "TAX INVOICE" : "INVOICE"}</h1>
        <span className="inv-badge">{inv.business}</span>
      </div>

      <div className="inv-grid">
        <div className="inv-box">
          <b className="lbl">Bill to</b>
          {c.company ? (
            <>
              <b>{c.company}</b>
              {c.name && <div>Guest: {c.name}</div>}
            </>
          ) : (
            <b>{c.name}</b>
          )}
          {c.address && <div>{c.address}</div>}
          {c.mobile && <div>Mobile: {c.mobile}</div>}
          {gst && c.gstin && (
            <div>
              <b>GSTIN: {c.gstin}</b>
            </div>
          )}
          {gst && <div>State: {c.state || HOTEL.state}</div>}
        </div>
        <div className="inv-box">
          <b className="lbl">Invoice</b>
          <div>
            No.: <b>{inv.invoiceNo}</b>
          </div>
          <div>Date: {inv.invoiceDate}</div>
          {gst && <div>Place of supply: {HOTEL.state} ({HOTEL.stateCode})</div>}
          {st.roomNo && <div>Room: {st.roomNo}{st.guests ? ` · ${st.guests} guest(s)` : ""}</div>}
          {st.checkIn && <div>Check-in: {st.checkIn}</div>}
          {st.checkOut && <div>Check-out: {st.checkOut}</div>}
          {inv.paymentMode && <div>Payment: {inv.paymentMode}</div>}
        </div>
      </div>

      <table className="inv-t">
        <thead>
          <tr>
            <th style={{ width: 26 }}>#</th>
            <th>Description</th>
            {gst && <th>SAC</th>}
            <th>Qty</th>
            <th>Rate</th>
            {gst && <th>Taxable</th>}
            {gst && <th>GST</th>}
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {(inv.items || []).map((it, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{it.desc}</td>
              {gst && <td>{it.sac}</td>}
              <td>{it.qty}</td>
              <td>{money(it.rate)}</td>
              {gst && <td>{money(it.taxable)}</td>}
              {gst && <td>{it.taxRate ? `${it.taxRate}%` : "—"}</td>}
              <td>{money(gst ? it.total : it.taxable)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="inv-sum">
        <div style={{ flex: 1 }}>
          {gst && rates.length > 0 && (
            <div style={{ color: "#6B7280" }}>
              {rates.map((r) => (
                <div key={r}>
                  GST @{r}% = CGST {r / 2}% + SGST {r / 2}%
                </div>
              ))}
            </div>
          )}
          {inv.notes && <div style={{ marginTop: 6 }}>Note: {inv.notes}</div>}
        </div>
        <table>
          <tbody>
            {gst && (
              <>
                <tr>
                  <td>Taxable value</td>
                  <td>₹ {money(inv.taxable)}</td>
                </tr>
                <tr>
                  <td>CGST</td>
                  <td>₹ {money(inv.cgst)}</td>
                </tr>
                <tr>
                  <td>SGST</td>
                  <td>₹ {money(inv.sgst)}</td>
                </tr>
              </>
            )}
            {!gst && (
              <tr>
                <td>Sub total</td>
                <td>₹ {money(inv.taxable)}</td>
              </tr>
            )}
            {!!inv.roundOff && (
              <tr>
                <td>Round off</td>
                <td>₹ {money(inv.roundOff)}</td>
              </tr>
            )}
            <tr className="g">
              <td>Total</td>
              <td>₹ {money(inv.grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="inv-words">
        <b>Amount in words:</b> {inWords(inv.grandTotal)}
      </div>

      <div className="inv-foot">
        <div>
          {gst ? "Tax is not payable on reverse charge basis." : "This is not a GST tax invoice."}
          <br />
          Computer generated invoice.
        </div>
        <div className="inv-sign">
          For {HOTEL.name}
          <div>Authorised Signatory</div>
        </div>
      </div>
      <div className="inv-thanks">Thank you for staying with us! 🙏</div>
    </div>
  );
};

const InvoicePage = () => {
  const { id } = useParams();
  const [inv, setInv] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    axios
      .get(`${API}/invoice/one/${id}`)
      .then(({ data }) => setInv(data.data))
      .catch((e) => setErr(e?.response?.data?.message || "Invoice load nahi hua (login hai?)"));
  }, [id]);

  useEffect(() => {
    if (inv) document.title = `${inv.invoiceNo.replace(/\//g, "-")} ${inv.customer?.company || inv.customer?.name || ""}`.trim();
  }, [inv]);

  return (
    <div className="inv-wrap">
      <style>{css}</style>
      <div className="inv-bar">
        <button style={{ background: BROWN, color: "#fff" }} onClick={() => window.print()} disabled={!inv}>
          ⬇ PDF / Print
        </button>
        <button style={{ background: "#fff", color: BROWN, border: `1px solid ${BROWN}` }} onClick={() => (window.history.length > 1 ? window.history.back() : window.close())}>
          ← Wapas
        </button>
        <span style={{ fontSize: 12, color: "#4B5563" }}>PDF ke liye: Print → &quot;Save as PDF&quot; chuno</span>
      </div>
      {err && <div className="inv-paper" style={{ color: "#B91C1C" }}>{err}</div>}
      {!inv && !err && <div className="inv-paper">Load ho raha hai…</div>}
      {inv && <InvoiceDocument inv={inv} />}
    </div>
  );
};

export default InvoicePage;
