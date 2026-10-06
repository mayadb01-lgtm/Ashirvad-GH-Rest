// Restaurant: din ka closing, PC + mobile
// Hisaab purane page jaisa:
//   Grand total = Upaad + Levana baaki + Kharch + Card + PP + Cash
//   Farak (extra) = Grand total − Computer amount  (manfi nahi hona chahiye)
// Data purane format mein: /restEntry/create-entry, /restEntry/update-entry
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { Alert, Box, Button, ButtonBase, Skeleton, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import AddIcon from "@mui/icons-material/Add";
import {
  API,
  ConfirmDialog,
  EditorDialog,
  MoneyField,
  PickField,
  Q,
  SaveBar,
  Section,
  StatusPill,
  apiError,
  inr,
  num,
  useDraft,
} from "./shared";

const EMPTY = { cash: 0, card: 0, pp: 0, computer: 0, upad: [], pending: [], pendingUsers: [], expenses: [] };
const sum = (rows) => rows.reduce((s, r) => s + num(r.amount), 0);

const SECTIONS = {
  upad: { title: "Upaad", subtitle: "Staff ko diya advance", pickLabel: "Staff", color: "#7C3AED" },
  pending: { title: "Levana baaki", subtitle: "Jinse paisa lena hai (udhaar diya)", pickLabel: "Kis se lena hai", color: "#0891B2" },
  pendingUsers: { title: "Aapvana baaki", subtitle: "Vendor ko dena baaki (total mein nahi judta)", pickLabel: "Vendor", color: "#64748B" },
  expenses: { title: "Kharch", subtitle: "Aaj ka kharch", pickLabel: "Kharch kis cheez ka", color: "#DB2777" },
};

const RowList = ({ rows, onEdit, empty, locked, render }) => (
  <Stack spacing={0}>
    {rows.length === 0 && (
      <Typography variant="body2" color={Q.muted} sx={{ py: 1 }}>
        {empty}
      </Typography>
    )}
    {rows.map((r, i) => (
      <ButtonBase key={i} onClick={() => onEdit(i)} disabled={locked} sx={{ textAlign: "left", borderTop: i ? `1px solid ${Q.line}` : "none", py: 1, px: 0.5, borderRadius: 1, display: "flex" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>{render(r)}</Box>
        <Typography fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums" }}>
          {inr(r.amount)}
        </Typography>
      </ButtonBase>
    ))}
  </Stack>
);

const RestQuickEntry = ({ date }) => {
  const [lists, setLists] = useState(null);
  const [server, setServer] = useState({ loaded: false, doc: null });
  const [status, setStatus] = useState(null);
  const [draft, setDraft, clearDraft] = useDraft(`qe-rest-${date}`, EMPTY);
  const [editor, setEditor] = useState(null); // { section, index, row }
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const seededFor = useRef("");

  const load = useCallback(async () => {
    setError("");
    setServer({ loaded: false, doc: null });
    try {
      const [staff, pend, cats, e, s] = await Promise.all([
        axios.get(`${API}/restStaff/get-staff-id-name-mobile`),
        axios.get(`${API}/restPending/get-all-pending-users`),
        axios.get(`${API}/restCategory/get-categories`),
        axios.get(`${API}/restEntry/get-entry/${date}`),
        axios.get(`${API}/quick/day-status/${date}`).catch(() => ({ data: {} })),
      ]);
      const categories = cats.data.data || [];
      setLists({
        staff: (staff.data.data || []).map((x) => ({ _id: x._id, fullname: x.fullname, mobileNumber: x.mobileNumber || 0, category: x.category || "" })),
        pending: (pend.data.data || [])
          .filter((x) => x.category === "Pending")
          .map((x) => ({ _id: x._id, fullname: x.fullname, mobileNumber: x.mobileNumber || 0, category: x.category })),
        vendors: categories.flatMap((c) =>
          (c.expense || [])
            .filter((x) => x?.isVendor)
            .map((x) => ({
              _id: x._id,
              fullname: x.fullname || x.expenseName,
              mobileNumber: x.mobileNumber || 0,
              category: x.category || "",
              expenseName: x.expenseName,
              isVendor: true,
              categoryName: c.categoryName,
              categoryDescription: c.categoryDescription || "",
            }))
        ),
        expenses: categories.flatMap((c) =>
          (c.expense || []).map((x) => ({ _id: x._id, expenseName: x.expenseName, categoryName: c.categoryName, isVendor: !!x?.isVendor }))
        ),
      });
      const doc = e.data.data && !Array.isArray(e.data.data) && e.data.data._id ? e.data.data : null;
      setServer({ loaded: true, doc });
      setStatus(s.data?.data?.rest || null);
    } catch (err) {
      setError(apiError(err));
      setServer({ loaded: true, doc: null });
    }
  }, [date]);

  useEffect(() => {
    seededFor.current = "";
    load();
  }, [load]);

  const submitted = !!server.doc;

  useEffect(() => {
    if (!server.loaded || !server.doc || seededFor.current === date) return;
    seededFor.current = date;
    const d = server.doc;
    setDraft({
      cash: d.totalCash || 0,
      card: d.totalCard || 0,
      pp: d.totalPP || 0,
      computer: d.computerAmount || 0,
      upad: d.upad || [],
      pending: d.pending || [],
      pendingUsers: d.pendingUsers || [],
      expenses: d.expenses || [],
    });
  }, [server, date, setDraft]);

  const t = useMemo(() => {
    const upad = sum(draft.upad);
    const pending = sum(draft.pending);
    const expenses = sum(draft.expenses);
    const grand = upad + pending + expenses + num(draft.card) + num(draft.pp) + num(draft.cash);
    return { upad, pending, aapvana: sum(draft.pendingUsers), expenses, grand, extra: grand - num(draft.computer) };
  }, [draft]);

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  /* ----- editor ----- */
  const openNew = (section) => setEditor({ section, index: -1, row: { amount: 0 } });
  const openEdit = (section, index) => setEditor({ section, index, row: { ...draft[section][index] } });
  const saveRow = (row) => {
    const { section, index } = editor;
    setDraft((d) => {
      const rows = [...d[section]];
      if (index === -1) rows.push(row);
      else rows[index] = row;
      return { ...d, [section]: rows };
    });
    setEditor(null);
  };
  const removeRow = () => {
    const { section, index } = editor;
    setDraft((d) => ({ ...d, [section]: d[section].filter((_, i) => i !== index) }));
    setEditor(null);
  };

  /* ----- payload: purane page ke filters jaisa ----- */
  const build = () => {
    const renumber = (rows) => rows.map((r, i) => ({ ...r, id: i + 1, createDate: r.createDate || date }));
    const upad = renumber(draft.upad.filter((r) => num(r.amount) > 0 && r.fullname));
    const pending = renumber(draft.pending.filter((r) => num(r.amount) > 0 && r.fullname));
    const expenses = renumber(draft.expenses.filter((r) => num(r.amount) > 0 && r.expenseName));
    const pendingUsers = renumber(draft.pendingUsers.filter((r) => num(r.amount) > 0 && r.isVendor));
    return {
      createDate: date,
      date,
      upad: JSON.stringify(upad),
      pending: JSON.stringify(pending),
      expenses: JSON.stringify(expenses),
      pendingUsers: JSON.stringify(pendingUsers),
      extraAmount: t.extra,
      totalUpad: t.upad,
      totalPending: t.pending,
      totalExpenses: t.expenses,
      totalCard: num(draft.card),
      totalPP: num(draft.pp),
      totalCash: num(draft.cash),
      grandTotal: t.grand,
      computerAmount: num(draft.computer),
      updatedDateTime: new Date().toString(),
    };
  };

  const submit = async () => {
    setConfirm(false);
    setBusy(true);
    try {
      const body = build();
      if (submitted) await axios.put(`${API}/restEntry/update-entry/${date}`, body);
      else await axios.post(`${API}/restEntry/create-entry`, body);
      toast.success(submitted ? "Restaurant entry update ho gayi" : "Restaurant entry submit ho gayi");
      clearDraft();
      setDraft(EMPTY);
      seededFor.current = "";
      await load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  if (error && !lists) return <Alert severity="error">{error}</Alert>;
  if (!lists || !server.loaded)
    return (
      <Stack spacing={1.5}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={120} />
        ))}
      </Stack>
    );

  const blockReason =
    t.grand <= 0 ? "Kuch bhi nahi bhara" : t.extra < 0 ? `Galla computer se ${inr(-t.extra)} kam hai, check karo` : "";

  const sectionBlock = (key, rowsRender) => {
    const cfg = SECTIONS[key];
    return (
      <Section
        title={cfg.title}
        subtitle={cfg.subtitle}
        total={sum(draft[key])}
        color={cfg.color}
        action={
          <Button size="small" startIcon={<AddIcon />} onClick={() => openNew(key)} sx={{ fontWeight: 800, color: cfg.color }}>
            Jodo
          </Button>
        }
      >
        <RowList rows={draft[key]} onEdit={(i) => openEdit(key, i)} empty="Kuch nahi" render={rowsRender} />
      </Section>
    );
  };

  /* ----- editor content per section ----- */
  const ed = editor;
  const edCfg = ed ? SECTIONS[ed.section] : null;
  const edOptions = ed
    ? { upad: lists.staff, pending: lists.pending, pendingUsers: lists.vendors, expenses: lists.expenses }[ed.section]
    : [];
  const edLabel = (o) => (ed?.section === "expenses" ? o?.expenseName || "" : o?.fullname || "");
  const edValue = ed ? edOptions.find((o) => o._id === ed.row._id && edLabel(o) === edLabel(ed.row)) || (ed.row._id ? ed.row : null) : null;
  const edIsStaffExpense = ed?.section === "expenses" && /staff/i.test(ed.row.categoryName || "");
  const edValid = ed && num(ed.row.amount) > 0 && (ed.section === "expenses" ? !!ed.row.expenseName : !!ed.row.fullname);
  const pickInto = (o) => {
    if (!o) return setEditor((e) => ({ ...e, row: { amount: e.row.amount } }));
    if (ed.section === "expenses")
      setEditor((e) => ({ ...e, row: { ...e.row, _id: o._id, expenseName: o.expenseName, categoryName: o.categoryName, isVendor: o.isVendor, fullname: "", fullname_id: "" } }));
    else setEditor((e) => ({ ...e, row: { ...e.row, ...o } }));
  };

  return (
    <Box sx={{ pb: { xs: 18, md: 0 } }}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        {submitted ? (
          <StatusPill tone="good">
            ✓ Submitted{status?.by ? ` · ${status.by}` : ""}
            {status?.at ? ` · ${dayjs(status.at).format("hh:mm A")}` : ""}
          </StatusPill>
        ) : t.grand > 0 ? (
          <StatusPill tone="info">Draft phone mein safe hai · abhi submit nahi hua</StatusPill>
        ) : (
          <StatusPill tone="warn">Aaj ki restaurant entry abhi nahi hui</StatusPill>
        )}
        {status?.updatedBy && <StatusPill tone="lock">Edit: {status.updatedBy}</StatusPill>}
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2} sx={{ position: { md: "sticky" }, top: { md: 16 } }}>
            <Section title="Galla / Bikri" subtitle="Aaj kitna aaya" color={Q.rest}>
              <Stack spacing={1.5}>
                <MoneyField label="Cash" value={draft.cash} onChange={(v) => set("cash", v)} big />
                <Stack direction="row" spacing={1.5}>
                  <MoneyField label="Card" value={draft.card} onChange={(v) => set("card", v)} />
                  <MoneyField label="PP (UPI)" value={draft.pp} onChange={(v) => set("pp", v)} />
                </Stack>
                <MoneyField
                  label="Computer amount (billing software ka total)"
                  value={draft.computer}
                  onChange={(v) => set("computer", v)}
                  error={t.extra < 0}
                />
              </Stack>
            </Section>

            <Box sx={{ border: `1.5px solid ${t.extra < 0 ? Q.bad : Q.line}`, borderRadius: 3, p: 2, bgcolor: t.extra < 0 ? "#FEF2F2" : "#fff" }}>
              {[
                ["Cash + Card + PP", num(draft.cash) + num(draft.card) + num(draft.pp)],
                ["Upaad", t.upad],
                ["Levana baaki", t.pending],
                ["Kharch", t.expenses],
              ].map(([l, v]) => (
                <Stack key={l} direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                  <Typography color={Q.muted}>{l}</Typography>
                  <Typography fontWeight={600}>{inr(v)}</Typography>
                </Stack>
              ))}
              <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75, mt: 0.5, borderTop: `1px solid ${Q.line}` }}>
                <Typography fontWeight={800}>Grand total</Typography>
                <Typography fontWeight={800}>{inr(t.grand)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color={Q.muted}>Computer amount</Typography>
                <Typography fontWeight={600}>− {inr(draft.computer)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" sx={{ pt: 0.75 }}>
                <Typography fontWeight={800} color={t.extra < 0 ? Q.bad : Q.good}>
                  Farak (extra)
                </Typography>
                <Typography fontWeight={800} color={t.extra < 0 ? Q.bad : Q.good}>
                  {inr(t.extra)}
                </Typography>
              </Stack>
              {t.extra < 0 && (
                <Typography variant="caption" color={Q.bad} fontWeight={700}>
                  Galla computer se kam hai. Koi kharch/upaad chhoot to nahi gaya?
                </Typography>
              )}
            </Box>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={2}>
            {sectionBlock("expenses", (r) => (
              <>
                <Typography fontWeight={700} noWrap>
                  {r.expenseName}
                  {r.fullname ? ` · ${r.fullname}` : ""}
                </Typography>
                <Typography variant="caption" color={Q.muted}>
                  {r.categoryName}
                </Typography>
              </>
            ))}
            {sectionBlock("upad", (r) => (
              <Typography fontWeight={700} noWrap>
                {r.fullname}
              </Typography>
            ))}
            {sectionBlock("pending", (r) => (
              <Typography fontWeight={700} noWrap>
                {r.fullname}
              </Typography>
            ))}
            {sectionBlock("pendingUsers", (r) => (
              <>
                <Typography fontWeight={700} noWrap>
                  {r.fullname}
                </Typography>
                <Typography variant="caption" color={Q.muted}>
                  {r.categoryName}
                </Typography>
              </>
            ))}
          </Stack>
        </Grid>
      </Grid>

      <SaveBar
        label="Grand total"
        amount={t.grand}
        sub={blockReason ? { text: blockReason, color: Q.bad } : { text: `Farak ${inr(t.extra)}`, color: Q.good }}
        buttonText={submitted ? "Update karo" : "Submit karo"}
        color={Q.rest}
        busy={busy}
        disabled={!!blockReason}
        onClick={() => setConfirm(true)}
      />

      <EditorDialog
        open={!!ed}
        onClose={() => setEditor(null)}
        subtitle={`Restaurant · ${date}`}
        title={ed ? `${edCfg.title} ${ed.index === -1 ? "jodo" : "badlo"}` : ""}
        actions={
          <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
            {ed && ed.index !== -1 && (
              <Button color="error" onClick={removeRow} sx={{ fontWeight: 700 }}>
                Hatao
              </Button>
            )}
            <Button
              fullWidth
              variant="contained"
              disabled={!edValid}
              onClick={() => saveRow(ed.row)}
              sx={{ bgcolor: Q.rest, py: 1.4, fontWeight: 800, fontSize: 16, "&:hover": { bgcolor: Q.rest } }}
            >
              Theek hai
            </Button>
          </Stack>
        }
      >
        {ed && (
          <Stack spacing={2}>
            <MoneyField label="Amount" value={ed.row.amount} onChange={(v) => setEditor((e) => ({ ...e, row: { ...e.row, amount: v } }))} big autoFocus />
            <PickField
              label={edCfg.pickLabel}
              options={edOptions}
              value={edValue}
              onChange={pickInto}
              getLabel={edLabel}
              groupBy={ed.section === "expenses" || ed.section === "pendingUsers" ? (o) => o.categoryName || "" : undefined}
            />
            {edIsStaffExpense && (
              <PickField
                label="Kis staff ka (salary / overtime)"
                options={lists.staff}
                value={lists.staff.find((s) => s._id === ed.row.fullname_id) || null}
                onChange={(s) => setEditor((e) => ({ ...e, row: { ...e.row, fullname: s?.fullname || "", fullname_id: s?._id || "" } }))}
                getLabel={(o) => o?.fullname || ""}
              />
            )}
          </Stack>
        )}
      </EditorDialog>

      <ConfirmDialog
        open={confirm}
        color={Q.rest}
        title={submitted ? `${date} ki restaurant entry update karein?` : `${date} ki restaurant entry submit karein?`}
        confirmText={submitted ? "Haan, update karo" : "Haan, submit karo"}
        lines={[
          { label: "Cash / Card / PP", value: `${inr(draft.cash)} / ${inr(draft.card)} / ${inr(draft.pp)}` },
          { label: "Upaad", value: inr(t.upad) },
          { label: "Levana baaki", value: inr(t.pending) },
          { label: "Kharch", value: inr(t.expenses) },
          { label: "Grand total", value: inr(t.grand), color: Q.ink },
          { label: "Computer amount", value: inr(draft.computer), color: num(draft.computer) === 0 ? Q.warn : undefined },
          { label: "Farak", value: inr(t.extra), color: Q.good },
        ]}
        onCancel={() => setConfirm(false)}
        onConfirm={submit}
      />
    </Box>
  );
};

export default RestQuickEntry;
