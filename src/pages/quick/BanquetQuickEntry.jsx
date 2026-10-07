// 🎉 Banquet (user side): package dekhna, booking, bill, payment
// Item ka rate / gram / kitchen quantity sirf owner ke backend (Dashboard) mein — yahan sirf package ka naam + per plate rate.
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import toast from "react-hot-toast";
import { Alert, Box, Button, ButtonBase, Checkbox, Chip, Divider, FormControlLabel, IconButton, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PrintIcon from "@mui/icons-material/Print";
import { API, ChipChoice, EditorDialog, MoneyField, Q, Section, StatusPill, apiError, inr, num } from "./shared";

dayjs.extend(customParseFormat);
const F = "DD-MM-YYYY";
const COLOR = "#BE185D";
const SLOTS = ["Breakfast", "Lunch", "Hi-Tea", "Dinner", "Full day"];
const MODES = ["Cash", "PP", "PPS", "PPC", "Card"];
const MODE_LABEL = { Cash: "Cash", PP: "PP (UPI)", PPS: "PPS", PPC: "PPC", Card: "Card" };
const STATUS = { booked: ["Booked", "info"], billed: ["Billed", "good"], cancelled: ["Cancelled", "out"] };

// Bill ka hisaab (server ke banquetTotals jaisa — form mein turant dikhane ke liye)
const totalsOf = (b) => {
  const food = (b.menus || []).reduce((t, m) => t + num(m.pricePerPlate) * num(m.plates), 0);
  const addons = (b.addons || []).reduce((t, a) => t + num(a.price) * num(a.qty), 0);
  const hall = num(b.hallRent);
  const sub = food + addons + hall;
  const discount = Math.min(num(b.discount), sub);
  const taxable = sub - discount;
  const gst = (taxable * num(b.gstPercent)) / 100;
  const total = Math.round(taxable + gst);
  const paid = (b.payments || []).filter((p) => !p.cancelled).reduce((t, p) => t + num(p.amount), 0);
  return { food, addons, hall, sub, discount, taxable, gst, total, paid, balance: total - paid };
};

const blank = (setup) => ({
  customer: { name: "", mobile: "", company: "", address: "", gstin: "" },
  occasion: "",
  eventDate: dayjs().add(1, "day").format(F),
  slot: "Lunch",
  startTime: "",
  endTime: "",
  hall: setup?.halls?.[0] ? { id: setup.halls[0]._id, name: setup.halls[0].name } : { id: "", name: "" },
  hours: 0,
  hallRent: 0,
  guests: 0,
  menus: [],
  addons: [],
  discount: 0,
  gstPercent: 0,
  notes: "",
});

// Chuna hua menu (hisse ke hisaab se) — ek line mein
const menuText = (m) =>
  (m.choices || []).length
    ? m.choices.map((c) => `${c.label}: ${(c.items || []).map((x) => x.name).join(", ") || "—"}`).join(" · ")
    : (m.items || []).map((x) => x.name).join(", ");
// Kaunse hisse mein abhi chunav baaki
const pendingChoices = (m, pkg) =>
  (pkg?.sections || []).filter((sec) => (sec.options || []).length > 1 && ((m.choices || []).find((c) => c.label === sec.label)?.items || []).length < (sec.pick || 1)).map((sec) => sec.label);

// 🖨 Bill print (naya window)
const printBill = (b) => {
  const t = totalsOf(b);
  const rows = [
    ...(b.menus || []).map((m) => [`${m.name} (${m.meal || ""})<div style="font-size:11px;color:#555">${menuText(m)}</div>`, m.plates, m.pricePerPlate, m.plates * m.pricePerPlate]),
    ...(b.addons || []).map((a) => [a.name, a.qty, a.price, a.qty * a.price]),
    ...(num(b.hallRent) ? [[`Hall rent — ${b.hall?.name || ""}${b.hours ? ` (${b.hours} hrs)` : ""}`, 1, b.hallRent, b.hallRent]] : []),
  ];
  const f = (v) => "₹" + Math.round(Number(v) || 0).toLocaleString("en-IN");
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return toast.error("Allow pop-ups to print");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${b.billNo || b.bookingNo}</title>
  <style>body{font-family:Arial,sans-serif;margin:28px;color:#111}h1{margin:0;font-size:22px}table{width:100%;border-collapse:collapse;margin-top:14px}
  th,td{border:1px solid #ccc;padding:6px 8px;font-size:13px}th{background:#f3f4f6;text-align:left}.r{text-align:right}.muted{color:#555;font-size:12px}
  .tot td{border:none;padding:3px 8px}.big{font-size:16px;font-weight:700}</style></head><body>
  <h1>Hotel Ashirvad, Songadh — Banquet</h1>
  <div class="muted">${b.status === "billed" ? "TAX INVOICE / BILL" : "BOOKING ESTIMATE"} · ${b.billNo ? `Bill ${b.billNo} · ` : ""}Booking ${b.bookingNo} · ${b.billedAt || dayjs().format(F)}</div>
  <p><b>${b.customer?.name || ""}</b>${b.customer?.company ? ` · ${b.customer.company}` : ""}${b.customer?.mobile ? ` · ${b.customer.mobile}` : ""}<br/>
  ${b.customer?.address || ""}${b.customer?.gstin ? `<br/>GSTIN: ${b.customer.gstin}` : ""}</p>
  <p class="muted">Event: ${b.occasion || ""} · ${b.eventDate} · ${b.slot}${b.startTime ? ` · ${b.startTime}${b.endTime ? `–${b.endTime}` : ""}` : ""} · Guests: ${b.guests || "-"}</p>
  <table><tr><th>Description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>
  ${rows.map((r) => `<tr><td>${r[0]}</td><td class="r">${r[1]}</td><td class="r">${f(r[2])}</td><td class="r">${f(r[3])}</td></tr>`).join("")}</table>
  <table class="tot"><tr><td class="r">Sub total</td><td class="r" style="width:140px">${f(t.sub)}</td></tr>
  ${t.discount ? `<tr><td class="r">Discount</td><td class="r">− ${f(t.discount)}</td></tr>` : ""}
  ${num(b.gstPercent) ? `<tr><td class="r">CGST ${num(b.gstPercent) / 2}%</td><td class="r">${f(t.gst / 2)}</td></tr><tr><td class="r">SGST ${num(b.gstPercent) / 2}%</td><td class="r">${f(t.gst / 2)}</td></tr>` : ""}
  <tr><td class="r big">Total</td><td class="r big">${f(t.total)}</td></tr>
  <tr><td class="r">Paid</td><td class="r">${f(t.paid)}</td></tr><tr><td class="r big">Balance</td><td class="r big">${f(t.balance)}</td></tr></table>
  ${(b.payments || []).filter((p) => !p.cancelled).length ? `<p class="muted">Payments: ${(b.payments || []).filter((p) => !p.cancelled).map((p) => `${p.date} ${MODE_LABEL[p.mode] || p.mode} ${f(p.amount)}`).join(" · ")}</p>` : ""}
  <p class="muted" style="margin-top:40px">Authorised signature</p>
  <script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
};

const BanquetQuickEntry = ({ isAdmin }) => {
  const [setup, setSetup] = useState(null);
  const [list, setList] = useState(null);
  const [view, setView] = useState("upcoming");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null); // booking editor
  const [open, setOpen] = useState(null); // booking detail
  const [pay, setPay] = useState({ amount: 0, mode: "Cash", note: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    axios.get(`${API}/banquet/setup`).then(({ data }) => setSetup(data.data)).catch((e) => toast.error(apiError(e)));
    axios
      .get(`${API}/banquet/bookings`, { params: { from: dayjs().subtract(365, "day").format(F), to: dayjs().add(730, "day").format(F) } })
      .then(({ data }) => setList(data.data || []))
      .catch((e) => toast.error(apiError(e)));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const today = dayjs().startOf("day");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (list || [])
      .filter((b) => {
        const d = dayjs(b.eventDate, F);
        if (view === "upcoming") return !d.isBefore(today, "day") && b.status !== "cancelled";
        if (view === "past") return d.isBefore(today, "day");
        return true;
      })
      .filter((b) => !s || `${b.customer?.name} ${b.customer?.mobile} ${b.bookingNo} ${b.occasion}`.toLowerCase().includes(s))
      .sort((a, b) => (view === "past" ? -1 : 1) * (dayjs(a.eventDate, F) - dayjs(b.eventDate, F)));
  }, [list, view, q, today]);

  const run = async (fn, ok) => {
    if (busy) return null;
    setBusy(true);
    try {
      const r = await fn();
      if (ok) toast.success(ok);
      load();
      return r;
    } catch (e) {
      if (e?.response?.status === 409 && e.response.data?.clash && window.confirm(`${e.response.data.message}\n\nSave anyway?`)) return "force";
      toast.error(apiError(e));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const saveForm = async (force) => {
    const body = { ...form, force };
    const r = await run(() => (form._id ? axios.put(`${API}/banquet/bookings/${form._id}`, body) : axios.post(`${API}/banquet/bookings`, body)), form._id ? "Booking updated" : "Booking saved");
    if (r === "force") return saveForm(true);
    if (r?.data?.data) {
      setForm(null);
      setOpen(r.data.data);
    }
  };
  const act = async (fn, ok) => {
    const r = await run(fn, ok);
    if (r?.data?.data) setOpen(r.data.data);
  };

  // Hall rent: Full day = per day, warna per hour × ghante (kam se kam min hours)
  const autoRent = (f) => {
    const h = (setup?.halls || []).find((x) => x._id === f.hall?.id);
    if (!h) return f.hallRent;
    if (f.slot === "Full day") return h.rentPerDay || h.rentPerHour * 24;
    return h.rentPerHour * Math.max(num(f.hours), num(h.minHours));
  };
  const setF = (patch, rent = false) =>
    setForm((f) => {
      const next = { ...f, ...patch };
      if (rent) next.hallRent = autoRent(next);
      return next;
    });

  if (!setup || !list)
    return (
      <Typography color={Q.muted} sx={{ py: 6, textAlign: "center" }}>
        Loading…
      </Typography>
    );

  const t = form ? totalsOf(form) : null;
  const ot = open ? totalsOf(open) : null;
  const upcomingDue = (list || []).filter((b) => b.status !== "cancelled" && b.totals?.balance > 0).reduce((s, b) => s + b.totals.balance, 0);

  return (
    <Box sx={{ pb: { xs: 10, md: 0 } }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
        <Typography fontWeight={800} fontSize={20} sx={{ flex: 1 }}>
          🎉 Banquet
        </Typography>
        <ToggleButtonGroup size="small" exclusive value={view} onChange={(e, v) => v && setView(v)}>
          <ToggleButton value="upcoming">Upcoming</ToggleButton>
          <ToggleButton value="past">Past</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
        <TextField size="small" placeholder="Search name / mobile / BQ no." value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm(blank(setup))} sx={{ bgcolor: COLOR, fontWeight: 800, "&:hover": { bgcolor: COLOR } }}>
          New booking
        </Button>
      </Stack>
      {upcomingDue > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Balance to collect on banquet bookings: <b>{inr(upcomingDue)}</b>
        </Alert>
      )}

      <Grid container spacing={1.5}>
        {shown.map((b) => (
          <Grid key={b._id} size={{ xs: 12, md: 6 }}>
            <ButtonBase onClick={() => setOpen(b)} sx={{ width: "100%", textAlign: "left", display: "block", borderRadius: 3 }}>
              <Box sx={{ p: 1.75, border: `1px solid ${Q.line}`, borderLeft: `5px solid ${COLOR}`, borderRadius: 3, bgcolor: "#fff" }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography fontWeight={800} sx={{ flex: 1 }} noWrap>
                    {dayjs(b.eventDate, F).format("ddd, D MMM YYYY")} · {b.slot}
                  </Typography>
                  <StatusPill tone={STATUS[b.status]?.[1]}>{STATUS[b.status]?.[0]}</StatusPill>
                </Stack>
                <Typography fontWeight={700} noWrap>
                  {b.customer?.name}
                  {b.occasion ? ` · ${b.occasion}` : ""}
                </Typography>
                <Typography variant="caption" color={Q.muted} component="div">
                  {b.bookingNo} · {b.guests || 0} guests · {(b.menus || []).map((m) => `${m.name} × ${m.plates}`).join(", ") || "No menu"}
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 0.75 }}>
                  <Typography variant="body2">Total {inr(b.totals?.total)}</Typography>
                  <Typography variant="body2" color={Q.good}>
                    Paid {inr(b.totals?.paid)}
                  </Typography>
                  {b.totals?.balance > 0 && b.status !== "cancelled" && (
                    <Typography variant="body2" fontWeight={800} color={Q.bad}>
                      Due {inr(b.totals.balance)}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </ButtonBase>
          </Grid>
        ))}
        {!shown.length && (
          <Grid size={12}>
            <Typography color={Q.muted} sx={{ py: 3, textAlign: "center" }}>
              No bookings.
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* ───── Booking form ───── */}
      <EditorDialog
        open={!!form}
        onClose={() => setForm(null)}
        subtitle="Banquet"
        title={form?._id ? `Edit ${form.bookingNo}` : "New booking"}
        actions={
          <Button fullWidth variant="contained" disabled={busy || !form?.customer?.name?.trim()} onClick={() => saveForm(false)} sx={{ bgcolor: COLOR, py: 1.4, fontWeight: 800, "&:hover": { bgcolor: COLOR } }}>
            Save · {inr(t?.total)}
          </Button>
        }
      >
        {form && (
          <Stack spacing={1.5}>
            <Typography fontWeight={800}>Customer</Typography>
            <TextField label="Name *" value={form.customer.name} onChange={(e) => setF({ customer: { ...form.customer, name: e.target.value } })} />
            <Stack direction="row" spacing={1}>
              <TextField label="Mobile" value={form.customer.mobile} onChange={(e) => setF({ customer: { ...form.customer, mobile: e.target.value } })} fullWidth inputMode="numeric" />
              <TextField label="Company" value={form.customer.company} onChange={(e) => setF({ customer: { ...form.customer, company: e.target.value } })} fullWidth />
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField label="Address" value={form.customer.address} onChange={(e) => setF({ customer: { ...form.customer, address: e.target.value } })} fullWidth />
              <TextField label="GSTIN" value={form.customer.gstin} onChange={(e) => setF({ customer: { ...form.customer, gstin: e.target.value } })} fullWidth />
            </Stack>

            <Divider />
            <Typography fontWeight={800}>Event</Typography>
            <TextField label="Occasion (wedding, birthday, meeting…)" value={form.occasion} onChange={(e) => setF({ occasion: e.target.value })} />
            <Stack direction="row" spacing={1}>
              <TextField
                label="Event date"
                type="date"
                value={dayjs(form.eventDate, F).format("YYYY-MM-DD")}
                onChange={(e) => e.target.value && setF({ eventDate: dayjs(e.target.value).format(F) })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField label="Guests (approx.)" value={form.guests || ""} onChange={(e) => setF({ guests: num(e.target.value) })} inputMode="numeric" fullWidth />
            </Stack>
            <ChipChoice label="Time" options={SLOTS} value={form.slot} onChange={(v) => setF({ slot: v }, true)} color={COLOR} />
            <Stack direction="row" spacing={1}>
              <TextField label="From" type="time" value={form.startTime} onChange={(e) => setF({ startTime: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="To" type="time" value={form.endTime} onChange={(e) => setF({ endTime: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField
                select
                label="Hall"
                value={form.hall?.id || ""}
                onChange={(e) => {
                  const h = setup.halls.find((x) => x._id === e.target.value);
                  setF({ hall: h ? { id: h._id, name: h.name } : { id: "", name: "" } }, true);
                }}
                fullWidth
              >
                <MenuItem value="">No hall rent</MenuItem>
                {setup.halls.map((h) => (
                  <MenuItem key={h._id} value={h._id}>
                    {h.name} · {inr(h.rentPerHour)}/hr{h.minHours ? ` (min ${h.minHours} hr)` : ""} · {inr(h.rentPerDay)}/day
                  </MenuItem>
                ))}
              </TextField>
              {form.slot !== "Full day" && <TextField label="Hours" value={form.hours || ""} onChange={(e) => setF({ hours: num(e.target.value) }, true)} inputMode="numeric" sx={{ width: 110 }} />}
            </Stack>
            <MoneyField label={isAdmin ? "Hall rent" : "Hall rent (auto)"} value={form.hallRent} onChange={(v) => setF({ hallRent: v })} disabled={!isAdmin} />

            <Divider />
            <Stack direction="row" alignItems="center">
              <Typography fontWeight={800} sx={{ flex: 1 }}>
                Menu / package
              </Typography>
              <TextField
                select
                size="small"
                label="Add package"
                value=""
                onChange={(e) => {
                  const p = setup.packages.find((x) => x._id === e.target.value);
                  if (p)
                    setF({
                      menus: [
                        ...form.menus,
                        {
                          packageId: p._id, name: p.name, meal: p.meal, pricePerPlate: p.pricePerPlate, plates: Math.max(num(form.guests), num(p.minPlates)), items: p.items,
                          // ek hi option wale hisse apne aap chune
                          choices: (p.sections || []).map((sec) => ({ label: sec.label, items: sec.options.length === 1 ? [sec.options[0]] : [] })),
                        },
                      ],
                    });
                }}
                sx={{ minWidth: 220 }}
              >
                {setup.packages.filter((p) => p.active !== false).map((p) => (
                  <MenuItem key={p._id} value={p._id}>
                    {p.name} · {inr(p.pricePerPlate)}/plate
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            {form.menus.map((m, i) => (
              <Box key={i} sx={{ p: 1.25, border: `1px solid ${Q.line}`, borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography fontWeight={700} sx={{ flex: 1 }}>
                    {m.name}
                  </Typography>
                  <IconButton size="small" onClick={() => setF({ menus: form.menus.filter((_, j) => j !== i) })}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
                {(() => {
                  const pkg = setup.packages.find((x) => x._id === m.packageId);
                  if (!pkg?.sections?.length)
                    return (
                      <Typography variant="caption" color={Q.muted} component="div" sx={{ mb: 1 }}>
                        {menuText(m)}
                      </Typography>
                    );
                  const pick = (label, opt, max) =>
                    setF({
                      menus: form.menus.map((x, j) => {
                        if (j !== i) return x;
                        const ch = (x.choices || []).find((c) => c.label === label) || { label, items: [] };
                        const has = ch.items.some((y) => y.itemId === opt.itemId);
                        let items = has ? ch.items.filter((y) => y.itemId !== opt.itemId) : [...ch.items, opt];
                        if (items.length > max) items = items.slice(items.length - max); // zyada ho to sabse purana hatao
                        return { ...x, choices: [...(x.choices || []).filter((c) => c.label !== label), { label, items }] };
                      }),
                    });
                  return (
                    <Stack spacing={1} sx={{ mb: 1 }}>
                      {pkg.sections.map((sec) => {
                        const ch = (m.choices || []).find((c) => c.label === sec.label)?.items || [];
                        const done = ch.length >= (sec.pick || 1);
                        return (
                          <Box key={sec.label}>
                            <Typography variant="caption" fontWeight={800} color={done ? Q.muted : Q.bad}>
                              {sec.label} — choose {sec.pick} {done ? "✓" : `(${ch.length}/${sec.pick})`}
                            </Typography>
                            <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.75} sx={{ mt: 0.5 }}>
                              {sec.options.map((o) => {
                                const on = ch.some((y) => y.itemId === o.itemId);
                                return (
                                  <Chip
                                    key={o.itemId}
                                    label={o.name}
                                    size="small"
                                    onClick={() => pick(sec.label, o, sec.pick || 1)}
                                    sx={{ fontWeight: 600, bgcolor: on ? COLOR : "#fff", color: on ? "#fff" : Q.ink, border: `1px solid ${on ? COLOR : "#CBD5E1"}`, "&:hover": { bgcolor: on ? COLOR : "#FDF2F8" } }}
                                  />
                                );
                              })}
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  );
                })()}
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    label="Plates"
                    value={m.plates || ""}
                    onChange={(e) => setF({ menus: form.menus.map((x, j) => (j === i ? { ...x, plates: num(e.target.value) } : x)) })}
                    inputMode="numeric"
                    error={num(setup.packages.find((x) => x._id === m.packageId)?.minPlates) > num(m.plates)}
                    helperText={num(setup.packages.find((x) => x._id === m.packageId)?.minPlates) ? `Min ${setup.packages.find((x) => x._id === m.packageId).minPlates} persons` : ""}
                  />
                  <TextField
                    size="small"
                    label="Rate / plate"
                    value={m.pricePerPlate || ""}
                    disabled={!isAdmin}
                    onChange={(e) => setF({ menus: form.menus.map((x, j) => (j === i ? { ...x, pricePerPlate: num(e.target.value) } : x)) })}
                    inputMode="numeric"
                  />
                  <Typography fontWeight={800} sx={{ alignSelf: "center", minWidth: 90, textAlign: "right" }}>
                    {inr(num(m.plates) * num(m.pricePerPlate))}
                  </Typography>
                </Stack>
              </Box>
            ))}

            <Divider />
            <Typography fontWeight={800}>Extras</Typography>
            {setup.addons.map((a) => {
              const cur = form.addons.find((x) => x.name === a.name);
              return (
                <Stack key={a._id} direction="row" alignItems="center" spacing={1}>
                  <FormControlLabel
                    sx={{ flex: 1 }}
                    control={
                      <Checkbox
                        checked={!!cur}
                        onChange={(e) =>
                          setF({ addons: e.target.checked ? [...form.addons, { name: a.name, price: a.price, unit: a.unit, qty: a.unit === "plate" ? form.guests || 1 : 1 }] : form.addons.filter((x) => x.name !== a.name) })
                        }
                      />
                    }
                    label={`${a.name} · ${inr(a.price)}${a.unit !== "fixed" ? ` / ${a.unit}` : ""}`}
                  />
                  {cur && a.unit !== "fixed" && (
                    <TextField size="small" label="Qty" value={cur.qty} onChange={(e) => setF({ addons: form.addons.map((x) => (x.name === a.name ? { ...x, qty: num(e.target.value) } : x)) })} sx={{ width: 90 }} />
                  )}
                </Stack>
              );
            })}

            <Divider />
            <Stack direction="row" spacing={1}>
              <MoneyField label={isAdmin ? "Discount" : "Discount (owner only)"} value={form.discount} onChange={(v) => setF({ discount: v })} disabled={!isAdmin} />
              <TextField select label="GST" value={form.gstPercent} onChange={(e) => setF({ gstPercent: num(e.target.value) })} sx={{ minWidth: 120 }}>
                {[0, 5, 12, 18].map((g) => (
                  <MenuItem key={g} value={g}>
                    {g ? `${g}%` : "No GST"}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField label="Notes" value={form.notes} onChange={(e) => setF({ notes: e.target.value })} multiline minRows={2} />
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#FDF2F8" }}>
              {[
                ["Food", t.food],
                ["Extras", t.addons],
                ["Hall rent", t.hall],
                ...(t.discount ? [["Discount", -t.discount]] : []),
                ...(t.gst ? [[`GST ${form.gstPercent}%`, t.gst]] : []),
              ].map(([l, v]) => (
                <Stack key={l} direction="row" justifyContent="space-between">
                  <Typography color={Q.muted}>{l}</Typography>
                  <Typography>{v < 0 ? `− ${inr(-v)}` : inr(v)}</Typography>
                </Stack>
              ))}
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                <Typography fontWeight={800}>Total</Typography>
                <Typography fontWeight={800}>{inr(t.total)}</Typography>
              </Stack>
            </Box>
          </Stack>
        )}
      </EditorDialog>

      {/* ───── Booking detail: payments, bill ───── */}
      <EditorDialog
        open={!!open && !form}
        onClose={() => setOpen(null)}
        subtitle={open ? `${open.bookingNo}${open.billNo ? ` · Bill ${open.billNo}` : ""}` : ""}
        title={open ? `${open.customer?.name} · ${dayjs(open.eventDate, F).format("D MMM YYYY")} · ${open.slot}` : ""}
        actions={
          open && (
            <Stack direction="row" spacing={1} sx={{ width: "100%" }} flexWrap="wrap" useFlexGap>
              <Button startIcon={<PrintIcon />} onClick={() => printBill(open)} sx={{ fontWeight: 700 }}>
                {open.status === "billed" ? "Print bill" : "Print estimate"}
              </Button>
              {open.status !== "cancelled" && (open.status !== "billed" || isAdmin) && (
                <Button onClick={() => setForm({ ...open, hall: open.hall || { id: "", name: "" } })} sx={{ fontWeight: 700 }}>
                  Edit
                </Button>
              )}
              {open.status === "booked" && (
                <Button
                  variant="contained"
                  disabled={busy}
                  onClick={() => window.confirm("Make the final bill? Check plates first — after this only the owner can change it.") && act(() => axios.post(`${API}/banquet/bookings/${open._id}/bill`), "Bill made")}
                  sx={{ bgcolor: COLOR, fontWeight: 800, "&:hover": { bgcolor: COLOR } }}
                >
                  Final bill
                </Button>
              )}
              {isAdmin && open.status !== "cancelled" && (
                <Button color="error" disabled={busy} onClick={() => {
                  const reason = window.prompt("Reason for cancelling? (refund any advance from Office Out)");
                  if (reason !== null) act(() => axios.put(`${API}/banquet/bookings/${open._id}/cancel`, { reason }), "Cancelled");
                }}>
                  Cancel booking
                </Button>
              )}
              {isAdmin && open.status !== "booked" && (
                <Button disabled={busy} onClick={() => act(() => axios.put(`${API}/banquet/bookings/${open._id}/reopen`), "Reopened")}>
                  Reopen
                </Button>
              )}
            </Stack>
          )
        }
      >
        {open && (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <StatusPill tone={STATUS[open.status]?.[1]}>{STATUS[open.status]?.[0]}</StatusPill>
              {open.occasion && <Chip size="small" label={open.occasion} />}
              <Chip size="small" label={`${open.guests || 0} guests`} />
              {open.hall?.name && <Chip size="small" label={open.hall.name} />}
              {open.customer?.mobile && <Chip size="small" label={open.customer.mobile} />}
            </Stack>
            {open.cancelReason && <Alert severity="error">Cancelled: {open.cancelReason}</Alert>}
            <Section title="Bill" color={COLOR}>
              {(open.menus || []).map((m, i) => (
                <Box key={i} sx={{ py: 0.4 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>
                      {m.name} · {m.plates} × {inr(m.pricePerPlate)}
                    </Typography>
                    <Typography>{inr(m.plates * m.pricePerPlate)}</Typography>
                  </Stack>
                  <Typography variant="caption" color={Q.muted} component="div">
                    {menuText(m)}
                  </Typography>
                  {pendingChoices(m, setup.packages.find((x) => x._id === m.packageId)).length > 0 && (
                    <Typography variant="caption" color={Q.bad} fontWeight={700} component="div">
                      Menu not final: choose {pendingChoices(m, setup.packages.find((x) => x._id === m.packageId)).join(", ")} (Edit)
                    </Typography>
                  )}
                </Box>
              ))}
              {(open.addons || []).map((a, i) => (
                <Stack key={`a${i}`} direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                  <Typography>
                    {a.name}
                    {a.qty > 1 ? ` × ${a.qty}` : ""}
                  </Typography>
                  <Typography>{inr(a.qty * a.price)}</Typography>
                </Stack>
              ))}
              {num(open.hallRent) > 0 && (
                <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                  <Typography>Hall rent{open.hours ? ` (${open.hours} hrs)` : ""}</Typography>
                  <Typography>{inr(open.hallRent)}</Typography>
                </Stack>
              )}
              {ot.discount > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography color={Q.muted}>Discount</Typography>
                  <Typography>− {inr(ot.discount)}</Typography>
                </Stack>
              )}
              {ot.gst > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography color={Q.muted}>GST {open.gstPercent}%</Typography>
                  <Typography>{inr(ot.gst)}</Typography>
                </Stack>
              )}
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5, pt: 0.5, borderTop: `1px solid ${Q.line}` }}>
                <Typography fontWeight={800}>Total</Typography>
                <Typography fontWeight={800}>{inr(ot.total)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color={Q.good} fontWeight={700}>
                  Paid
                </Typography>
                <Typography color={Q.good} fontWeight={700}>
                  {inr(ot.paid)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color={ot.balance > 0 ? Q.bad : Q.good} fontWeight={800}>
                  Balance
                </Typography>
                <Typography color={ot.balance > 0 ? Q.bad : Q.good} fontWeight={800}>
                  {inr(ot.balance)}
                </Typography>
              </Stack>
            </Section>

            <Section title="Payments" subtitle="Advance and balance — counted in reports on the day received" color={COLOR}>
              {(open.payments || []).map((p) => (
                <Stack key={p._id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.5, borderTop: `1px solid ${Q.line}`, opacity: p.cancelled ? 0.5 : 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={700} sx={{ textDecoration: p.cancelled ? "line-through" : "none" }}>
                      {p.date} · {MODE_LABEL[p.mode] || p.mode}
                    </Typography>
                    <Typography variant="caption" color={Q.muted}>
                      {p.by ? `by ${p.by}` : ""}
                      {p.note ? ` · ${p.note}` : ""}
                      {p.cancelled ? " · removed" : ""}
                    </Typography>
                  </Box>
                  <Typography fontWeight={800}>{inr(p.amount)}</Typography>
                  {!p.cancelled && (
                    <Button size="small" color="error" disabled={busy} onClick={() => window.confirm(`Remove ${inr(p.amount)}?`) && act(() => axios.put(`${API}/banquet/bookings/${open._id}/payment/${p._id}/cancel`), "Removed")} sx={{ minWidth: 0 }}>
                      Remove
                    </Button>
                  )}
                </Stack>
              ))}
              {open.status !== "cancelled" && (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <MoneyField label="Amount received today" value={pay.amount} onChange={(v) => setPay((p) => ({ ...p, amount: v }))} helperText={ot.balance > 0 ? `Balance ${inr(ot.balance)}` : ""} />
                  <ChipChoice options={MODES.map((m) => MODE_LABEL[m])} value={MODE_LABEL[pay.mode]} onChange={(l) => setPay((p) => ({ ...p, mode: MODES.find((m) => MODE_LABEL[m] === l) }))} color={COLOR} />
                  <TextField size="small" label="Note (optional)" value={pay.note} onChange={(e) => setPay((p) => ({ ...p, note: e.target.value }))} />
                  <Button
                    variant="contained"
                    disabled={busy || !(num(pay.amount) > 0)}
                    onClick={async () => {
                      await act(() => axios.post(`${API}/banquet/bookings/${open._id}/payment`, pay), `${inr(pay.amount)} received`);
                      setPay({ amount: 0, mode: "Cash", note: "" });
                    }}
                    sx={{ bgcolor: COLOR, fontWeight: 800, "&:hover": { bgcolor: COLOR } }}
                  >
                    Receive {num(pay.amount) > 0 ? inr(pay.amount) : ""}
                  </Button>
                  <Typography variant="caption" color={Q.muted}>
                    Card goes to the restaurant machine (PP account). Do not enter banquet money again in Office Money in.
                  </Typography>
                </Stack>
              )}
            </Section>
            {open.notes && (
              <Typography variant="body2" color={Q.muted}>
                Notes: {open.notes}
              </Typography>
            )}
          </Stack>
        )}
      </EditorDialog>
    </Box>
  );
};

export default BanquetQuickEntry;
