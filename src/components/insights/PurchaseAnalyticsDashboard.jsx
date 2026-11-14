// Purchase analytics: kharid ka hisaab — mahina-wise, vendor-wise, item-wise (rate badla ya nahi), mode-wise. Sirf padhta hai.
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, FormControlLabel, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import dayjs from "dayjs";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { API, COLORS, Kpi, PageTitle, Section, inr, kTick, lakh, MonthRangeBar } from "./shared";
import PurchaseBillDialog from "../../pages/quick/PurchaseBillDialog";

const F = "DD-MM-YYYY";

const PurchaseAnalyticsDashboard = () => {
  const [from, setFrom] = useState(dayjs().subtract(2, "month").startOf("month"));
  const [to, setTo] = useState(dayjs().startOf("month"));
  const [book, setBook] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [itemQ, setItemQ] = useState("");
  const [withInfo, setWithInfo] = useState(false); // include old info-only bills in the numbers (off = real totals)
  const [oldOpen, setOldOpen] = useState(false);
  const [lists, setLists] = useState({ vendors: [], expenses: [] });
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!oldOpen || lists.vendors.length) return;
    axios
      .get(`${API}/restCategory/get-categories`)
      .then(({ data: r }) => {
        const cats = r.data || [];
        setLists({
          vendors: cats.flatMap((c) => (c.expense || []).filter((x) => x?.isVendor).map((x) => ({ _id: x._id, fullname: x.expenseName, expenseName: x.expenseName, isVendor: true, categoryName: c.categoryName }))),
          expenses: cats.flatMap((c) => (c.expense || []).map((x) => ({ _id: x._id, expenseName: x.expenseName, categoryName: c.categoryName, isVendor: !!x?.isVendor }))),
        });
      })
      .catch(() => toast.error("Could not load the vendor list"));
  }, [oldOpen, lists.vendors.length]);
  // photos need the login → fetch with axios, then open the picture
  const openPhoto = async (name) => {
    const w = window.open("", "_blank");
    try {
      const { data: blob } = await axios.get(`${API}/purchase/photo/${name}`, { responseType: "blob" });
      if (w) w.location.href = URL.createObjectURL(blob);
    } catch {
      w?.close();
      toast.error("Could not open the photo");
    }
  };
  const removeOld = async (b) => {
    if (!window.confirm(`Remove the old bill of ${b.vendor} (${b.date}, ${inr(b.amount)})?`)) return;
    try {
      await axios.delete(`${API}/purchase/${b._id}`);
      toast.success("Old bill removed");
      setReload((x) => x + 1);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not remove it");
    }
  };

  useEffect(() => {
    let off = false;
    setLoading(true);
    const end = to.endOf("month").isAfter(dayjs()) ? dayjs() : to.endOf("month");
    axios
      .get(`${API}/purchase/analytics/${from.startOf("month").format(F)}/${end.format(F)}?info=${withInfo ? 1 : 0}${book === "all" ? "" : `&book=${book}`}`)
      .then(({ data: r }) => !off && setData(r.data))
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load purchase analytics"))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [from, to, book, withInfo, reload]);

  const tot = data?.total || {};
  const items = useMemo(() => (data?.items || []).filter((x) => !itemQ.trim() || x.item.toLowerCase().includes(itemQ.trim().toLowerCase())), [data, itemQ]);

  const exportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.months.map((m) => ({ Month: m.label, Bills: m.bills, Amount: m.amount, Payable: m.payable }))), "Monthly");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.vendors.map((v) => ({ Vendor: v.vendor, Category: v.category, Bills: v.bills, Amount: v.amount, Payable: v.payable, "Last bill": v.lastDate }))),
      "Vendors"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        data.items.map((x) => ({ Item: x.item, Unit: x.unit, Qty: x.qty, Amount: x.amount, "Avg rate": x.avgRate, "Min rate": x.minRate, "Max rate": x.maxRate, "Last rate": x.lastRate, "Last date": x.lastDate, Bills: x.bills }))
      ),
      "Items"
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.modes.map((m) => ({ Mode: m.mode, Amount: m.amount }))), "Payment modes");
    XLSX.writeFile(wb, `Purchase_analytics_${from.format("MMM-YY")}_to_${to.format("MMM-YY")}.xlsx`);
  };

  const th = (h, right) => (
    <TableCell key={h} sx={{ fontWeight: 800, whiteSpace: "nowrap", textAlign: right ? "right" : "left" }}>
      {h}
    </TableCell>
  );
  const td = { textAlign: "right", whiteSpace: "nowrap" };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <PageTitle title="Purchase analytics" sub="Supplier bills entered in Restaurant and Office Book: by month, vendor, item and payment mode." />
      <MonthRangeBar from={from} to={to} setFrom={setFrom} setTo={setTo}>
        <ToggleButtonGroup size="small" exclusive value={book} onChange={(e, v) => v && setBook(v)}>
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="rest">Restaurant</ToggleButton>
          <ToggleButton value="office">Office</ToggleButton>
        </ToggleButtonGroup>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={exportExcel} disabled={!data}>
          Excel
        </Button>
        <Button variant="outlined" onClick={() => setOldOpen(true)}>
          + Old bill (info only)
        </Button>
      </MonthRangeBar>
      <FormControlLabel
        sx={{ mb: 1 }}
        control={<Switch checked={withInfo} onChange={(e) => setWithInfo(e.target.checked)} />}
        label={`Include old info-only bills in these numbers${data?.infoBills?.length ? ` (${data.infoBills.length} in this period)` : ""}`}
      />
      {withInfo && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Old info-only bills are included below. These numbers are NOT your real purchase totals — the expenses were already entered in the day books.
        </Alert>
      )}

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Kpi label="Total purchase" value={lakh(tot.amount)} sub={`${tot.bills || 0} bills`} color={COLORS.out} />
        <Kpi label="Paid (Cash / PP / PPS / PPC)" value={lakh(tot.paid)} color={COLORS.net} />
        <Kpi label="Payable (on credit)" value={lakh(tot.payable)} color={COLORS.bad} />
        <Kpi label="Restaurant / Office" value={`${lakh(data?.books?.rest)} / ${lakh(data?.books?.office)}`} />
      </Stack>

      <Section title="Purchase by month">
        {loading ? (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>Loading…</Typography>
        ) : (
          <Box sx={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={data?.months || []} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={kTick} />
                <Tooltip formatter={(v) => inr(v)} />
                <Legend />
                <Bar dataKey="amount" name="Purchase" fill={COLORS.out} />
                <Bar dataKey="payable" name="of which Payable" fill={COLORS.bad} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Section>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Section title={`Vendors (${data?.vendors?.length || 0})`} sx={{ flex: 2 }}>
          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>{[th("Vendor"), th("Bills", 1), th("Amount", 1), th("Payable", 1), th("Last bill", 1)]}</TableRow>
              </TableHead>
              <TableBody>
                {(data?.vendors || []).map((v) => (
                  <TableRow key={v.vendor} hover>
                    <TableCell>
                      <b>{v.vendor}</b>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {v.category}
                      </Typography>
                    </TableCell>
                    <TableCell sx={td}>{v.bills}</TableCell>
                    <TableCell sx={{ ...td, fontWeight: 700 }}>{inr(v.amount)}</TableCell>
                    <TableCell sx={{ ...td, color: v.payable ? COLORS.bad : undefined }}>{inr(v.payable)}</TableCell>
                    <TableCell sx={td}>{v.lastDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Section>
        <Section title="Payment mode" sx={{ flex: 1 }}>
          {(data?.modes || []).map((m) => (
            <Stack key={m.mode} direction="row" justifyContent="space-between" sx={{ py: 0.75, borderBottom: "1px solid #E5E7EB" }}>
              <Typography fontWeight={700} color={m.mode === "Payable" ? COLORS.bad : undefined}>
                {m.mode}
              </Typography>
              <Typography fontWeight={700}>{inr(m.amount)}</Typography>
            </Stack>
          ))}
          {!data?.modes?.length && <Typography color="text.secondary">No bills.</Typography>}
        </Section>
      </Stack>

      <Section
        title={`Items (${items.length})`}
        right={<TextField size="small" placeholder="Search item" value={itemQ} onChange={(e) => setItemQ(e.target.value)} />}
      >
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>{[th("Item"), th("Qty", 1), th("Amount", 1), th("Avg rate", 1), th("Min – Max rate", 1), th("Last rate", 1), th("Bills", 1)]}</TableRow>
            </TableHead>
            <TableBody>
              {items.map((x) => {
                const jump = x.minRate && x.maxRate && x.maxRate > x.minRate * 1.15;
                return (
                  <TableRow key={`${x.item}|${x.unit}`} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{x.item}</TableCell>
                    <TableCell sx={td}>
                      {x.qty} {x.unit}
                    </TableCell>
                    <TableCell sx={{ ...td, fontWeight: 700 }}>{inr(x.amount)}</TableCell>
                    <TableCell sx={td}>
                      {inr(x.avgRate)}/{x.unit}
                    </TableCell>
                    <TableCell sx={{ ...td, color: jump ? COLORS.bad : undefined, fontWeight: jump ? 700 : 400 }}>
                      {inr(x.minRate)} – {inr(x.maxRate)}
                    </TableCell>
                    <TableCell sx={td}>
                      {inr(x.lastRate)}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {x.lastDate}
                      </Typography>
                    </TableCell>
                    <TableCell sx={td}>{x.bills}</TableCell>
                  </TableRow>
                );
              })}
              {!items.length && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography color="text.secondary">No items in this period.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary">
          Red min–max = the rate changed more than 15% in this period.
        </Typography>
      </Section>

      <Section title={`Old bills — info only (${data?.infoBills?.length || 0})`} right={<Typography variant="caption" color="text.secondary">Never added to Expenses, Payables, vendor ledger or any total</Typography>}>
        {!data?.infoBills?.length ? (
          <Typography color="text.secondary" variant="body2">
            No old bills in this period. Use “+ Old bill (info only)” to file an old bill for its item rates and history.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {th("Bill date")}
                  {th("Vendor")}
                  {th("Book")}
                  {th("Bill no.")}
                  {th("Items", true)}
                  {th("Amount", true)}
                  {th("Photo")}
                  {th("")}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.infoBills.map((b) => (
                  <TableRow key={b._id}>
                    <TableCell>{b.date}</TableCell>
                    <TableCell>{b.vendor}</TableCell>
                    <TableCell>{b.book === "office" ? "Office" : "Restaurant"}</TableCell>
                    <TableCell>{b.billNo || "—"}</TableCell>
                    <TableCell sx={td}>{b.items}</TableCell>
                    <TableCell sx={td}>{inr(b.amount)}</TableCell>
                    <TableCell>
                      {b.photos.map((ph, i) => (
                        <Button key={ph} size="small" onClick={() => openPhoto(ph)}>
                          {i + 1}
                        </Button>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Button size="small" color="error" onClick={() => removeOld(b)}>
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Section>

      <PurchaseBillDialog
        open={oldOpen}
        infoOnly
        onClose={() => setOldOpen(false)}
        vendors={lists.vendors}
        expenses={lists.expenses}
        color="#475569"
        onSaved={() => {
          toast.success("Old bill saved (info only)");
          setOldOpen(false);
          setReload((x) => x + 1);
        }}
      />
    </Box>
  );
};

export default PurchaseAnalyticsDashboard;
