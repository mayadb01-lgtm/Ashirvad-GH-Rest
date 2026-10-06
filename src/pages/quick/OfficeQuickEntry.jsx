// Office Book: Aavak (In) / Javak (Out), PC + mobile
// Category list purane page jaisi:
//   In  = Office categories (Pending ke alawa) + restaurant vendors + Pending log
//   Out = Restaurant categories
// Data purane format mein: /officeBook/create-entry, /officeBook/update-entry
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { Alert, Box, Button, ButtonBase, Skeleton, Stack, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import AddIcon from "@mui/icons-material/Add";
import {
  API,
  ChipChoice,
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

const MODES = ["Cash", "Card", "PP", "PPS", "PPC", "UnPaid"];
const EMPTY = { officeIn: [], officeOut: [] };
const isStaffCat = (c) => /upad|upaad|staff/i.test(c || "");
const rowValid = (r) => num(r.amount) > 0 && r.categoryName && r.expenseName && r.modeOfPayment && String(r.fullname || "").trim() && r._id;
const sum = (rows) => rows.reduce((s, r) => s + num(r.amount), 0);

const OfficeQuickEntry = ({ date }) => {
  const [lists, setLists] = useState(null);
  const [server, setServer] = useState({ loaded: false, doc: null });
  const [status, setStatus] = useState(null);
  const [draft, setDraft, clearDraft] = useDraft(`qe-office-${date}`, EMPTY);
  const [editor, setEditor] = useState(null); // { side, index, row }
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const seededFor = useRef("");

  const load = useCallback(async () => {
    setError("");
    setServer({ loaded: false, doc: null });
    try {
      const [oc, rc, pend, staff, e, s] = await Promise.all([
        axios.get(`${API}/officeBook/get-categories`),
        axios.get(`${API}/restCategory/get-categories`),
        axios.get(`${API}/restPending/get-all-pending-users`),
        axios.get(`${API}/restStaff/get-staff-id-name-mobile`),
        axios.get(`${API}/officeBook/get-entry/${date}`),
        axios.get(`${API}/quick/day-status/${date}`).catch(() => ({ data: {} })),
      ]);
      const office = oc.data.data || [];
      const rest = rc.data.data || [];
      const flat = (cats, vendorOnly = false) =>
        cats.flatMap((c) =>
          (c.expense || [])
            .filter((x) => (vendorOnly ? x?.isVendor : true))
            .map((x) => ({ _id: x._id, expenseName: x.expenseName, categoryName: c.categoryName, isVendor: !!x?.isVendor }))
        );
      const pendingAsExpense = (pend.data.data || []).map((p) => ({ _id: p._id, expenseName: p.fullname, categoryName: "Pending", isVendor: false }));
      setLists({
        in: [...flat(office.filter((c) => c.categoryName !== "Pending")), ...flat(rest, true), ...pendingAsExpense],
        out: flat(rest),
        staff: (staff.data.data || []).map((x) => ({ _id: x._id, fullname: x.fullname })),
      });
      const doc = e.data.data && !Array.isArray(e.data.data) && e.data.data._id ? e.data.data : null;
      setServer({ loaded: true, doc });
      setStatus(s.data?.data?.office || null);
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
    setDraft({ officeIn: server.doc.officeIn || [], officeOut: server.doc.officeOut || [] });
  }, [server, date, setDraft]);

  const t = useMemo(() => ({ in: sum(draft.officeIn), out: sum(draft.officeOut) }), [draft]);

  const openNew = (side) => setEditor({ side, index: -1, row: { amount: 0, modeOfPayment: "", fullname: "", remark: "" } });
  const openEdit = (side, index) => setEditor({ side, index, row: { ...draft[side][index] } });
  const saveRow = () => {
    const { side, index, row } = editor;
    setDraft((d) => {
      const rows = [...d[side]];
      if (index === -1) rows.push(row);
      else rows[index] = row;
      return { ...d, [side]: rows };
    });
    setEditor(null);
  };
  const removeRow = () => {
    const { side, index } = editor;
    setDraft((d) => ({ ...d, [side]: d[side].filter((_, i) => i !== index) }));
    setEditor(null);
  };

  const invalidCount = [...draft.officeIn, ...draft.officeOut].filter((r) => num(r.amount) > 0 && !rowValid(r)).length;

  const submit = async () => {
    setConfirm(false);
    setBusy(true);
    try {
      const prep = (rows) =>
        rows.filter(rowValid).map((r, i) => ({ ...r, id: String(i + 1), amount: num(r.amount), fullname: String(r.fullname).trim(), createDate: r.createDate || date }));
      const body = {
        officeIn: JSON.stringify(prep(draft.officeIn)),
        officeOut: JSON.stringify(prep(draft.officeOut)),
        createDate: date,
        entryCreateDate: server.doc?.entryCreateDate || dayjs(date, "DD-MM-YYYY").startOf("day").toDate(),
        updatedDate: dayjs().format("DD-MM-YYYY"),
      };
      if (submitted) await axios.put(`${API}/officeBook/update-entry/${date}`, body);
      else await axios.post(`${API}/officeBook/create-entry`, body);
      toast.success(submitted ? "Office entry update ho gayi" : "Office entry submit ho gayi");
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
        {[1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={140} />
        ))}
      </Stack>
    );

  const side = (key, title, subtitle, color) => (
    <Section
      title={title}
      subtitle={subtitle}
      total={sum(draft[key])}
      color={color}
      action={
        <Button size="small" startIcon={<AddIcon />} onClick={() => openNew(key)} sx={{ fontWeight: 800, color }}>
          Jodo
        </Button>
      }
    >
      {draft[key].length === 0 && (
        <Typography variant="body2" color={Q.muted} sx={{ py: 1 }}>
          Kuch nahi
        </Typography>
      )}
      {draft[key].map((r, i) => {
        const bad = num(r.amount) > 0 && !rowValid(r);
        return (
          <ButtonBase key={i} onClick={() => openEdit(key, i)} sx={{ display: "flex", width: "100%", textAlign: "left", py: 1, px: 0.5, borderTop: i ? `1px solid ${Q.line}` : "none" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={700} noWrap>
                {r.expenseName || "—"}
                {r.fullname ? ` · ${r.fullname}` : ""}
              </Typography>
              <Typography variant="caption" color={bad ? Q.bad : Q.muted} fontWeight={bad ? 700 : 400}>
                {bad ? "Adhoora, tap karke poora karo" : `${r.categoryName} · ${r.modeOfPayment}${r.remark ? ` · ${r.remark}` : ""}`}
              </Typography>
            </Box>
            <Typography fontWeight={800}>{inr(r.amount)}</Typography>
          </ButtonBase>
        );
      })}
    </Section>
  );

  const ed = editor;
  const opts = ed ? (ed.side === "officeIn" ? lists.in : lists.out) : [];
  const edValue = ed?.row._id ? opts.find((o) => o._id === ed.row._id && o.expenseName === ed.row.expenseName) || null : null;
  const staffName = ed && isStaffCat(ed.row.categoryName);
  const setRow = (patch) => setEditor((e) => ({ ...e, row: { ...e.row, ...patch } }));
  const edColor = ed?.side === "officeIn" ? Q.office : "#7C3AED";

  return (
    <Box sx={{ pb: { xs: 18, md: 0 } }}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        {submitted ? (
          <StatusPill tone="good">
            ✓ Submitted{status?.by ? ` · ${status.by}` : ""}
            {status?.at ? ` · ${dayjs(status.at).format("hh:mm A")}` : ""}
          </StatusPill>
        ) : t.in + t.out > 0 ? (
          <StatusPill tone="info">Draft phone mein safe hai · abhi submit nahi hua</StatusPill>
        ) : (
          <StatusPill tone="warn">Aaj ki office entry abhi nahi hui</StatusPill>
        )}
        {status?.updatedBy && <StatusPill tone="lock">Edit: {status.updatedBy}</StatusPill>}
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>{side("officeIn", "Aavak (In)", "Jo paisa aaya", Q.office)}</Grid>
        <Grid size={{ xs: 12, md: 6 }}>{side("officeOut", "Javak (Out)", "Jo paisa gaya", "#7C3AED")}</Grid>
      </Grid>

      <SaveBar
        label={`In ${inr(t.in)} · Out ${inr(t.out)}`}
        amount={t.in - t.out}
        sub={invalidCount ? { text: `${invalidCount} entry adhoori hai`, color: Q.bad } : { text: "Bacha (In − Out)" }}
        buttonText={submitted ? "Update karo" : "Submit karo"}
        color={Q.office}
        busy={busy}
        disabled={invalidCount > 0 || t.in + t.out === 0}
        onClick={() => setConfirm(true)}
      />

      <EditorDialog
        open={!!ed}
        onClose={() => setEditor(null)}
        subtitle={`Office · ${date}`}
        title={ed ? `${ed.side === "officeIn" ? "Aavak" : "Javak"} ${ed.index === -1 ? "jodo" : "badlo"}` : ""}
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
              disabled={!ed || !rowValid({ ...ed.row, _id: ed.row._id })}
              onClick={saveRow}
              sx={{ bgcolor: edColor, py: 1.4, fontWeight: 800, fontSize: 16, "&:hover": { bgcolor: edColor } }}
            >
              Theek hai
            </Button>
          </Stack>
        }
      >
        {ed && (
          <Stack spacing={2}>
            <MoneyField label="Amount" value={ed.row.amount} onChange={(v) => setRow({ amount: v })} big autoFocus />
            <ChipChoice label="Payment" options={MODES} value={ed.row.modeOfPayment} onChange={(v) => setRow({ modeOfPayment: v })} color={edColor} danger={["UnPaid"]} />
            <PickField
              label={ed.side === "officeIn" ? "Kis cheez ki aavak" : "Kis cheez ka kharch"}
              options={opts}
              value={edValue}
              onChange={(o) =>
                setRow(
                  o
                    ? {
                        _id: o._id,
                        expenseName: o.expenseName,
                        categoryName: o.categoryName,
                        isVendor: o.isVendor,
                        fullname: o.isVendor || o.categoryName === "Pending" ? ed.row.fullname || o.expenseName : isStaffCat(o.categoryName) ? "" : ed.row.fullname,
                        fullname_id: "",
                      }
                    : { _id: "", expenseName: "", categoryName: "", isVendor: false }
                )
              }
              getLabel={(o) => o?.expenseName || ""}
              groupBy={(o) => (o.isVendor ? "Vendor" : o.categoryName || "")}
            />
            {staffName ? (
              <PickField
                label="Kis staff ka"
                options={lists.staff}
                value={lists.staff.find((s) => s._id === ed.row.fullname_id) || (ed.row.fullname ? { _id: ed.row.fullname_id, fullname: ed.row.fullname } : null)}
                onChange={(s) => setRow({ fullname: s?.fullname || "", fullname_id: s?._id || "" })}
                getLabel={(o) => o?.fullname || ""}
              />
            ) : (
              <TextField label="Naam (kisne diya / kisko diya)" value={ed.row.fullname || ""} onChange={(e) => setRow({ fullname: e.target.value })} fullWidth />
            )}
            <TextField label="Remark (optional)" value={ed.row.remark || ""} onChange={(e) => setRow({ remark: e.target.value })} fullWidth />
          </Stack>
        )}
      </EditorDialog>

      <ConfirmDialog
        open={confirm}
        color={Q.office}
        title={submitted ? `${date} ki office entry update karein?` : `${date} ki office entry submit karein?`}
        confirmText={submitted ? "Haan, update karo" : "Haan, submit karo"}
        lines={[
          { label: "Aavak (In)", value: `${draft.officeIn.filter(rowValid).length} · ${inr(t.in)}` },
          { label: "Javak (Out)", value: `${draft.officeOut.filter(rowValid).length} · ${inr(t.out)}` },
          { label: "Bacha", value: inr(t.in - t.out), color: Q.ink },
        ]}
        onCancel={() => setConfirm(false)}
        onConfirm={submit}
      />
    </Box>
  );
};

export default OfficeQuickEntry;
