// Restaurant purchase bill: 1) Scan / photo → text apne aap bhare (free OCR, phone/browser mein) → check karke save
//                           2) Manual. Mode sirf Cash ya Payable (udhaar → vendor ke Payables mein).
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Alert, Box, Button, Chip, LinearProgress, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { API, ChipChoice, EditorDialog, MoneyField, PickField, Q, apiError, inr, num } from "./shared";

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
    if (m && toNum(m[3]) > 0 && toNum(m[3]) <= (out.amount || 1e6)) out.items.push({ name: m[1].trim(), qty: (m[2].match(/\d+(?:\.\d+)?\s*(kg|g|ltr|l|pcs|nos|pc)?/i) || [""])[0].trim(), amount: toNum(m[3]) });
  });
  out.items = out.items.slice(0, 30);
  return out;
};

const EMPTY = { vendor: null, billNo: "", billDate: "", amount: 0, mode: "Cash", note: "", items: [], ocrText: "" };

const PurchaseBillDialog = ({ open, onClose, date, vendors = [], expenses = [], onSaved }) => {
  const [tab, setTab] = useState("scan");
  const [f, setF] = useState(EMPTY);
  const [photos, setPhotos] = useState([]); // dataURL
  const [ocr, setOcr] = useState({ busy: false, progress: 0, msg: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setTab("scan");
      setF(EMPTY);
      setPhotos([]);
      setOcr({ busy: false, progress: 0, msg: "" });
    }
  }, [open]);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

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
        items: p.items,
        note: x.note || (p.header && !p.vendor ? `Bill: ${p.header.slice(0, 60)}` : x.note),
      }));
      setOcr({ busy: false, progress: 100, msg: p.amount ? "Read done — please check the details below" : "Could not find the total — please type it" });
    } catch (err) {
      setOcr({ busy: false, progress: 0, msg: err.message || "Could not read the bill — fill it manually" });
    }
  };

  const valid = f.vendor && num(f.amount) > 0 && (f.mode === "Cash" || f.vendor?.isVendor);
  const save = async () => {
    if (!f.vendor) return toast.error("Choose the vendor / expense item");
    if (!(num(f.amount) > 0)) return toast.error("Enter the bill amount");
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
        amount: num(f.amount),
        mode: f.mode,
        items: f.items,
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
          {busy ? "Saving…" : `Save bill${num(f.amount) ? ` · ${inr(f.amount)}` : ""} → ${f.mode === "Payable" ? "Payables" : "Expenses"}`}
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
            <Alert severity={f.amount ? "success" : "warning"} sx={{ mt: 1 }}>
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
        <MoneyField label="Bill amount (total)" value={f.amount} onChange={(v) => set("amount", v)} big />
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

        {f.items.length > 0 && (
          <Box sx={{ border: `1px solid ${Q.line}`, borderRadius: 2, p: 1.25, bgcolor: "#fff" }}>
            <Typography variant="caption" fontWeight={800} color={Q.muted}>
              Items read from the bill (for reference)
            </Typography>
            {f.items.map((it, i) => (
              <Stack key={i} direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="body2" noWrap>
                  {it.name} {it.qty ? `· ${it.qty}` : ""}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {inr(it.amount)}
                </Typography>
              </Stack>
            ))}
          </Box>
        )}
        {f.ocrText && (
          <TextField size="small" label="Text read from bill" value={f.ocrText} multiline minRows={3} maxRows={8} InputProps={{ readOnly: true }} />
        )}
      </Stack>
    </EditorDialog>
  );
};

export default PurchaseBillDialog;
