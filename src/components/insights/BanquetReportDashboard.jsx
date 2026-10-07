// 🎉 Banquet report (sirf owner): bookings, bill, wasooli (mode), baaki + kitchen planning (kitna banana hai)
import { useEffect, useMemo, useState } from "react";
import { Box, Button, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import dayjs from "dayjs";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { API, COLORS, Kpi, PageTitle, Section, inr, lakh } from "./shared";

const F = "DD-MM-YYYY";
const dateBox = (label, v, set) => <TextField size="small" type="date" label={label} value={v.format("YYYY-MM-DD")} onChange={(e) => e.target.value && set(dayjs(e.target.value))} InputLabelProps={{ shrink: true }} />;

const BanquetReportDashboard = () => {
  const [tab, setTab] = useState("report");
  const [from, setFrom] = useState(dayjs().startOf("month"));
  const [to, setTo] = useState(dayjs().endOf("month"));
  const [rep, setRep] = useState(null);
  const [kFrom, setKFrom] = useState(dayjs());
  const [kTo, setKTo] = useState(dayjs().add(7, "day"));
  const [kit, setKit] = useState(null);

  useEffect(() => {
    axios
      .get(`${API}/banquet/report`, { params: { from: from.format(F), to: to.format(F) } })
      .then(({ data }) => setRep(data.data))
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load"));
  }, [from, to]);
  useEffect(() => {
    axios
      .get(`${API}/banquet/kitchen`, { params: { from: kFrom.format(F), to: kTo.format(F) } })
      .then(({ data }) => setKit(data.data))
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load"));
  }, [kFrom, kTo]);

  // Sab bookings ka ek saath saamaan (kitchen / kharidi ke liye)
  const shopping = useMemo(() => {
    const m = {};
    (kit || []).forEach((b) => b.lines.forEach((l) => {
      const x = (m[l.name] ||= { name: l.name, category: l.category, unit: l.unit, qty: 0, cost: 0 });
      x.qty += l.qty;
      x.cost += l.cost;
    }));
    return Object.values(m).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }, [kit]);

  const t = rep?.totals || {};
  const exportExcel = () => {
    if (!rep) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rep.rows.map((r) => ({
          "Booking no": r.bookingNo, "Bill no": r.billNo, Date: r.eventDate, Time: r.slot, Customer: r.customer?.name, Mobile: r.customer?.mobile, Occasion: r.occasion, Guests: r.guests,
          Menu: (r.menus || []).map((m) => `${m.name} x ${m.plates} @ ${m.pricePerPlate}`).join("; "), Food: r.totals.food, Extras: r.totals.addons, "Hall rent": r.totals.hall,
          Discount: r.totals.discount, GST: r.totals.gst, Total: r.totals.total, Paid: r.totals.paid, Balance: r.totals.balance, Status: r.status,
        }))
      ),
      "Bookings"
    );
    if (kit?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(shopping.map((x) => ({ Item: x.name, Category: x.category, Quantity: Math.round(x.qty * 100) / 100, Unit: x.unit, "Value at item rates": Math.round(x.cost) }))), "Kitchen list");
    XLSX.writeFile(wb, `Banquet_${from.format("DD-MMM")}_to_${to.format("DD-MMM-YY")}.xlsx`);
  };

  const th = (h) => (
    <TableCell key={h} sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
      {h}
    </TableCell>
  );
  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <PageTitle title="Banquet report" sub="Bookings, bills, money received and kitchen planning (how much to cook)." />
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="report" label="Bookings & money" />
        <Tab value="kitchen" label="Kitchen planning" />
      </Tabs>

      {tab === "report" && (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            {dateBox("Event from", from, setFrom)}
            {dateBox("Event to", to, setTo)}
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={exportExcel} disabled={!rep}>
              Excel
            </Button>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <Kpi label="Bookings" value={t.bookings || 0} sub={`${t.plates || 0} plates · ${t.cancelled || 0} cancelled`} />
            <Kpi label="Booking value" value={lakh(t.booked)} color={COLORS.in} />
            <Kpi label="Billed" value={lakh(t.billed)} sub="Counted as revenue (without GST) in P&L" color={COLORS.net} />
            <Kpi label="Money received" value={lakh(t.collected)} sub={Object.entries(rep?.byMode || {}).map(([m, v]) => `${m} ${lakh(v)}`).join(" · ")} color={COLORS.net} />
            <Kpi label="Balance to collect" value={lakh(t.due)} color={COLORS.bad} />
          </Stack>
          <Section title={`Bookings (${rep?.rows?.length || 0})`}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>{["Date", "Time", "Customer", "Menu", "Total", "Paid", "Balance", "Status"].map(th)}</TableRow>
                </TableHead>
                <TableBody>
                  {(rep?.rows || []).map((r) => (
                    <TableRow key={r._id} hover sx={{ opacity: r.status === "cancelled" ? 0.5 : 1 }}>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{r.eventDate}</TableCell>
                      <TableCell>{r.slot}</TableCell>
                      <TableCell>
                        <b>{r.customer?.name}</b>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {r.bookingNo}
                          {r.occasion ? ` · ${r.occasion}` : ""}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{(r.menus || []).map((m) => `${m.name} × ${m.plates}`).join(", ")}</Typography>
                      </TableCell>
                      <TableCell>{inr(r.totals.total)}</TableCell>
                      <TableCell sx={{ color: COLORS.net }}>{inr(r.totals.paid)}</TableCell>
                      <TableCell sx={{ color: r.totals.balance > 0 ? COLORS.bad : undefined, fontWeight: 700 }}>{inr(r.totals.balance)}</TableCell>
                      <TableCell>{r.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Section>
          {!!rep?.byPackage?.length && (
            <Section title="By package">
              <Table size="small">
                <TableBody>
                  {rep.byPackage.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell sx={{ fontWeight: 700 }}>{p.name}</TableCell>
                      <TableCell>{p.bookings} bookings</TableCell>
                      <TableCell>{p.plates} plates</TableCell>
                      <TableCell>{inr(p.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          )}
        </>
      )}

      {tab === "kitchen" && (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            {dateBox("Events from", kFrom, setKFrom)}
            {dateBox("Events to", kTo, setKTo)}
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={exportExcel} disabled={!kit?.length}>
              Excel
            </Button>
          </Stack>
          {!!shopping.length && (
            <Section title="Total to prepare / buy (all events above)">
              <Table size="small">
                <TableHead>
                  <TableRow>{["Item", "Category", "Quantity", "Value at item rates"].map(th)}</TableRow>
                </TableHead>
                <TableBody>
                  {shopping.map((x) => (
                    <TableRow key={x.name}>
                      <TableCell sx={{ fontWeight: 700 }}>{x.name}</TableCell>
                      <TableCell>{x.category}</TableCell>
                      <TableCell>
                        {Math.round(x.qty * 100) / 100} {x.unit}
                      </TableCell>
                      <TableCell>{inr(x.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          )}
          {(kit || []).map((b) => (
            <Section key={b._id} title={`${b.eventDate} · ${b.slot} · ${b.customer} (${b.bookingNo})`} sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {b.menus.join(", ")} · {b.plates} plates · Food billed {inr(b.foodSale)} · At item rates {inr(b.foodCost)} ·{" "}
                <b style={{ color: b.margin >= 0 ? COLORS.net : COLORS.bad }}>Difference {inr(b.margin)}</b>
              </Typography>
              <Table size="small">
                <TableBody>
                  {b.lines.map((l) => (
                    <TableRow key={l.name}>
                      <TableCell>{l.name}</TableCell>
                      <TableCell>{l.category}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {l.qty} {l.unit}
                      </TableCell>
                      <TableCell>{inr(l.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          ))}
          {kit && !kit.length && <Typography color="text.secondary">No banquet events in these dates.</Typography>}
        </>
      )}
    </Box>
  );
};

export default BanquetReportDashboard;
