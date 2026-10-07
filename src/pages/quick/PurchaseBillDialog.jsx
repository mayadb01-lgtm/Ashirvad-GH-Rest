// Restaurant purchase bill: 1) Scan / photo → text apne aap bhare (free OCR, phone/browser mein) → check karke save
//                           2) Manual. Mode sirf Cash ya Payable (udhaar → vendor ke Payables mein).
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Alert, Autocomplete, Box, Button, Chip, LinearProgress, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { API, ChipChoice, EditorDialog, PickField, Q, apiError, inr, num } from "./shared";

// Photo chhoti (OCR ke liye thodi badi rakho: 1800px)
const shrink = (file, max = 1800, q = 0.8) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", q));
    };
    img.onerror = () => reject(new Error("Could not read photo"));
    img.src = url;
  });

// Free OCR (Tesseract) — pehli baar ~10MB download, phir phone mein cache
let tessLoading = null;
const loadTesseract = () => {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (!tessLoading)
    tessLoading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      s.async = true;
      s.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error("OCR not available")));
      s.onerror = () => {
        tessLoading = null;
        reject(new Error("Could not load the scanner. Check internet and try again."));
      };
      document.head.appendChild(s);
    });
  return tessLoading;
};

// Restaurant ke hisaab se units
export const UNITS = ["kg", "g", "ltr", "ml", "pcs", "dozen", "packet", "box", "bottle", "tray", "bunch", "bag", "can", "jar"];
const normUnit = (u) => {
  const x = String(u || "").toLowerCase();
  if (!x) return "pcs";
  if (/^kgs?$/.test(x)) return "kg";
  if (/^(g|gm|gms)$/.test(x)) return "g";
  if (/^(l|lt|ltr)$/.test(x)) return "ltr";
  if (/^(pc|pcs|no|nos)$/.test(x)) return "pcs";
  if (/^doz/.test(x)) return "dozen";
  if (/^(pkt|packet)$/.test(x)) return "packet";
  if (/^(btl|bottle)$/.test(x)) return "bottle";
  return UNITS.includes(x) ? x : "pcs";
};
const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const NEW_ITEM = { name: "", qty: 1, unit: "kg", rate: 0, amount: 0 };

const NUM = /(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g;
const toNum = (s) => Number(String(s).replace(/,/g, "")) || 0;

// Bill ke text se: total, date, bill no, vendor, items (andaza — staff check karega)
export const parseBill = (text, vendors = []) => {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const out = { amount: 0, billDate: "", billNo: "", vendor: null, items: [], header: "" };
  // total: "Grand Total / Net Amount / Total" wali line ka aakhri number (sabse bada)
  const totalRe = /(grand\s*total|net\s*(amount|amt|total|payable)|total\s*(amount|amt)?|amount\s*payable|bill\s*amount|g\.?\s*total)/i;
  let best = 0;
  lines.forEach((l) => {
    if (!totalRe.test(l) || /sub\s*total|total\s*(qty|items?)/i.test(l)) return;
    const n = (l.match(NUM) || []).map(toNum).filter((x) => x > 0 && x < 1e7);
    if (n.length) best = Math.max(best, n[n.length - 1]);
  });
  if (!best) {
    const all = (text.match(NUM) || []).map(toNum).filter((x) => x > 0 && x < 1e6 && !(x > 1900 && x < 2100 && Number.isInteger(x)));
    best = all.length ? Math.max(...all) : 0;
  }
  out.amount = Math.round(best * 100) / 100;
  // date
  const dm = text.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (dm) {
    const y = dm[3].length === 2 ? `20${dm[3]}` : dm[3];
    if (Number(dm[2]) >= 1 && Number(dm[2]) <= 12) out.billDate = `${dm[1].padStart(2, "0")}-${dm[2].padStart(2, "0")}-${y}`;
  }
  // bill no
  const bn = text.match(/(?:bill|invoice|inv|receipt|memo)\s*(?:no|number|#)?\.?\s*[:\-#]?\s*([A-Z0-9][A-Z0-9/\-]{0,19})/i);
  if (bn) out.billNo = bn[1];
  // vendor: list ke naam bill mein mile to wahi
  const low = text.toLowerCase();
  const scored = vendors
    .map((v) => {
      const words = String(v.fullname || v.expenseName || "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4);
      return { v, score: words.filter((w) => low.includes(w)).length };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length) out.vendor = scored[0].v;
  out.header = lines.find((l) => /[a-z]{3,}/i.test(l) && !/gst|bill|invoice|date|phone|mob|tax/i.test(l)) || "";
  // items: "naam ... rakam" wali lines (total wali chhod kar)
  lines.forEach((l) => {
    if (totalRe.test(l) || /gst|cgst|sgst|tax|round|discount|change|cash|date|bill|invoice|phone|mob|gstin/i.test(l)) return;
    const m = l.match(/^([A-Za-zऀ-૿][^0-9]{2,40}?)\s+(.*?)(\d+(?:\.\d{1,2})?)\s*$/);
    if (m && toNum(m[3]) > 0 && toNum(m[3]) <= (out.amount || 1e6)) {
      const q = m[2].match(/(\d+(?:\.\d+)?)\s*(kg|kgs|gm|gms|g|ltr|lt|l|ml|pcs|pc|nos|no|dozen|doz|pkt|packet|box|btl|bottle|tray|bunch|bag|can|jar)?/i);
      const qty = q ? Number(q[1]) || 1 : 1;
      const amount = toNum(m[3]);
      out.items.push({ name: m[1].trim(), qty, unit: normUnit(q?.[2] || ""), rate: Math.round((amount / qty) * 100) / 100, amount });
    }
  });
  out.items = out.items.slice(0, 30);
  return out;
};

const EMPTY = { vendor: null, billNo: "", billDate: "", amount: 0, mode: "Cash", note: "", items: [{ ...NEW_ITEM }], extra: 0, ocrText: "" };

const PurchaseBillDialog = ({ open, onClose, date, vendors = [], expenses = [], onSaved }) => {
  const [tab, setTab] = useState("scan");
  const [f, setF] = useState(EMPTY);
  const [photos, setPhotos] = useState([]); // dataURL
  const [ocr, setOcr] = useState({ busy: false, progress: 0, msg: "" });
  const [busy, setBusy] = useState(false);
  const [memory, setMemory] = useState([]); // pichhle bills ke items (naam, unit, rate)
  const [lastBill, setLastBill] = useState(null); // chune vendor ka aakhri bill
  useEffect(() => {
    if (!open) return;
    axios
      .get(`${API}/purchase/items`)
      .then(({ data }) => setMemory(data.data || []))
      .catch(() => setMemory([]));
  }, [open]);
  const vendorId = f?.vendor?._id || "";
  useEffect(() => {
    setLastBill(null);
    if (!open || !vendorId) return;
    axios
      .get(`${API}/purchase/last/${vendorId}`)
      .then(({ data }) => setLastBill(data.data || null))
      .catch(() => setLastBill(null));
  }, [open, vendorId]);
  const rateFor = (m) => (vendorId && m?.vendorRates?.[vendorId]) || m?.lastRate || 0;
  const useLastBill = () =>
    setF((x) => ({
      ...x,
      items: lastBill.items.map((it) => ({ name: it.name, qty: it.qty || 1, unit: it.unit || "kg", rate: it.rate || 0, amount: r2((it.qty || 1) * (it.rate || 0)) })),
      extra: 0,
    }));
  // Yaad wala item chuna → unit + rate apne aap
  const pickItem = (i, val) => {
    const name = typeof val === "string" ? val : val?.name || "";
    const m = typeof val === "string" ? memory.find((x) => x.name.toLowerCase() === val.trim().toLowerCase()) : val;
    setF((x) => ({
      ...x,
      items: x.items.map((it, j) => {
        if (j !== i) return it;
        if (!m) return { ...it, name };
        const rate = rateFor(m) || it.rate;
        return { ...it, name: m.name, unit: m.unit || it.unit, rate, amount: r2(num(it.qty) * num(rate)) };
      }),
    }));
  };
  useEffect(() => {
    if (open) {
      setTab("scan");
      setF(EMPTY);
      setPhotos([]);
      setOcr({ busy: false, progress: 0, msg: "" });
    }
  }, [open]);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  // Items: Qty × Rate = Total (Total badlo to Rate apne aap)
  const setItem = (i, k, v) =>
    setF((x) => ({
      ...x,
      items: x.items.map((it, j) => {
        if (j !== i) return it;
        const n = { ...it, [k]: v };
        if (k === "qty" || k === "rate") n.amount = r2(num(n.qty) * num(n.rate));
        if (k === "amount") n.rate = num(n.qty) ? r2(num(v) / num(n.qty)) : n.rate;
        return n;
      }),
    }));
  const itemsTotal = r2(f.items.reduce((t, it) => t + num(it.amount), 0));
  const grand = r2(itemsTotal + num(f.extra));

  // Picker: pehle vendors (Payable ke liye zaroori), phir baaki kharch items
  const options = [
    ...vendors.map((v) => ({ ...v, group: `Vendors · ${v.categoryName || ""}`, label: v.fullname || v.expenseName })),
    ...expenses.filter((x) => !x.isVendor).map((x) => ({ ...x, fullname: x.expenseName, group: `Expense items · ${x.categoryName || ""}`, label: x.expenseName })),
  ];

  const addPhotos = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 6 - photos.length);
    e.target.value = "";
    if (!files.length) return;
    const urls = [];
    for (const file of files) {
      try {
        urls.push(await shrink(file));
      } catch {
        toast.error("Could not read a photo");
      }
    }
    setPhotos((p) => [...p, ...urls]);
    if (tab === "scan" && urls.length) runOcr([...photos, ...urls]);
  };

  const runOcr = async (list) => {
    setOcr({ busy: true, progress: 0, msg: "Loading scanner…" });
    try {
      const T = await loadTesseract();
      let text = "";
      for (let i = 0; i < list.length; i++) {
        const r = await T.recognize(list[i], "eng", {
          logger: (m) => m.status === "recognizing text" && setOcr({ busy: true, progress: Math.round(((i + m.progress) / list.length) * 100), msg: `Reading bill ${i + 1} / ${list.length}…` }),
        });
        text += `${r?.data?.text || ""}\n`;
      }
      const p = parseBill(text, options.filter((o) => o.isVendor));
      setF((x) => ({
        ...x,
        ocrText: text.trim(),
        amount: x.amount || p.amount,
        billDate: x.billDate || p.billDate,
        billNo: x.billNo || p.billNo,
        vendor: x.vendor || (p.vendor ? options.find((o) => o._id === p.vendor._id) || null : null),
        items: p.items.length ? p.items : x.items,
        extra: p.items.length && p.amount ? r2(p.amount - p.items.reduce((t, it) => t + it.amount, 0)) : x.extra,
        note: x.note || (p.header && !p.vendor ? `Bill: ${p.header.slice(0, 60)}` : x.note),
      }));
      setOcr({ busy: false, progress: 100, msg: p.amount ? "Read done — please check the details below" : "Could not find the total — please type it" });
    } catch (err) {
      setOcr({ busy: false, progress: 0, msg: err.message || "Could not read the bill — fill it manually" });
    }
  };

  const valid = f.vendor && f.items.length > 0 && grand > 0 && (f.mode === "Cash" || f.vendor?.isVendor) && f.items.every((it) => it.name.trim() && num(it.amount) > 0);
  const save = async () => {
    if (!f.vendor) return toast.error("Choose the vendor / expense item");
    if (!f.items.length || !f.items.every((it) => it.name.trim() && num(it.amount) > 0)) return toast.error("Fill every item: name, qty and rate");
    if (!(grand > 0)) return toast.error("Enter the bill amount");
    if (f.mode === "Payable" && !f.vendor.isVendor) return toast.error("For Payable, choose a listed vendor");
    setBusy(true);
    try {
      const rowKey = `pb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const v = f.vendor;
      const { data } = await axios.post(`${API}/purchase`, {
        date,
        billDate: f.billDate,
        billNo: f.billNo,
        vendor: { _id: v._id || "", name: v.fullname || v.expenseName || "", expenseName: v.expenseName || v.fullname || "", categoryName: v.categoryName || "", isVendor: !!v.isVendor },
        amount: grand,
        mode: f.mode,
        items: f.items.map((it) => ({ name: it.name.trim(), qty: num(it.qty), unit: it.unit, rate: num(it.rate), amount: num(it.amount) })),
        extra: f.items.length ? num(f.extra) : 0,
        note: f.note,
        source: photos.length && f.ocrText ? "scan" : "manual",
        ocrText: f.ocrText,
        rowKey,
      });
      let bill = data.data;
      for (const img of photos) {
        try {
          const r = await axios.post(`${API}/purchase/${bill._id}/photo`, { image: img });
          bill = r.data.data;
        } catch (e) {
          toast.error(`Photo not saved: ${apiError(e)}`);
        }
      }
      onSaved?.(bill, v);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <EditorDialog
      open={open}
      onClose={onClose}
      subtitle={`Restaurant · ${date}`}
      title="🧾 Purchase bill"
      actions={
        <Button fullWidth variant="contained" disabled={busy || ocr.busy || !valid} onClick={save} sx={{ bgcolor: Q.rest, py: 1.3, fontWeight: 800, "&:hover": { bgcolor: Q.rest } }}>
          {busy ? "Saving…" : `Save bill${grand ? ` · ${inr(grand)}` : ""} → ${f.mode === "Payable" ? "Payables" : "Expenses"}`}
        </Button>
      }
    >
      <Stack spacing={2}>
        <ToggleButtonGroup exclusive fullWidth value={tab} onChange={(e, v) => v && setTab(v)} size="small">
          <ToggleButton value="scan" sx={{ fontWeight: 800 }}>
            📷 Scan / photo
          </ToggleButton>
          <ToggleButton value="manual" sx={{ fontWeight: 800 }}>
            ✍ Manual
          </ToggleButton>
        </ToggleButtonGroup>

        <Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" component="label" startIcon={<PhotoCameraIcon />} disabled={busy || ocr.busy || photos.length >= 6}>
              {tab === "scan" ? "Scan bill (camera)" : "Bill photo"}
              <input hidden type="file" accept="image/*" capture="environment" onChange={addPhotos} />
            </Button>
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} disabled={busy || ocr.busy || photos.length >= 6}>
              Choose from gallery
              <input hidden type="file" accept="image/*" multiple onChange={addPhotos} />
            </Button>
          </Stack>
          {photos.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
              {photos.map((p, i) => (
                <Box key={i} sx={{ position: "relative" }}>
                  <img src={p} alt="bill" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: `1px solid ${Q.line}` }} />
                  <Chip size="small" label="✕" onClick={() => setPhotos((x) => x.filter((_, j) => j !== i))} sx={{ position: "absolute", top: -8, right: -8, bgcolor: "#fff" }} />
                </Box>
              ))}
              {tab === "scan" && !ocr.busy && (
                <Button size="small" onClick={() => runOcr(photos)}>
                  Read again
                </Button>
              )}
            </Stack>
          )}
          {ocr.busy && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress variant={ocr.progress ? "determinate" : "indeterminate"} value={ocr.progress} />
              <Typography variant="caption" color={Q.muted}>
                {ocr.msg}
              </Typography>
            </Box>
          )}
          {!ocr.busy && ocr.msg && (
            <Alert severity={grand ? "success" : "warning"} sx={{ mt: 1 }}>
              {ocr.msg}
            </Alert>
          )}
          {tab === "scan" && !photos.length && (
            <Typography variant="caption" color={Q.muted} component="div" sx={{ mt: 1 }}>
              Take a clear, straight photo of the printed bill. Total, date and bill no. are filled in automatically — always check them before saving.
            </Typography>
          )}
        </Box>

        <PickField
          label="Vendor / expense item"
          options={options}
          value={f.vendor}
          onChange={(v) => set("vendor", v)}
          getLabel={(o) => o?.label || o?.fullname || o?.expenseName || ""}
          groupBy={(o) => o.group}
        />
        <Stack direction="row" spacing={1.5}>
          <TextField size="small" label="Bill no." value={f.billNo} onChange={(e) => set("billNo", e.target.value)} fullWidth />
          <TextField size="small" label="Bill date (DD-MM-YYYY)" value={f.billDate} onChange={(e) => set("billDate", e.target.value)} fullWidth />
        </Stack>
        {/* Bill ki details: Item · Qty · Unit · Rate · Total */}
        <Box sx={{ border: `1px solid ${Q.line}`, borderRadius: 2, p: 1.25, bgcolor: "#fff" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography fontWeight={800}>Bill items</Typography>
            <Button size="small" onClick={() => set("items", [...f.items, { ...NEW_ITEM }])} sx={{ fontWeight: 800, color: Q.rest }}>
              + Add item
            </Button>
          </Stack>
          {lastBill?.items?.length > 0 && (
            <Button size="small" variant="outlined" fullWidth onClick={useLastBill} sx={{ mb: 1, fontWeight: 700 }}>
              ↻ Same items as last bill ({lastBill.date} · {lastBill.items.length} items) — then change qty/rate
            </Button>
          )}
          {f.items.length === 0 && (
            <Typography variant="caption" color={Q.bad} fontWeight={700}>
              Add at least one item (item, qty, rate).
            </Typography>
          )}
          {f.items.map((it, i) => (
            <Box key={i} sx={{ py: 1, borderTop: i ? `1px dashed ${Q.line}` : "none" }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Autocomplete
                  freeSolo
                  fullWidth
                  size="small"
                  options={memory}
                  getOptionLabel={(o) => (typeof o === "string" ? o : o?.name || "")}
                  renderOption={(props, o) => (
                    <li {...props} key={o._id || o.name}>
                      <Box sx={{ flex: 1 }}>{o.name}</Box>
                      <Typography variant="caption" color={Q.muted}>
                        {inr(rateFor(o))}/{o.unit}
                      </Typography>
                    </li>
                  )}
                  inputValue={it.name}
                  onInputChange={(e, v, reason) => reason === "input" && setItem(i, "name", v)}
                  onChange={(e, v) => pickItem(i, v)}
                  renderInput={(params) => <TextField {...params} label={`Item ${i + 1}`} error={!it.name.trim()} />}
                />
                <Button size="small" color="error" onClick={() => set("items", f.items.filter((_, j) => j !== i))} sx={{ minWidth: 36 }}>
                  ✕
                </Button>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <TextField size="small" label="Qty" value={it.qty} onChange={(e) => setItem(i, "qty", e.target.value.replace(/[^0-9.]/g, ""))} inputProps={{ inputMode: "decimal" }} sx={{ width: 74 }} />
                <TextField size="small" select label="Unit" value={it.unit} onChange={(e) => setItem(i, "unit", e.target.value)} SelectProps={{ native: true }} sx={{ width: 96 }}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </TextField>
                <TextField size="small" label="Rate ₹" value={it.rate || ""} onChange={(e) => setItem(i, "rate", e.target.value.replace(/[^0-9.]/g, ""))} inputProps={{ inputMode: "decimal" }} sx={{ flex: 1 }} />
                <TextField size="small" label="Total ₹" value={it.amount || ""} onChange={(e) => setItem(i, "amount", e.target.value.replace(/[^0-9.]/g, ""))} inputProps={{ inputMode: "decimal" }} sx={{ flex: 1 }} />
              </Stack>
            </Box>
          ))}
          {f.items.length > 0 && (
            <Box sx={{ borderTop: `1px solid ${Q.line}`, mt: 1, pt: 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography color={Q.muted}>Items total</Typography>
                <Typography fontWeight={700}>{inr(itemsTotal)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ my: 0.5 }}>
                <Typography color={Q.muted}>Tax / round-off / transport</Typography>
                <TextField size="small" value={f.extra || ""} placeholder="0" onChange={(e) => set("extra", e.target.value.replace(/[^0-9.-]/g, ""))} inputProps={{ inputMode: "decimal", style: { textAlign: "right" } }} sx={{ width: 110 }} />
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography fontWeight={800}>Grand total</Typography>
                <Typography fontWeight={800} fontSize={18}>
                  {inr(grand)}
                </Typography>
              </Stack>
            </Box>
          )}
        </Box>

        <ChipChoice
          label="Payment"
          options={["Cash", "Payable"]}
          value={f.mode}
          onChange={(m) => set("mode", m)}
          color={Q.rest}
        />
        <Typography variant="caption" color={Q.muted} sx={{ mt: -1 }}>
          {f.mode === "Cash" ? "Paid in cash now → added to today's Expenses." : "Goods received on credit → added to the vendor under Payables (not in today's total)."}
          {f.mode === "Payable" && f.vendor && !f.vendor.isVendor ? " Choose a listed vendor for Payable." : ""}
        </Typography>
        <TextField size="small" label="Note (optional)" value={f.note} onChange={(e) => set("note", e.target.value)} />

        {f.ocrText && (
          <TextField size="small" label="Text read from bill" value={f.ocrText} multiline minRows={3} maxRows={8} InputProps={{ readOnly: true }} />
        )}
      </Stack>
    </EditorDialog>
  );
};

export default PurchaseBillDialog;
