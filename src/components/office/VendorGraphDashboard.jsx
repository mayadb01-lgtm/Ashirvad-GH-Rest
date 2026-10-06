// Vendor Graph: "Categories & Expenses" mein jin items pe Vendor tick hai, unki list + graph.
// Data wahi purana "Merged Vendor Report" API (/vendor/get-vendor-entries) - sirf padhta hai.
// Credit = Rest Aapvana + Office In (vendor ka maal / udhaar aaya)
// Debit  = Rest Kharch (vendor) + Office Out (vendor ko payment)
// Balance = Credit - Debit (abhi kitna dena baaki)
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  Card,
  CardContent,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Chip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import SkipPreviousRoundedIcon from "@mui/icons-material/SkipPreviousRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import DownloadIcon from "@mui/icons-material/Download";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import dayjs from "dayjs";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { useDateNavigation } from "../../hooks/useDateNavigation";

dayjs.locale("en-gb");
const DATE_FORMAT = "DD-MM-YYYY";
const COLORS = { credit: "#2563EB", debit: "#16A34A", balance: "#DC2626" };
const inr = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

const vendorNameOf = (row) => row.expenseName || row.fullname || "NA";
const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

const VendorGraphDashboard = () => {
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metric, setMetric] = useState("both"); // both | balance
  const [topN, setTopN] = useState(15);
  const [search, setSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorMaster, setVendorMaster] = useState([]); // [{name, category}]
  const [showOthers, setShowOthers] = useState(false);

  // Vendor list: Restaurant "Categories & Expenses" mein Vendor tick wale items
  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_REACT_APP_SERVER_URL}/restCategory/get-categories`)
      .then(({ data }) => {
        const list = [];
        for (const c of data?.data || []) {
          for (const e of c.expense || []) {
            if (e.isVendor && e.expenseName) list.push({ name: e.expenseName.trim(), category: c.categoryName });
          }
        }
        setVendorMaster(list);
      })
      .catch(() => toast.error("Vendor list (Categories & Expenses) load nahi hui"));
  }, []);

  const onStart = useCallback((d) => d && setStartDate(d), []);
  const onEnd = useCallback((d) => d && setEndDate(d), []);
  const { goToPreviousRange, goToNextRange } = useDateNavigation({
    startDate,
    endDate,
    setStartDate,
    setEndDate,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_REACT_APP_SERVER_URL}/vendor/get-vendor-entries/${startDate.format(DATE_FORMAT)}/${endDate.format(DATE_FORMAT)}`
        );
        if (cancelled) return;
        if (data?.success) {
          setRows((data.data.finalRows || []).filter((r) => r.id !== "Total"));
        } else {
          setRows([]);
          setError(data?.message || "Data nahi aaya");
        }
      } catch (e) {
        if (cancelled) return;
        const m = e?.response?.data?.message || "Data nahi aaya";
        setError(m);
        toast.error(m);
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  // Har vendor ka total. Sirf tick wale vendors (₹0 wale bhi); "Doosre naam" toggle se baaki bhi.
  const vendors = useMemo(() => {
    const map = new Map();
    for (const vm of vendorMaster) {
      const k = norm(vm.name);
      if (!map.has(k))
        map.set(k, { id: k, vendor: vm.name, category: vm.category, isVendor: true, credit: 0, debit: 0, entries: 0, lastDate: null });
    }
    for (const r of rows) {
      const name = vendorNameOf(r);
      const k = norm(name);
      let v = map.get(k);
      if (!v) {
        v = { id: k, vendor: name, category: "-", isVendor: false, credit: 0, debit: 0, entries: 0, lastDate: null };
        map.set(k, v);
      }
      v.credit += Number(r.credit) || 0;
      v.debit += Number(r.debit) || 0;
      v.entries += 1;
      const d = r.entryCreateDate ? dayjs(r.entryCreateDate) : dayjs(r.createDate, DATE_FORMAT);
      if (d.isValid() && (!v.lastDate || d.isAfter(v.lastDate))) v.lastDate = d;
    }
    return [...map.values()]
      .filter((v) => v.isVendor || showOthers)
      .map((v) => ({
        ...v,
        balance: v.credit - v.debit,
        lastDateText: v.lastDate ? v.lastDate.format(DATE_FORMAT) : "",
      }))
      .sort((a, b) => b.credit + b.debit - (a.credit + a.debit) || a.vendor.localeCompare(b.vendor));
  }, [rows, vendorMaster, showOthers]);

  const othersCount = useMemo(() => {
    const master = new Set(vendorMaster.map((v) => norm(v.name)));
    return new Set(rows.map((r) => norm(vendorNameOf(r))).filter((k) => !master.has(k))).size;
  }, [rows, vendorMaster]);

  const totals = useMemo(
    () =>
      vendors.reduce(
        (t, v) => ({ credit: t.credit + v.credit, debit: t.debit + v.debit, balance: t.balance + v.balance }),
        { credit: 0, debit: 0, balance: 0 }
      ),
    [vendors]
  );

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? vendors.filter((v) => v.vendor.toLowerCase().includes(q)) : vendors;
  }, [vendors, search]);

  const chartData = useMemo(() => {
    const list =
      metric === "balance"
        ? [...filteredVendors].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
        : filteredVendors;
    return (topN === 0 ? list : list.slice(0, topN)).map((v) => ({
      name: v.vendor.length > 18 ? v.vendor.slice(0, 17) + "…" : v.vendor,
      fullName: v.vendor,
      Credit: Math.round(v.credit),
      Debit: Math.round(v.debit),
      Balance: Math.round(v.balance),
    }));
  }, [filteredVendors, metric, topN]);

  // Ek vendor ka din-ba-din balance
  const vendorTimeline = useMemo(() => {
    if (!selectedVendor) return [];
    const byDay = new Map();
    for (const r of rows) {
      if (norm(vendorNameOf(r)) !== norm(selectedVendor)) continue;
      const d = r.entryCreateDate ? dayjs(r.entryCreateDate) : dayjs(r.createDate, DATE_FORMAT);
      const key = d.isValid() ? d.format("YYYY-MM-DD") : "0000";
      const cur = byDay.get(key) || { credit: 0, debit: 0 };
      cur.credit += Number(r.credit) || 0;
      cur.debit += Number(r.debit) || 0;
      byDay.set(key, cur);
    }
    let running = 0;
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => {
        running += v.credit - v.debit;
        return {
          date: dayjs(k).format("DD MMM"),
          Credit: Math.round(v.credit),
          Debit: Math.round(v.debit),
          Balance: Math.round(running),
        };
      });
  }, [rows, selectedVendor]);

  const exportExcel = () => {
    if (!vendors.length) return toast.error("Is date range mein koi vendor data nahi hai.");
    const sheet = XLSX.utils.json_to_sheet([
      ...vendors.map((v) => ({
        Vendor: v.vendor,
        Category: v.category,
        "Credit (maal/udhaar)": Math.round(v.credit),
        "Debit (payment)": Math.round(v.debit),
        "Balance (baaki)": Math.round(v.balance),
        Entries: v.entries,
        "Last entry": v.lastDateText,
      })),
      {
        Vendor: "TOTAL",
        "Credit (maal/udhaar)": Math.round(totals.credit),
        "Debit (payment)": Math.round(totals.debit),
        "Balance (baaki)": Math.round(totals.balance),
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Vendors");
    XLSX.writeFile(wb, `Vendors_${startDate.format(DATE_FORMAT)}_to_${endDate.format(DATE_FORMAT)}.xlsx`);
  };

  const columns = [
    { field: "vendor", headerName: "Vendor", flex: 1.4, minWidth: 160 },
    { field: "category", headerName: "Category", flex: 1, minWidth: 130 },
    { field: "credit", headerName: "Credit (maal/udhaar)", flex: 1, minWidth: 140, type: "number", valueFormatter: (v) => inr(v) },
    { field: "debit", headerName: "Debit (payment)", flex: 1, minWidth: 130, type: "number", valueFormatter: (v) => inr(v) },
    {
      field: "balance",
      headerName: "Balance (baaki)",
      flex: 1,
      minWidth: 130,
      type: "number",
      renderCell: (p) => (
        <Typography component="span" fontWeight={700} color={p.value > 0 ? "error.main" : p.value < 0 ? "success.main" : "text.primary"}>
          {inr(p.value)}
        </Typography>
      ),
    },
    { field: "entries", headerName: "Entries", width: 90, type: "number" },
    { field: "lastDateText", headerName: "Last entry", width: 120 },
  ];

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Vendor Graph
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Credit = Rest Aapvana + Office In · Debit = Rest Kharch (vendor) + Office Out · Balance = Credit − Debit
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Vendor list "Restaurant → Categories &amp; Expenses" se aati hai: jis expense pe <b>Vendor</b> tick hai wahi yahan dikhta hai
        (abhi {vendorMaster.length} vendors). Naya vendor jodna ho to wahan tick lagao.
      </Alert>

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" onClick={goToPreviousRange} startIcon={<SkipPreviousRoundedIcon />}>Pichla</Button>
          <DatePicker label="Shuru" value={startDate} onChange={onStart} format="DD-MM-YYYY" slotProps={{ textField: { size: "small" } }} />
          <DatePicker label="Tak" value={endDate} onChange={onEnd} format="DD-MM-YYYY" slotProps={{ textField: { size: "small" } }} />
          <Button variant="outlined" onClick={goToNextRange} endIcon={<SkipNextRoundedIcon />}>Agla</Button>
          <Button variant="contained" onClick={exportExcel} startIcon={<DownloadIcon />}>Excel</Button>
        </Stack>
      </LocalizationProvider>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
        {[
          ["Vendors", vendors.length, "text.primary"],
          ["Credit (maal/udhaar)", inr(totals.credit), COLORS.credit],
          ["Debit (payment)", inr(totals.debit), COLORS.debit],
          ["Balance (baaki)", inr(totals.balance), COLORS.balance],
        ].map(([label, value, color]) => (
          <Card key={label} variant="outlined" sx={{ flex: 1 }}>
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color }}>{value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }} sx={{ mb: 1 }}>
            <Typography fontWeight={700}>Saare vendors ka graph</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <ToggleButtonGroup size="small" exclusive value={metric} onChange={(_, v) => v && setMetric(v)}>
                <ToggleButton value="both">Credit vs Debit</ToggleButton>
                <ToggleButton value="balance">Baaki balance</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup size="small" exclusive value={topN} onChange={(_, v) => v !== null && setTopN(v)}>
                <ToggleButton value={10}>Top 10</ToggleButton>
                <ToggleButton value={15}>Top 15</ToggleButton>
                <ToggleButton value={0}>Sab</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>
          {loading ? (
            <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>Load ho raha hai…</Typography>
          ) : chartData.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>Is date range mein koi vendor entry nahi hai.</Typography>
          ) : (
            <Box sx={{ width: "100%", height: Math.max(300, chartData.length * 34 + 60) }}>
              <ResponsiveContainer>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                  onClick={(e) => e?.activePayload?.[0] && setSelectedVendor(e.activePayload[0].payload.fullName)}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => inr(v)} labelFormatter={(_, p) => p?.[0]?.payload?.fullName || ""} />
                  <Legend />
                  {metric === "both" ? (
                    <>
                      <Bar dataKey="Credit" fill={COLORS.credit} radius={[0, 4, 4, 0]} cursor="pointer" />
                      <Bar dataKey="Debit" fill={COLORS.debit} radius={[0, 4, 4, 0]} cursor="pointer" />
                    </>
                  ) : (
                    <Bar dataKey="Balance" fill={COLORS.balance} radius={[0, 4, 4, 0]} cursor="pointer" />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
          <Typography variant="caption" color="text.secondary">
            Kisi vendor ki line pe click karo → uska din-ba-din graph neeche khulega.
          </Typography>
        </CardContent>
      </Card>

      {selectedVendor && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Typography fontWeight={700}>Vendor:</Typography>
              <Chip label={selectedVendor} onDelete={() => setSelectedVendor(null)} color="primary" />
            </Stack>
            <Box sx={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={vendorTimeline} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip formatter={(v) => inr(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="Credit" stroke={COLORS.credit} dot={false} />
                  <Line type="monotone" dataKey="Debit" stroke={COLORS.debit} dot={false} />
                  <Line type="monotone" dataKey="Balance" stroke={COLORS.balance} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ mb: 1 }}>
            <Typography fontWeight={700}>Saare vendors ki list ({filteredVendors.length})</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <ToggleButton size="small" value="others" selected={showOthers} onChange={() => setShowOthers((x) => !x)}>
                Doosre naam bhi ({othersCount})
              </ToggleButton>
              <TextField size="small" label="Vendor dhundho" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Stack>
          </Stack>
          <Box sx={{ height: 520, width: "100%" }}>
            <DataGrid
              rows={filteredVendors}
              columns={columns}
              loading={loading}
              density="compact"
              disableRowSelectionOnClick
              onRowClick={(p) => setSelectedVendor(p.row.vendor)}
              initialState={{ sorting: { sortModel: [{ field: "balance", sort: "desc" }] } }}
              pageSizeOptions={[25, 50, 100]}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VendorGraphDashboard;
