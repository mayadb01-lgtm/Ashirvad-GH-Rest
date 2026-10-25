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
import PurchaseBillsSection from "./PurchaseBillsSection";
import DueCollectionsSection, { useDueReceipts } from "./DueCollectionsSection";
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
import NewVendorDialog, { NO_ADD_HINT, useCanAddVendor } from "./NewVendorDialog";
import NewPersonDialog from "./NewPersonDialog";

const LOCK_MSG = "Already submitted. Only the owner can change it.";
const EMPTY = { cash: 0, card: 0, pp: 0, computer: 0, upad: [], pending: [], pendingUsers: [], expenses: [] };
const sum = (rows) => rows.reduce((s, r) => s + num(r.amount), 0);
const PERIOD_LABEL = { day: "Day", night: "Night", extraDay: "Extra Day", extraNight: "Extra Night" };
const roomText = (rm) => (rm ? `🛏 Room ${rm.roomNo}${rm.guestName ? ` · ${rm.guestName}` : ""}` : "");
const stripRoom = (rows) => rows.map(({ room, roomMode, ...r }) => r); // eslint-disable-line no-unused-vars

const SECTIONS = {
  upad: { title: "Staff advance", subtitle: "Advance given to staff", pickLabel: "Staff", color: "#7C3AED" },
  pending: { title: "Receivables", subtitle: "Money to be collected (given on credit)", pickLabel: "Collect from", color: "#0891B2" },
  pendingUsers: { title: "Payables", subtitle: "Amount owed to vendors (not added to total)", pickLabel: "Vendor", color: "#64748B" },
  expenses: { title: "Expenses", subtitle: "Today's expenses", pickLabel: "Expense item", color: "#DB2777" },
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

const RestQuickEntry = ({ date, canEdit = true }) => {
  const [lists, setLists] = useState(null);
  const [newVendor, setNewVendor] = useState(null); // { name } → naya vendor (Payables / Kharch)
  const canAddVendor = useCanAddVendor();
  const [newPerson, setNewPerson] = useState(null); // { kind: "staff" | "pending", name, forSalary }
  const [server, setServer] = useState({ loaded: false, doc: null });
  const [status, setStatus] = useState(null);
  const [occupied, setOccupied] = useState({ guests: [], rooms: [] });
  const [draft, setDraft, clearDraft] = useDraft(`qe-rest-${date}`, EMPTY);
  const [editor, setEditor] = useState(null); // { section, index, row }
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const seededFor = useRef("");
  const roomRowsRef = useRef([]);
  // 💰 Purana udhaar wasool (alag collection, sale nahi)
  const dues = useDueReceipts(date);
  // 🧾 Purchase bills (alag collection) — save hote hi Expenses / Payables mein line
  const [bills, setBills] = useState([]);
  const loadBills = useCallback(
    () =>
      axios
        .get(`${API}/purchase/day/${date}`)
        .then(({ data }) => setBills(data.data || []))
        .catch(() => setBills([])),
    [date]
  );
  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const load = useCallback(async () => {
    setError("");
    setServer({ loaded: false, doc: null });
    try {
      const [staff, pend, cats, e, s, occ, links] = await Promise.all([
        axios.get(`${API}/restStaff/get-staff-id-name-mobile`),
        axios.get(`${API}/restPending/get-all-pending-users`),
        axios.get(`${API}/restCategory/get-categories`),
        axios.get(`${API}/restEntry/get-entry/${date}`),
        axios.get(`${API}/quick/day-status/${date}`).catch(() => ({ data: {} })),
        axios.get(`${API}/room-charges/occupied/${date}`).catch(() => ({ data: { data: { guests: [], rooms: [] } } })),
        axios.get(`${API}/room-charges/rest/${date}`).catch(() => ({ data: { data: [] } })),
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
      setOccupied(occ.data?.data || { guests: [], rooms: [] });
      const linkMap = {};
      (links.data?.data || []).forEach((c) => (linkMap[c.restRowId] = { roomNo: c.roomNo, period: c.period, guestName: c.guestName, mobile: c.mobile }));
      setServer({ loaded: true, doc, links: linkMap });
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
  const editLocked = submitted && !canEdit;

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
      pending: (d.pending || []).map((r) => (server.links?.[r.id] ? { ...r, room: server.links[r.id] } : r)),
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
  // Submit ke baad badalna: sirf owner ya jise Super Admin ne "Edit" diya
  const openNew = (section) => (editLocked ? toast.error(LOCK_MSG) : setEditor({ section, index: -1, row: { amount: 0 } }));
  const openEdit = (section, index) => (editLocked ? toast.error(LOCK_MSG) : setEditor({ section, index, row: { ...draft[section][index] } }));
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

  // Har bill ki line din ki entry mein ho (page reload / doosre phone se bill aaya ho to bhi) — gayab ho to wapas jodo
  const billRow = (bill) => {
    const v = bill.vendor || {};
    return bill.mode === "Payable"
      ? { amount: num(bill.amount), purchaseKey: bill.rowKey, _id: v._id, fullname: v.name || v.expenseName, mobileNumber: 0, category: "", expenseName: v.expenseName, isVendor: true, categoryName: v.categoryName }
      : { amount: num(bill.amount), purchaseKey: bill.rowKey, _id: v._id, expenseName: v.expenseName || v.name, categoryName: v.categoryName, isVendor: !!v.isVendor, fullname: "", fullname_id: "" };
  };
  useEffect(() => {
    if (!server.loaded || !lists || !bills.length) return;
    if (server.doc && seededFor.current !== date) return; // pehle server wali entry bhar jaye
    setDraft((d) => {
      let changed = false;
      const next = { ...d, expenses: [...d.expenses], pendingUsers: [...d.pendingUsers] };
      const used = { expenses: new Set(), pendingUsers: new Set() };
      bills.forEach((bill) => {
        const sec = bill.mode === "Payable" ? "pendingUsers" : "expenses";
        const rows = next[sec];
        let i = rows.findIndex((r, j) => !used[sec].has(j) && r.purchaseKey && r.purchaseKey === bill.rowKey);
        if (i < 0)
          i = rows.findIndex(
            (r, j) => !used[sec].has(j) && !r.purchaseKey && num(r.amount) === num(bill.amount) && (r.expenseName === bill.vendor?.expenseName || r.fullname === bill.vendor?.name)
          );
        if (i >= 0) used[sec].add(i);
        else {
          rows.push(billRow(bill));
          used[sec].add(rows.length - 1);
          changed = true;
        }
      });
      return changed ? next : d;
    });
  }, [bills, server, lists, date, setDraft]);

  const billSaved = (bill, v) => {
    const base = { amount: num(bill.amount), purchaseKey: bill.rowKey };
    if (bill.mode === "Payable")
      setDraft((d) => ({
        ...d,
        pendingUsers: [
          ...d.pendingUsers,
          { ...base, _id: v._id, fullname: v.fullname || v.expenseName, mobileNumber: v.mobileNumber || 0, category: v.category || "", expenseName: v.expenseName, isVendor: true, categoryName: v.categoryName },
        ],
      }));
    else
      setDraft((d) => ({
        ...d,
        expenses: [...d.expenses, { ...base, _id: v._id, expenseName: v.expenseName || v.fullname, categoryName: v.categoryName, isVendor: !!v.isVendor, fullname: "", fullname_id: "" }],
      }));
    loadBills();
    toast.success(`Bill saved → added to ${bill.mode === "Payable" ? "Payables" : "Expenses"}. Press ${submitted ? "Update" : "Submit"} to save the day.`, { duration: 5000 });
  };
  const billDeleted = (bill) => {
    const sec = bill.mode === "Payable" ? "pendingUsers" : "expenses";
    setDraft((d) => {
      const rows = [...d[sec]];
      let i = rows.findIndex((r) => r.purchaseKey && r.purchaseKey === bill.rowKey);
      // submit ke baad key nahi rehti → naam + rakam se dhoondo
      if (i < 0) i = rows.findIndex((r) => num(r.amount) === num(bill.amount) && (r.expenseName === bill.vendor?.expenseName || r.fullname === bill.vendor?.name));
      if (i >= 0) rows.splice(i, 1);
      return { ...d, [sec]: rows };
    });
    loadBills();
    toast.success(`Bill removed. Press ${submitted ? "Update" : "Submit"} to save the day.`);
  };

  /* ----- payload: purane page ke filters jaisa ----- */
  const build = () => {
    // eslint-disable-next-line no-unused-vars
    const renumber = (rows) => rows.map(({ purchaseKey, ...r }, i) => ({ ...r, id: i + 1, createDate: r.createDate || date }));
    const upad = renumber(draft.upad.filter((r) => num(r.amount) > 0 && r.fullname));
    const pending = renumber(draft.pending.filter((r) => num(r.amount) > 0 && r.fullname));
    const expenses = renumber(draft.expenses.filter((r) => num(r.amount) > 0 && r.expenseName));
    const pendingUsers = renumber(draft.pendingUsers.filter((r) => num(r.amount) > 0 && r.isVendor));
    roomRowsRef.current = pending
      .filter((r) => r.room?.roomNo)
      .map((r) => ({ rowId: r.id, roomNo: r.room.roomNo, period: r.room.period || "", guestName: r.room.guestName || "", mobile: r.room.mobile || "", amount: num(r.amount) }));
    return {
      createDate: date,
      date,
      upad: JSON.stringify(upad),
      pending: JSON.stringify(stripRoom(pending)),
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
      // Levana baaki ki "room" rows → GH room ke bill mein
      try {
        await axios.put(`${API}/room-charges/rest-sync/${date}`, { rows: roomRowsRef.current });
      } catch (e2) {
        toast.error("Entry saved, but the room bill was not sent to GH. Press 'Update' again.");
      }
      toast.success(submitted ? "Restaurant entry updated" : "Restaurant entry submitted");
      clearDraft();
      setDraft(EMPTY);
      seededFor.current = "";
      await load();
      dues.reload();
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
    t.grand <= 0 ? "Nothing entered yet" : t.extra < 0 ? `Cash collection is ${inr(-t.extra)} less than computer amount, please check` : "";

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
            Add
          </Button>
        }
      >
        <RowList rows={draft[key]} onEdit={(i) => openEdit(key, i)} empty="None" render={rowsRender} />
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
  // Levana baaki → Room: kaun se room ka bill hai
  const roomOptions = (() => {
    const GROUP = { today: "Today's guests", stay: "Staying guests (continue stay)", yesterday: "Last night's guests" };
    const ORDER = { today: 1, stay: 2, yesterday: 3 };
    const tail = (x) =>
      x.from === "today"
        ? ` (${PERIOD_LABEL[x.fromPeriod] || x.fromPeriod || "today"})`
        : x.from === "stay"
          ? x.leaving
            ? " (checking out today)"
            : ` (staying${x.dayNo ? `, day ${x.dayNo}` : ""})`
          : " (last night)";
    const g = (occupied.guests || []).map((x) => ({
      ...x,
      group: GROUP[x.from] || GROUP.yesterday,
      label: `Room ${x.roomNo} · ${x.guestName || "—"}${tail(x)}`,
    }));
    // Sirf jin rooms mein guest ruka hai. Khaali "other rooms" nahi dikhate. Group ke hisaab se kram (heading ek hi baar)
    return g.sort((a, b) => (ORDER[a.from] || 9) - (ORDER[b.from] || 9) || a.roomNo - b.roomNo);
  })();
  const roomBillPerson = () => {
    const p = (lists?.pending || []).find((x) => /room\s*bill/i.test(x.fullname || ""));
    return p ? { _id: p._id, fullname: p.fullname, mobileNumber: p.mobileNumber || 0, category: p.category || "Pending" } : { fullname: "Room bill", mobileNumber: 0, category: "Pending" };
  };
  const edRoomMode = ed?.section === "pending" && (ed.row.roomMode || !!ed.row.room);
  const setRoomMode = (on) =>
    setEditor((e) => ({ ...e, row: on ? { amount: e.row.amount, roomMode: true } : { amount: e.row.amount, roomMode: false } }));
  const pickRoom = (o) =>
    setEditor((e) => ({
      ...e,
      row: o
        ? { ...e.row, ...roomBillPerson(), roomMode: true, room: { roomNo: o.roomNo, period: o.period || "", guestName: o.guestName || "", mobile: o.mobile || "" } }
        : { amount: e.row.amount, roomMode: true },
    }));
  const pickInto = (o) => {
    if (!o) return setEditor((e) => ({ ...e, row: { amount: e.row.amount } }));
    if (ed.section === "expenses")
      setEditor((e) => ({ ...e, row: { ...e.row, _id: o._id, expenseName: o.expenseName, categoryName: o.categoryName, isVendor: o.isVendor, fullname: "", fullname_id: "" } }));
    else setEditor((e) => {
      const { room, roomMode, ...rest } = e.row; // eslint-disable-line no-unused-vars
      return { ...e, row: { ...rest, ...o } };
    });
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
          <StatusPill tone="info">Draft saved on this device · not submitted yet</StatusPill>
        ) : (
          <StatusPill tone="warn">Today's restaurant entry is not done yet</StatusPill>
        )}
        {status?.updatedBy && <StatusPill tone="lock">Edit: {status.updatedBy}</StatusPill>}
        {editLocked && <StatusPill tone="lock">🔒 Submitted — only the owner can change it</StatusPill>}
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={2}>
            <PurchaseBillsSection
              date={date}
              book="rest"
              modes={["Cash", "Payable"]}
              color={Q.rest}
              subtitle="Scan or type a supplier bill · Cash → Expenses, credit → Payables"
              vendors={lists.vendors}
              expenses={lists.expenses}
              bills={bills}
              onSaved={billSaved}
              onDeleted={billDeleted}
              deleteNote={(b) => `Its line in ${b.mode === "Payable" ? "Payables" : "Expenses"} is removed too.`}
            />
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
              <>
                <Typography fontWeight={700} noWrap>
                  {r.fullname}
                </Typography>
                {r.room && (
                  <Typography variant="caption" sx={{ color: "#0F766E", fontWeight: 700 }} noWrap component="div">
                    {roomText(r.room)}
                    {r.room.period ? ` · ${PERIOD_LABEL[r.room.period] || r.room.period}` : ""}
                  </Typography>
                )}
              </>
            ))}
            <DueCollectionsSection date={date} dues={dues} />
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
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2} sx={{ position: { md: "sticky" }, top: { md: 16 } }}>
            <Section title="Cash collection / Sales" subtitle="Today's collection" color={Q.rest}>
              <Stack spacing={1.5}>
                <MoneyField label="Counter cash" value={draft.cash} onChange={(v) => set("cash", v)} big />
                <Stack direction="row" spacing={1.5}>
                  <MoneyField label="Card" value={draft.card} onChange={(v) => set("card", v)} />
                  <MoneyField label="PP (UPI)" value={draft.pp} onChange={(v) => set("pp", v)} />
                </Stack>
                <MoneyField
                  label="Computer amount (billing software total)"
                  value={draft.computer}
                  onChange={(v) => set("computer", v)}
                  error={t.extra < 0}
                />
              </Stack>
            </Section>

            <Box sx={{ border: `1.5px solid ${t.extra < 0 ? Q.bad : Q.line}`, borderRadius: 3, p: 2, bgcolor: t.extra < 0 ? "#FEF2F2" : "#fff" }}>
              {[
                ["Counter cash + Card + PP", num(draft.cash) + num(draft.card) + num(draft.pp)],
                ["Staff advance", t.upad],
                ["Receivables", t.pending],
                ["Expenses", t.expenses],
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
                  Difference (extra)
                </Typography>
                <Typography fontWeight={800} color={t.extra < 0 ? Q.bad : Q.good}>
                  {inr(t.extra)}
                </Typography>
              </Stack>
              {t.extra < 0 && (
                <Typography variant="caption" color={Q.bad} fontWeight={700}>
                  Cash collection is less than computer amount. Did you miss an expense or staff advance?
                </Typography>
              )}
            </Box>
            {/* 💵 Total by payment mode: counter (aaj ki sale) + collections (purana udhaar + GH se room food bill cash) */}
            {(() => {
              const rows = [
                ["Cash", num(draft.cash), dues.byMode.Cash + dues.fromGh],
                // Card aur PP dono ek hi account (PP) mein aate hain — isliye ek line
                ["Card + PP", num(draft.card) + num(draft.pp), dues.byMode.Card + dues.byMode.PP],
              ];
              const tc = rows.reduce((a, r) => a + r[1], 0);
              const tl = rows.reduce((a, r) => a + r[2], 0);
              if (tc + tl <= 0) return null;
              const cell = { textAlign: "right", fontVariantNumeric: "tabular-nums", minWidth: 92, pl: 1.5 };
              return (
                <Box sx={{ border: `1.5px solid #A5F3FC`, borderRadius: 3, p: 2, bgcolor: "#ECFEFF" }}>
                  <Typography fontWeight={800}>💵 Total by payment mode</Typography>
                  <Typography variant="caption" color={Q.muted} sx={{ display: "block", mb: 1 }}>
                    Counter = today's sale · Collections = old dues received{dues.fromGh ? " + cash from GH (room food bills)" : ""} (not sales)
                  </Typography>
                  <Stack direction="row" sx={{ py: 0.4, borderBottom: `1px solid #A5F3FC` }}>
                    <Typography variant="caption" fontWeight={800} color={Q.muted} sx={{ flex: 1 }}>
                      MODE
                    </Typography>
                    <Typography variant="caption" fontWeight={800} color={Q.muted} sx={cell}>
                      COUNTER
                    </Typography>
                    <Typography variant="caption" fontWeight={800} color={Q.muted} sx={cell}>
                      COLLECTIONS
                    </Typography>
                    <Typography variant="caption" fontWeight={800} color={Q.muted} sx={cell}>
                      TOTAL
                    </Typography>
                  </Stack>
                  {rows.map(([l, c, d]) => (
                    <Stack key={l} direction="row" sx={{ py: 0.4 }}>
                      <Typography fontWeight={l === "Cash" ? 800 : 600} sx={{ flex: 1 }}>
                        {l === "Cash" ? "Total cash" : "Total Card + PP"}
                        {l !== "Cash" && (
                          <Typography component="span" variant="caption" color={Q.muted} sx={{ display: "block", fontWeight: 400 }}>
                            same PP account · Card {inr(num(draft.card) + dues.byMode.Card)} + PP {inr(num(draft.pp) + dues.byMode.PP)}
                          </Typography>
                        )}
                      </Typography>
                      <Typography sx={cell}>{inr(c)}</Typography>
                      <Typography sx={cell}>{inr(d)}</Typography>
                      <Typography fontWeight={800} sx={cell}>
                        {inr(c + d)}
                      </Typography>
                    </Stack>
                  ))}
                  <Stack direction="row" sx={{ py: 0.6, mt: 0.5, borderTop: `1px solid #A5F3FC` }}>
                    <Typography fontWeight={800} sx={{ flex: 1 }}>
                      Total (all modes)
                    </Typography>
                    <Typography fontWeight={700} sx={cell}>
                      {inr(tc)}
                    </Typography>
                    <Typography fontWeight={700} sx={cell}>
                      {inr(tl)}
                    </Typography>
                    <Typography fontWeight={800} sx={{ ...cell, color: "#155E75" }}>
                      {inr(tc + tl)}
                    </Typography>
                  </Stack>
                  {dues.ghCard?.total > 0 && (
                    <Box sx={{ mt: 0.75, p: 1, borderRadius: 2, bgcolor: "#fff", border: "1px dashed #A5F3FC" }}>
                      <Stack direction="row">
                        <Typography sx={{ flex: 1 }} color={Q.muted}>
                          + GH card on the same machine (saved GH entry)
                        </Typography>
                        <Typography fontWeight={700} sx={cell}>
                          {inr(dues.ghCard.total)}
                        </Typography>
                      </Stack>
                      <Stack direction="row">
                        <Typography fontWeight={800} sx={{ flex: 1 }}>
                          Card machine total (Restaurant + GH)
                        </Typography>
                        <Typography fontWeight={800} sx={{ ...cell, color: "#155E75" }}>
                          {inr(num(draft.card) + dues.byMode.Card + dues.ghCard.total)}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color={Q.muted}>
                        Match this with the card machine settlement. GH card is GH money — it is not added to restaurant sales.
                      </Typography>
                    </Box>
                  )}
                  {dues.toOffice > 0 && (
                    <Stack direction="row" sx={{ py: 0.4 }}>
                      <Typography sx={{ flex: 1 }} color={Q.muted}>
                        Cash given to Office today (recorded by Office)
                      </Typography>
                      <Typography fontWeight={800} sx={cell}>
                        − {inr(dues.toOffice)}
                      </Typography>
                    </Stack>
                  )}
                  {dues.toOffice > 0 && (
                    <Stack direction="row" sx={{ py: 0.4 }}>
                      <Typography fontWeight={800} sx={{ flex: 1 }}>
                        Cash left in drawer
                      </Typography>
                      <Typography fontWeight={800} sx={{ ...cell, color: "#155E75" }}>
                        {inr(rows[0][1] + rows[0][2] - dues.toOffice)}
                      </Typography>
                    </Stack>
                  )}
                  {tl > 0 && (
                    <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "#155E75", fontWeight: 700 }}>
                      In "Counter cash", Card and PP above enter only today's sale. Collections are added here automatically.
                    </Typography>
                  )}
                </Box>
              );
            })()}
          </Stack>
        </Grid>
      </Grid>

      <SaveBar
        label="Grand total"
        amount={t.grand}
        sub={editLocked ? { text: LOCK_MSG, color: Q.bad } : blockReason ? { text: blockReason, color: Q.bad } : { text: `Difference ${inr(t.extra)}`, color: Q.good }}
        buttonText={submitted ? "Update" : "Submit"}
        color={Q.rest}
        busy={busy}
        disabled={!!blockReason || editLocked}
        onClick={() => setConfirm(true)}
      />

      <EditorDialog
        open={!!ed}
        onClose={() => setEditor(null)}
        subtitle={`Restaurant · ${date}`}
        title={ed ? `${ed.index === -1 ? "Add" : "Edit"} ${edCfg.title.toLowerCase()}` : ""}
        actions={
          <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
            {ed && ed.index !== -1 && (
              <Button color="error" onClick={removeRow} sx={{ fontWeight: 700 }}>
                Remove
              </Button>
            )}
            <Button
              fullWidth
              variant="contained"
              disabled={!edValid}
              onClick={() => saveRow(ed.row)}
              sx={{ bgcolor: Q.rest, py: 1.4, fontWeight: 800, fontSize: 16, "&:hover": { bgcolor: Q.rest } }}
            >
              Save
            </Button>
          </Stack>
        }
      >
        {ed && (
          <Stack spacing={2}>
            <MoneyField label="Amount" value={ed.row.amount} onChange={(v) => setEditor((e) => ({ ...e, row: { ...e.row, amount: v } }))} big autoFocus />
            {ed.section === "pending" && (
              <Stack direction="row" spacing={1}>
                {[
                  [false, "👤 Person / company"],
                  [true, "🛏 Room bill"],
                ].map(([v, l]) => (
                  <Button
                    key={l}
                    fullWidth
                    variant={!!edRoomMode === v ? "contained" : "outlined"}
                    onClick={() => setRoomMode(v)}
                    sx={{ fontWeight: 800, ...(!!edRoomMode === v ? { bgcolor: "#0891B2", "&:hover": { bgcolor: "#0891B2" } } : { color: "#0891B2", borderColor: "#0891B2" }) }}
                  >
                    {l}
                  </Button>
                ))}
              </Stack>
            )}
            {edRoomMode ? (
              <>
                <PickField
                  label="Room / guest"
                  options={roomOptions}
                  value={ed.row.room ? roomOptions.find((o) => o.roomNo === ed.row.room.roomNo && (o.guestName || "") === (ed.row.room.guestName || "")) || { ...ed.row.room, label: `Room ${ed.row.room.roomNo}${ed.row.room.guestName ? ` · ${ed.row.room.guestName}` : ""}` } : null}
                  onChange={pickRoom}
                  getLabel={(o) => o?.label || ""}
                  groupBy={(o) => o.group || ""}
                />
                {roomOptions.length === 0 && (
                  <Typography variant="caption" color={Q.bad} fontWeight={700}>
                    No guest is staying in any room today. Room bill can be given only to a room with a guest.
                  </Typography>
                )}
                <Typography variant="caption" color={Q.muted}>
                  This amount will be added to that room's Guest House bill automatically (after Submit / Update). In restaurant accounts it stays as a receivable under "{roomBillPerson().fullname.trim()}".
                </Typography>
              </>
            ) : (
            <PickField
              label={edCfg.pickLabel}
              options={edOptions}
              value={edValue}
              onChange={pickInto}
              getLabel={edLabel}
              groupBy={ed.section === "expenses" || ed.section === "pendingUsers" ? (o) => o.categoryName || "" : undefined}
              onAddNew={
                !canAddVendor
                  ? undefined
                  : ed.section === "expenses" || ed.section === "pendingUsers"
                    ? (name) => setNewVendor({ name })
                    : ed.section === "upad"
                      ? (name) => setNewPerson({ kind: "staff", name })
                      : ed.section === "pending"
                        ? (name) => setNewPerson({ kind: "pending", name })
                        : undefined
              }
              addLabel={ed.section === "upad" ? "New staff" : ed.section === "pending" ? "New person" : "New vendor"}
              noOptionsHint={ed.section === "expenses" || ed.section === "pendingUsers" ? NO_ADD_HINT : ed.section === "upad" || ed.section === "pending" ? "Not in the list. Ask the manager to add this name." : undefined}
            />
            )}
            {edIsStaffExpense && (
              <PickField
                label="Staff member (salary / overtime)"
                options={lists.staff}
                value={lists.staff.find((s) => s._id === ed.row.fullname_id) || null}
                onChange={(s) => setEditor((e) => ({ ...e, row: { ...e.row, fullname: s?.fullname || "", fullname_id: s?._id || "" } }))}
                getLabel={(o) => o?.fullname || ""}
                onAddNew={canAddVendor ? (name) => setNewPerson({ kind: "staff", name, forSalary: true }) : undefined}
                addLabel="New staff"
              />
            )}
          </Stack>
        )}
      </EditorDialog>
      <NewPersonDialog
        open={!!newPerson}
        kind={newPerson?.kind || "staff"}
        initialName={newPerson?.name || ""}
        existing={newPerson?.kind === "pending" ? lists?.pending || [] : lists?.staff || []}
        onClose={() => setNewPerson(null)}
        color={Q.rest}
        onCreated={(p) => {
          const o = { _id: p._id, fullname: p.fullname, mobileNumber: p.mobileNumber || 0, category: p.category || (newPerson?.kind === "pending" ? "Pending" : "Staff") };
          const key = newPerson?.kind === "pending" ? "pending" : "staff";
          setLists((l) => (l ? { ...l, [key]: [...l[key].filter((x) => x._id !== o._id), o] } : l));
          if (!editor) return;
          if (newPerson?.forSalary) setEditor((e) => ({ ...e, row: { ...e.row, fullname: o.fullname, fullname_id: o._id } }));
          else pickInto(o);
        }}
      />
      <NewVendorDialog
        open={!!newVendor}
        initialName={newVendor?.name || ""}
        onClose={() => setNewVendor(null)}
        color={Q.rest}
        onCreated={(v) => {
          const vend = { _id: v._id, fullname: v.expenseName, mobileNumber: 0, category: "", expenseName: v.expenseName, isVendor: true, categoryName: v.categoryName, categoryDescription: "" };
          const exp = { _id: v._id, expenseName: v.expenseName, categoryName: v.categoryName, isVendor: true };
          setLists((l) => (l ? { ...l, vendors: [...l.vendors.filter((x) => x._id !== v._id), vend], expenses: [...l.expenses.filter((x) => x._id !== v._id), exp] } : l));
          if (editor) pickInto(editor.section === "expenses" ? exp : vend);
        }}
      />

      <ConfirmDialog
        open={confirm}
        color={Q.rest}
        title={submitted ? `Update restaurant entry for ${date}?` : `Submit restaurant entry for ${date}?`}
        confirmText={submitted ? "Yes, update" : "Yes, submit"}
        lines={[
          { label: "Cash / Card / PP", value: `${inr(draft.cash)} / ${inr(draft.card)} / ${inr(draft.pp)}` },
          { label: "Staff advance", value: inr(t.upad) },
          { label: "Receivables", value: inr(t.pending) },
          { label: "Expenses", value: inr(t.expenses) },
          { label: "Grand total", value: inr(t.grand), color: Q.ink },
          { label: "Computer amount", value: inr(draft.computer), color: num(draft.computer) === 0 ? Q.warn : undefined },
          { label: "Difference", value: inr(t.extra), color: Q.good },
        ]}
        onCancel={() => setConfirm(false)}
        onConfirm={submit}
      />
    </Box>
  );
};

export default RestQuickEntry;
