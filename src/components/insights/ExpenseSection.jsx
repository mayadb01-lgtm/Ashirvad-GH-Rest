// 💸 Kharch: saal vs saal — restaurant, office, upad (+ personal alag). Head / vendor / staff ke hisaab se.
import { useMemo, useState } from "react";
import { Box, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList, Cell } from "recharts";
import { Section } from "./shared";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BOOK = { restaurant: { label: "Restaurant kharch", color: "#EA580C" }, office: { label: "Office kharch", color: "#0F766E" }, upad: { label: "Upad (staff)", color: "#7C3AED" }, personal: { label: "Personal", color: "#94A3B8" }, investment: { label: "Investment / construction", color: "#B45309" } };
const money = (v) => {
  if (v == null || !isFinite(v)) return "—";
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 0.995e7) return `${s}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)} L`;
  return `${s}₹${Math.round(a).toLocaleString("en-IN")}`;
};
const pct = (v, d = 0) => (v == null || !isFinite(v) ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(d)}%`);
const span = (a, b) => (a === 1 && b === 12 ? "full year" : a === b ? MON[a - 1] : `${MON[a - 1]}–${MON[b - 1]}`);

const ExpenseSection = ({ expenses = [], months = [], Y, B, ms = [], win = [] }) => {
  const [book, setBook] = useState("all");
  const v = useMemo(() => {
    const inWin = (r) => win.includes(r.m);
    const years = [...new Set(expenses.map((r) => r.year))].sort((a, b) => a - b);
    // Saal-wise, same mahine (latest saal ki window); personal alag
    const yearRows = years.map((y) => {
      const rs = expenses.filter((r) => r.year === y && inWin(r));
      const s = (b) => rs.filter((r) => r.book === b).reduce((a, r) => a + r.amount, 0);
      const sale = months.filter((r) => r.year === y && inWin(r)).reduce((a, r) => a + (r.restaurant || 0), 0);
      const src = [...new Set(rs.map((r) => r.source))];
      return { year: String(y), y, restaurant: s("restaurant"), office: s("office"), upad: s("upad"), personal: s("personal"), investment: s("investment"), sale, total: s("restaurant") + s("office") + s("upad"), src: src.join(", ") };
    });
    // Chune hue do saal: head-wise
    const pick = (y) => expenses.filter((r) => r.year === y && ms.includes(r.m) && (book === "all" ? r.book !== "personal" && r.book !== "investment" : r.book === book));
    const sumBy = (rows, key) => rows.reduce((o, r) => ((o[r[key]] = (o[r[key]] || 0) + r.amount), o), {});
    const hY = sumBy(pick(Y), "head"), hB = B != null ? sumBy(pick(B), "head") : {};
    const heads = [...new Set([...Object.keys(hY), ...Object.keys(hB)])].map((h) => ({ head: h, y: hY[h] || 0, b: hB[h] || 0 })).sort((a, b) => b.y + b.b - (a.y + a.b)).slice(0, 15);
    const cY = sumBy(pick(Y), "category"), cB = B != null ? sumBy(pick(B), "category") : {};
    const cats = [...new Set([...Object.keys(cY), ...Object.keys(cB)])].map((c) => ({ cat: c, y: cY[c] || 0, b: cB[c] || 0 })).sort((a, b) => b.y + b.b - (a.y + a.b));
    const totY = pick(Y).reduce((a, r) => a + r.amount, 0), totB = B != null ? pick(B).reduce((a, r) => a + r.amount, 0) : null;
    const saleY = months.filter((r) => r.year === Y && ms.includes(r.m)).reduce((a, r) => a + (r.restaurant || 0), 0);
    const saleB = months.filter((r) => r.year === B && ms.includes(r.m)).reduce((a, r) => a + (r.restaurant || 0), 0);
    const restY = expenses.filter((r) => r.year === Y && ms.includes(r.m) && r.book === "restaurant").reduce((a, r) => a + r.amount, 0);
    const restB = expenses.filter((r) => r.year === B && ms.includes(r.m) && r.book === "restaurant").reduce((a, r) => a + r.amount, 0);
    const missingOffice = yearRows.filter((r) => r.office === 0 && r.total > 0).map((r) => r.year);
    // Investment / construction: poore saal ka (window nahi), alag dikhate hain
    const invest = years.map((y) => ({ year: y, amount: expenses.filter((r) => r.year === y && r.book === "investment").reduce((a, r) => a + r.amount, 0) })).filter((r) => r.amount);
    return { invest, yearRows, heads, cats, totY, totB, saleY, saleB, restY, restB, missingOffice };
  }, [expenses, months, Y, B, ms, win, book]);

  if (!expenses.length) return null;
  const sp = ms.length ? span(ms[0], ms.at(-1)) : "";
  const winSp = win.length ? span(Math.min(...win), Math.max(...win)) : "";
  return (
    <>
      <Section title={`Expenses · year by year, ${winSp} each year`}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
          {["restaurant", "office", "upad"].map((b) => (
            <Stack key={b} direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: BOOK[b].color }} /><Typography variant="caption" color="text.secondary">{BOOK[b].label}</Typography></Stack>
          ))}
        </Stack>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={v.yearRows} margin={{ top: 40, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#EEF2F7" />
            <XAxis dataKey="year" />
            <YAxis hide />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload;
              return (
                <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 1, boxShadow: 3, minWidth: 200 }}>
                  <Typography variant="caption" color="text.secondary">{r.year} · {winSp} · from {r.src || "—"}</Typography>
                  {["restaurant", "office", "upad", "personal"].map((b) => (
                    <Stack key={b} direction="row" justifyContent="space-between" spacing={2}><Typography variant="caption">{BOOK[b].label}</Typography><Typography variant="caption" fontWeight={700}>{money(r[b])}</Typography></Stack>
                  ))}
                  <Stack direction="row" justifyContent="space-between" spacing={2}><Typography variant="caption">Restaurant kharch ÷ sale</Typography><Typography variant="caption" fontWeight={700}>{r.sale ? ((r.restaurant / r.sale) * 100).toFixed(1) + "%" : "—"}</Typography></Stack>
                </Box>
              );
            }} />
            {["restaurant", "office", "upad"].map((b, i) => (
              <Bar key={b} isAnimationActive={false} dataKey={b} stackId="e" fill={BOOK[b].color} maxBarSize={80} radius={i === 2 ? [4, 4, 0, 0] : 0}>
                {v.yearRows.map((r) => <Cell key={r.year} fillOpacity={r.y === Y ? 1 : 0.5} />)}
                {i === 2 && <LabelList dataKey="total" content={({ x, y, width, value }) => <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="#0F172A">{money(value)}</text>} />}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
        <Box sx={{ display: "grid", gap: 1, mt: 1, gridTemplateColumns: { xs: "repeat(2, 1fr)", md: `repeat(${Math.max(1, v.yearRows.length)}, 1fr)` } }}>
          {v.yearRows.map((r) => (
            <Box key={r.year} sx={{ p: 1, borderRadius: 1.5, border: "1px solid", borderColor: r.y === Y ? "#EA580C" : "divider", textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary" display="block">{r.year}</Typography>
              <Typography fontWeight={800}>{r.sale ? ((r.restaurant / r.sale) * 100).toFixed(1) + "%" : "—"}</Typography>
              <Typography variant="caption" color="text.secondary">kharch ÷ sale</Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          2021–2024 from Tally (cost centres), 2025 on from the app. Personal kharch is not in the bars: Tally kept very little of it, so years can't be compared.
          {v.missingOffice.length ? ` No office kharch was recorded in Tally for ${v.missingOffice.join(", ")}.` : ""}
        </Typography>
        {v.invest.length > 0 && (
          <Typography variant="caption" display="block" sx={{ mt: 0.5, color: BOOK.investment.color, fontWeight: 600 }}>
            Investment / construction (kept separate, not in the bars): {v.invest.map((r) => `${r.year} ${money(r.amount)}`).join(" · ")}. Pick "Investment" below to see it head by head.
          </Typography>
        )}
      </Section>

      {B != null && (
        <Section title={`Expenses by head · ${sp} ${Y} vs ${B}`} right={
          <ToggleButtonGroup size="small" exclusive value={book} onChange={(e, x) => x && setBook(x)}>
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="restaurant">Restaurant</ToggleButton>
            <ToggleButton value="office">Office</ToggleButton>
            <ToggleButton value="upad">Upad</ToggleButton>
            <ToggleButton value="personal">Personal</ToggleButton>
            {v.invest.length > 0 && <ToggleButton value="investment">Investment</ToggleButton>}
          </ToggleButtonGroup>
        }>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            <Chip label={`${Y}: ${money(v.totY)}`} sx={{ fontWeight: 700, bgcolor: "#FFEDD5" }} />
            <Chip label={`${B}: ${money(v.totB)}`} sx={{ fontWeight: 700 }} />
            {v.totB ? <Chip label={`Change ${pct(v.totY / v.totB - 1, 1)}`} sx={{ fontWeight: 700, bgcolor: v.totY <= v.totB ? "#DCFCE7" : "#FEE2E2", color: v.totY <= v.totB ? "#166534" : "#991B1B" }} /> : null}
            {(book === "all" || book === "restaurant") && v.saleY > 0 && v.saleB > 0 && (
              <Chip variant="outlined" label={`Restaurant kharch ÷ sale: ${((v.restY / v.saleY) * 100).toFixed(1)}% vs ${((v.restB / v.saleB) * 100).toFixed(1)}%`} />
            )}
          </Stack>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>By category</Typography>
              <ResponsiveContainer width="100%" height={Math.max(220, v.cats.length * 34)}>
                <BarChart data={v.cats} layout="vertical" margin={{ top: 0, right: 84, left: 0, bottom: 0 }} barGap={1}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="cat" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val, name) => [money(val), name === "b" ? B : Y]} />
                  <Bar isAnimationActive={false} dataKey="b" fill="#CBD5E1" barSize={10} radius={[0, 3, 3, 0]}><LabelList dataKey="b" position="right" formatter={money} style={{ fontSize: 10, fill: "#64748B" }} /></Bar>
                  <Bar isAnimationActive={false} dataKey="y" fill="#EA580C" barSize={10} radius={[0, 3, 3, 0]}><LabelList dataKey="y" position="right" formatter={money} style={{ fontSize: 10, fill: "#0F172A", fontWeight: 700 }} /></Bar>
                </BarChart>
              </ResponsiveContainer>
              <Typography variant="caption" color="text.secondary">Grey = {B}, orange = {Y}. Old Tally names the app has never used show as "Other (old records)".</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Top 15 heads, vendors and staff</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Head</TableCell><TableCell align="right">{B}</TableCell><TableCell align="right">{Y}</TableCell><TableCell align="right">Change</TableCell></TableRow></TableHead>
                  <TableBody>
                    {v.heads.map((h) => {
                      const c = h.b ? h.y / h.b - 1 : null;
                      return (
                        <TableRow key={h.head} hover>
                          <TableCell>{h.head}</TableCell>
                          <TableCell align="right">{money(h.b)}</TableCell>
                          <TableCell align="right">{money(h.y)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: c == null ? undefined : c <= 0 ? "#16A34A" : "#DC2626" }}>{c == null ? "new" : pct(c)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="caption" color="text.secondary">For kharch, green = spent less than {B}, red = spent more.</Typography>
            </Box>
          </Box>
        </Section>
      )}
    </>
  );
};

export default ExpenseSection;
