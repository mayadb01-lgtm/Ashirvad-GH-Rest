// Invoices: GST aur Non-GST alag register + GST return (GSTR-1 / 3B) ke liye summary + Excel.
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import dayjs from "dayjs";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { API, Kpi, PageTitle, Section, MonthStepBar } from "../insights/shared";
import InvoiceEditor, { emptyDraft } from "../../pages/invoice/InvoiceEditor";
import { HOTEL, money } from "../../pages/invoice/invoiceShared";

const F = "DD-MM-YYYY";
const BROWN = "#5B2222";
const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const nameOf = (x) => x.customer?.company || x.customer?.name || "";

const SimpleTable = ({ head, rows, empty = "Kuch nahi" }) => (
  <TableContainer>
    <Table size="small">
      <TableHead>
        <TableRow>
          {head.map((h, i) => (
            <TableCell key={h} sx={{ fontWeight: 700, whiteSpace: "nowrap" }} align={i === 0 ? "left" : "right"}>
              {h}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length ? (
          rows.map((r, i) => (
            <TableRow key={i} hover>
              {r.map((c, j) => (
                <TableCell key={j} align={j === 0 ? "left" : "right"} sx={{ whiteSpace: "nowrap" }}>
                  {c}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={head.length}>
              <Typography color="text.secondary">{empty}</Typography>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

const InvoicesDashboard = () => {
  const [start, setStart] = useState(dayjs().startOf("month"));
  const [end, setEnd] = useState(dayjs());
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("GST");
  const [editor, setEditor] = useState(false);
  const [newDraft, setNewDraft] = useState(null);
  const [cancel, setCancel] = useState(null);
  const [reason, setReason] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let off = false;
    setLoading(true);
    axios
      .get(`${API}/invoice/list/${start.format(F)}/${end.format(F)}`)
      .then(({ data }) => !off && setList(data.data || []))
      .catch((e) => toast.error(e?.response?.data?.message || "Invoice list load nahi hui"))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [start, end, reload]);

  const shown = useMemo(() => list.filter((x) => x.series === tab), [list, tab]);
  const active = useMemo(() => shown.filter((x) => x.status !== "cancelled"), [shown]);

  // ----- GST return ke hisaab -----
  const g = useMemo(() => {
    const gstActive = list.filter((x) => x.series === "GST" && x.status !== "cancelled");
    const sum = (arr, k) => r2(arr.reduce((s, x) => s + (Number(x[k]) || 0), 0));
    const b2b = gstActive.filter((x) => x.customer?.gstin);
    const b2c = gstActive.filter((x) => !x.customer?.gstin);
    const byRate = {};
    b2c.forEach((x) =>
      (x.items || []).forEach((it) => {
        const k = it.taxRate || 0;
        const o = (byRate[k] ||= { rate: k, taxable: 0, cgst: 0, sgst: 0 });
        o.taxable += it.taxable;
        o.cgst += it.cgst;
        o.sgst += it.sgst;
      })
    );
    const bySac = {};
    gstActive.forEach((x) =>
      (x.items || []).forEach((it) => {
        const k = `${it.sac || "—"}|${it.taxRate || 0}`;
        const o = (bySac[k] ||= { sac: it.sac || "—", rate: it.taxRate || 0, qty: 0, taxable: 0, cgst: 0, sgst: 0, total: 0 });
        o.qty += Number(it.qty) || 0;
        o.taxable += it.taxable;
        o.cgst += it.cgst;
        o.sgst += it.sgst;
        o.total += it.total;
      })
    );
    const docs = ["GST", "NON"].map((s) => {
      const all = list.filter((x) => x.series === s).sort((a, b) => a.seq - b.seq);
      return { series: s === "GST" ? "Tax Invoice (GST)" : "Invoice (Non-GST)", from: all[0]?.invoiceNo || "—", to: all[all.length - 1]?.invoiceNo || "—", total: all.length, cancelled: all.filter((x) => x.status === "cancelled").length };
    });
    return {
      taxable: sum(gstActive, "taxable"),
      cgst: sum(gstActive, "cgst"),
      sgst: sum(gstActive, "sgst"),
      total: sum(gstActive, "grandTotal"),
      count: gstActive.length,
      b2b,
      b2c,
      b2cRates: Object.values(byRate).map((o) => ({ ...o, taxable: r2(o.taxable), cgst: r2(o.cgst), sgst: r2(o.sgst) })),
      sac: Object.values(bySac).map((o) => ({ ...o, taxable: r2(o.taxable), cgst: r2(o.cgst), sgst: r2(o.sgst), total: r2(o.total) })),
      docs,
      nonTotal: sum(list.filter((x) => x.series === "NON" && x.status !== "cancelled"), "grandTotal"),
      nonCount: list.filter((x) => x.series === "NON" && x.status !== "cancelled").length,
    };
  }, [list]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rowOf = (x) => ({
      "Invoice No": x.invoiceNo,
      Date: x.invoiceDate,
      Type: x.series === "GST" ? "Tax Invoice" : "Non-GST",
      Status: x.status === "cancelled" ? `Cancelled (${x.cancelReason})` : "Active",
      Business: x.business,
      "Customer / Company": nameOf(x),
      Guest: x.customer?.company ? x.customer?.name : "",
      GSTIN: x.customer?.gstin || "",
      State: x.customer?.state || "",
      Room: x.stay?.roomNo || "",
      "Taxable value": x.taxable,
      CGST: x.cgst,
      SGST: x.sgst,
      "Round off": x.roundOff,
      "Invoice value": x.grandTotal,
      Payment: x.paymentMode,
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(list.filter((x) => x.series === "GST").map(rowOf)), "GST Invoices");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(list.filter((x) => x.series === "NON").map(rowOf)), "Non-GST Invoices");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        g.b2b.flatMap((x) =>
          (x.items || []).map((it) => ({
            "GSTIN of Recipient": x.customer.gstin,
            "Receiver Name": nameOf(x),
            "Invoice Number": x.invoiceNo,
            "Invoice date": dayjs(x.invoiceDate, F).format("DD-MMM-YYYY"),
            "Invoice Value": x.grandTotal,
            "Place Of Supply": `${HOTEL.stateCode}-${HOTEL.state}`,
            "Reverse Charge": "N",
            "Invoice Type": "Regular B2B",
            Rate: it.taxRate,
            "Taxable Value": it.taxable,
            "Integrated Tax": 0,
            "Central Tax": it.cgst,
            "State/UT Tax": it.sgst,
          }))
        )
      ),
      "b2b"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(g.b2cRates.map((o) => ({ Type: "OE", "Place Of Supply": `${HOTEL.stateCode}-${HOTEL.state}`, Rate: o.rate, "Taxable Value": o.taxable, "Central Tax": o.cgst, "State/UT Tax": o.sgst }))),
      "b2cs"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(g.sac.map((o) => ({ "HSN/SAC": o.sac, UQC: "NA", "Total Quantity": o.qty, Rate: o.rate, "Total Value": o.total, "Taxable Value": o.taxable, "Integrated Tax": 0, "Central Tax": o.cgst, "State/UT Tax": o.sgst }))),
      "hsn"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(g.docs.map((o) => ({ "Nature of Document": o.series, "Sr. No. From": o.from, "Sr. No. To": o.to, "Total Number": o.total, Cancelled: o.cancelled }))),
      "docs"
    );
    XLSX.writeFile(wb, `Invoices_${start.format("DD-MMM-YY")}_to_${end.format("DD-MMM-YY")}.xlsx`);
  };

  const doCancel = async () => {
    try {
      await axios.put(`${API}/invoice/cancel/${cancel._id}`, { reason });
      toast.success(`${cancel.invoiceNo} cancel ho gaya`);
      setCancel(null);
      setReason("");
      setReload((x) => x + 1);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Cancel nahi hua");
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <PageTitle title="Invoices (GST / Non-GST)" sub="Dono ki numbering aur register alag. GST return (GSTR-1 / 3B) ke liye summary + Excel neeche." />
      <MonthStepBar start={start} end={end} setStart={setStart} setEnd={setEnd} format={F}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
            setNewDraft(emptyDraft());
            setEditor(true);
          }} sx={{ bgcolor: BROWN, "&:hover": { bgcolor: BROWN } }}>
          Naya invoice
        </Button>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportExcel} disabled={!list.length}>
          Excel (return ke liye)
        </Button>
      </MonthStepBar>
      {loading && <Typography color="text.secondary">Load ho raha hai…</Typography>}

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Kpi label="GST invoices" value={g.count} sub={`B2B ${g.b2b.length} · B2C ${g.b2c.length}`} />
        <Kpi label="Taxable value" value={`₹${money(g.taxable)}`} />
        <Kpi label="CGST + SGST" value={`₹${money(g.cgst + g.sgst)}`} sub={`CGST ₹${money(g.cgst)} · SGST ₹${money(g.sgst)}`} color={BROWN} />
        <Kpi label="GST invoices ka total" value={`₹${money(g.total)}`} />
        <Kpi label="Non-GST invoices" value={g.nonCount} sub={`₹${money(g.nonTotal)}`} />
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab value="GST" label={`GST Tax Invoices (${list.filter((x) => x.series === "GST").length})`} />
        <Tab value="NON" label={`Non-GST (${list.filter((x) => x.series === "NON").length})`} />
      </Tabs>

      <Section title={tab === "GST" ? "GST invoice register" : "Non-GST invoice register"} right={<Typography variant="caption">Active {active.length} · Cancel {shown.length - active.length}</Typography>}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Invoice No", "Date", "Kiske naam", ...(tab === "GST" ? ["GSTIN", "Taxable", "GST"] : []), "Total", "", ""].map((h, i) => (
                  <TableCell key={i} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {shown.map((x) => (
                <TableRow key={x._id} hover sx={{ opacity: x.status === "cancelled" ? 0.55 : 1 }}>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{x.invoiceNo}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{x.invoiceDate}</TableCell>
                  <TableCell>
                    {nameOf(x)}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {x.business}
                      {x.stay?.roomNo ? ` · Room ${x.stay.roomNo}` : ""}
                    </Typography>
                  </TableCell>
                  {tab === "GST" && <TableCell sx={{ whiteSpace: "nowrap" }}>{x.customer?.gstin || <Chip size="small" label="B2C" />}</TableCell>}
                  {tab === "GST" && <TableCell align="right">₹{money(x.taxable)}</TableCell>}
                  {tab === "GST" && <TableCell align="right">₹{money(x.cgst + x.sgst)}</TableCell>}
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    ₹{money(x.grandTotal)}
                  </TableCell>
                  <TableCell>
                    {x.status === "cancelled" ? (
                      <Chip size="small" color="error" label="Cancelled" title={x.cancelReason} />
                    ) : (
                      <Button size="small" color="error" onClick={() => setCancel(x)}>
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" href={`/invoice/${x._id}`} target="_blank" rel="noopener">
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && !shown.length && (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Typography color="text.secondary">Is date range mein koi invoice nahi.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      {tab === "GST" && (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            Return ke liye: neeche ki tables GSTR-1 ke hisse jaisi hain (B2B, B2C small, HSN/SAC, Documents). &quot;Excel (return ke liye)&quot; mein ye sab alag sheets mein milega — CA ko bhej sakte ho. Cancelled invoice kisi total mein nahi jude, sirf Documents mein gine gaye.
          </Alert>
          <Section title="B2B — company GST number wale invoices">
            <SimpleTable
              head={["GSTIN", "Naam", "Invoice", "Date", "Taxable", "CGST", "SGST", "Total"]}
              rows={g.b2b.map((x) => [x.customer.gstin, nameOf(x), x.invoiceNo, x.invoiceDate, `₹${money(x.taxable)}`, `₹${money(x.cgst)}`, `₹${money(x.sgst)}`, `₹${money(x.grandTotal)}`])}
            />
          </Section>
          <Section title="B2C — aam guest (GST rate-wise total)">
            <SimpleTable head={["GST rate", "Taxable", "CGST", "SGST"]} rows={g.b2cRates.map((o) => [`${o.rate}%`, `₹${money(o.taxable)}`, `₹${money(o.cgst)}`, `₹${money(o.sgst)}`])} />
          </Section>
          <Section title="HSN / SAC summary">
            <SimpleTable head={["SAC", "Rate", "Qty", "Taxable", "CGST", "SGST", "Total"]} rows={g.sac.map((o) => [o.sac, `${o.rate}%`, o.qty, `₹${money(o.taxable)}`, `₹${money(o.cgst)}`, `₹${money(o.sgst)}`, `₹${money(o.total)}`])} />
          </Section>
          <Section title="Documents issued">
            <SimpleTable head={["Type", "Se", "Tak", "Kul", "Cancelled"]} rows={g.docs.map((o) => [o.series, o.from, o.to, o.total, o.cancelled])} />
          </Section>
        </>
      )}

      <InvoiceEditor
        open={editor}
        draft={newDraft}
        onClose={() => setEditor(false)}
        onCreated={(inv) => {
          setEditor(false);
          setReload((x) => x + 1);
          window.open(`/invoice/${inv._id}`, "_blank");
        }}
      />

      <Dialog open={!!cancel} onClose={() => setCancel(null)}>
        <DialogTitle>{cancel?.invoiceNo} cancel karein?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Number wahi rahega (GST niyam), invoice par &quot;CANCELLED&quot; dikhega aur totals mein nahi judega. Sahi bill ke liye naya invoice banao.
          </Typography>
          <TextField fullWidth autoFocus label="Wajah (zaroori)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancel(null)}>Nahi</Button>
          <Button color="error" variant="contained" disabled={!reason.trim()} onClick={doCancel}>
            Haan, cancel karo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvoicesDashboard;
