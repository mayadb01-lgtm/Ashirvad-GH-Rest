// Kharch control: food cost %, top kharch items mahina-wise, achanak badhe kharch ka alert. Sirf padhta hai.
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import axios from "axios";
import toast from "react-hot-toast";
import { API, COLORS, Kpi, PageTitle, Section, inr, kTick } from "./shared";

const KharchControlDashboard = () => {
  const [months, setMonths] = useState(6);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("items");

  useEffect(() => {
    let off = false;
    setLoading(true);
    axios
      .get(`${API}/insights/kharch/${months}`)
      .then(({ data }) => !off && setData(data.data))
      .catch((e) => toast.error(e?.response?.data?.message || "Kharch report load nahi hua"))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [months]);

  const ms = data?.months || [];
  const full = ms.slice(0, -1); // chalu mahina chhod ke
  const avgFood = full.length ? full.reduce((s, m) => s + m.foodPct, 0) / full.length : 0;
  const last = full[full.length - 1];
  const rows = view === "items" ? data?.items || [] : (data?.categories || []).map((c) => ({ ...c, name: c.category }));
  const chart = useMemo(() => ms.map((m) => ({ label: m.label, "Rest sales": m.restSales, "Food kharch": m.food, "Food %": m.foodPct })), [ms]);

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <PageTitle title="Kharch Control" sub="Restaurant galle ka kharch + Office Out (Personal, Loan, Upad chhod ke)." />
      <ToggleButtonGroup size="small" exclusive value={months} onChange={(_, v) => v && setMonths(v)} sx={{ mb: 2 }}>
        <ToggleButton value={3}>3 mahine</ToggleButton>
        <ToggleButton value={6}>6 mahine</ToggleButton>
        <ToggleButton value={12}>12 mahine</ToggleButton>
      </ToggleButtonGroup>
      {loading && <Typography color="text.secondary">Load ho raha hai…</Typography>}

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Kpi label={`Food cost % (${last?.label || "-"})`} value={`${last?.foodPct ?? 0}%`} sub="Restaurant sales ka" color={last && last.foodPct > avgFood + 3 ? COLORS.bad : COLORS.net} />
        <Kpi label="Food cost % (average)" value={`${avgFood.toFixed(1)}%`} sub={`${full.length} poore mahine`} />
        <Kpi label={`Kul kharch (${last?.label || "-"})`} value={inr(last?.total)} color={COLORS.out} />
        <Kpi label="Alerts" value={data?.alerts?.length || 0} sub="kharch achanak badha" color={data?.alerts?.length ? COLORS.bad : COLORS.net} />
      </Stack>

      {data?.alerts?.length > 0 ? (
        <Section title="⚠️ Achanak badha kharch (pichhla mahina vs usse pehle 3 mahine ka average)">
          <Stack spacing={1}>
            {data.alerts.map((a) => (
              <Alert key={a.name} severity="warning" sx={{ py: 0 }}>
                <b>{a.name}</b> ({a.category}): {a.month} mein {inr(a.now)} — average {inr(a.avg)} {a.changePct !== null ? `(+${a.changePct}%)` : "(naya kharch)"}
              </Alert>
            ))}
          </Stack>
        </Section>
      ) : (
        data && <Alert severity="success" sx={{ mb: 2 }}>Pichhle mahine koi kharch achanak nahi badha. 👍</Alert>
      )}

      <Section title="Restaurant sales vs Food kharch">
        <Box sx={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <ComposedChart data={chart} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis yAxisId="l" tickFormatter={kTick} />
              <YAxis yAxisId="r" orientation="right" unit="%" />
              <Tooltip formatter={(v, n) => (n === "Food %" ? `${v}%` : inr(v))} />
              <Legend />
              <Bar yAxisId="l" dataKey="Rest sales" fill={COLORS.rest} />
              <Bar yAxisId="l" dataKey="Food kharch" fill={COLORS.out} />
              <Line yAxisId="r" dataKey="Food %" stroke={COLORS.bad} strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
        <Typography variant="caption" color="text.secondary">Aakhri mahina abhi chal raha hai, isliye adhoora hai.</Typography>
      </Section>

      <Section
        title={view === "items" ? "Top kharch items (mahina-wise)" : "Category-wise kharch"}
        right={
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
            <ToggleButton value="items">Items</ToggleButton>
            <ToggleButton value="cats">Category</ToggleButton>
          </ToggleButtonGroup>
        }
      >
        <TableContainer sx={{ maxHeight: 560 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{view === "items" ? "Item" : "Category"}</TableCell>
                {view === "items" && <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>}
                {ms.map((m) => (
                  <TableCell key={m.month} align="right" sx={{ fontWeight: 700 }}>
                    {m.label}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => {
                const max = Math.max(...r.values, 1);
                return (
                  <TableRow key={r.name} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{r.name}</TableCell>
                    {view === "items" && <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>{r.category}</TableCell>}
                    {r.values.map((v, i) => (
                      <TableCell key={i} align="right" sx={{ bgcolor: v ? `rgba(234,88,12,${0.08 + (0.35 * v) / max})` : "transparent" }}>
                        {v ? inr(v) : "-"}
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{inr(r.total)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>
    </Box>
  );
};

export default KharchControlDashboard;
