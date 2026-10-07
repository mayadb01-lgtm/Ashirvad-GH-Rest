// 🎉 Banquet setup (sirf owner): menu items ka rate + per person gram, packages (menu plan) ka cost/plate, extras, hall
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Checkbox, IconButton, MenuItem, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";
import toast from "react-hot-toast";
import { API, COLORS, PageTitle, Section, inr } from "./shared";

const n = (v) => Number(v) || 0;
const MEALS = ["Breakfast", "Lunch", "Hi-Tea", "Dinner", "Full day"];

const BanquetSetupDashboard = () => {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("packages");
  const [edit, setEdit] = useState({}); // id → changed row
  const [pkg, setPkg] = useState(null); // package editor
  const [q, setQ] = useState("");

  const load = () =>
    axios
      .get(`${API}/banquet/setup`)
      .then(({ data: r }) => setData(r.data))
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load"));
  useEffect(() => {
    load();
  }, []);

  const save = async (kind, row, quiet) => {
    try {
      await axios.post(`${API}/banquet/master/${kind}`, row);
      if (!quiet) toast.success("Saved");
      setEdit((e) => {
        const c = { ...e };
        delete c[row._id || "new"];
        return c;
      });
      load();
      return true;
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not save");
      return false;
    }
  };

  const itemById = useMemo(() => Object.fromEntries((data?.items || []).map((x) => [String(x._id), x])), [data]);
  // Sheet rate / plate: fix items + har hisse ke "pick" item (sabse sasta → min, sabse mehnga → max)
  const pkgRange = (p) => {
    let min = 0, max = 0, grams = 0;
    (p?.items || []).forEach((x) => {
      const v = (n(itemById[x.itemId]?.pricePerKg) * n(x.grams)) / 1000;
      min += v; max += v; grams += n(x.grams);
    });
    (p?.sections || []).forEach((sec) => {
      const pr = (sec.options || []).map((o) => n(itemById[o.itemId]?.pricePerKg)).sort((a, b) => a - b);
      const k = Math.min(n(sec.pick) || 1, pr.length);
      min += (pr.slice(0, k).reduce((t, v) => t + v, 0) * n(sec.grams)) / 1000;
      max += (pr.slice(-k).reduce((t, v) => t + v, 0) * n(sec.grams)) / 1000;
      grams += k * n(sec.grams);
    });
    return { min, max, grams };
  };
  const pkgCost = (p) => pkgRange(p).max;
  const pkgGrams = (p) => pkgRange(p).grams;
  const rangeText = (p) => {
    const r = pkgRange(p);
    return Math.round(r.min) === Math.round(r.max) ? inr(r.max) : `${inr(r.min)} – ${inr(r.max)}`;
  };

  if (!data) return <Typography sx={{ p: 4 }}>Loading…</Typography>;
  if (!data.isOwner) return <Alert severity="warning">Only the owner can see this page.</Alert>;

  const cats = [...new Set(data.items.map((x) => x.category))];
  const field = (kind, row, key, props = {}) => {
    const id = row._id || "new";
    const cur = edit[id] || row;
    return (
      <TextField
        size="small"
        value={cur[key] ?? ""}
        onChange={(e) => setEdit((s) => ({ ...s, [id]: { ...cur, [key]: props.type === "number" ? e.target.value : e.target.value } }))}
        {...props}
      />
    );
  };
  const rowSave = (kind, row) => {
    const id = row._id || "new";
    return (
      <Button size="small" variant="contained" disabled={!edit[id]} onClick={() => save(kind, edit[id])}>
        Save
      </Button>
    );
  };
  const activeBox = (kind, row) => (
    <Checkbox checked={row.active !== false} onChange={(e) => save(kind, { ...row, active: e.target.checked }, true)} title="Active (shown to staff)" />
  );

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <PageTitle title="Banquet setup" sub="Owner only. Item rates and grams per person stay here; staff see only package names and rate per plate." />
      <Tabs value={tab} onChange={(e, v) => (setTab(v), setEdit({}), setPkg(null))} sx={{ mb: 2 }}>
        <Tab value="packages" label={`Packages (${data.packages.length})`} />
        <Tab value="items" label={`Menu items (${data.items.length})`} />
        <Tab value="addons" label={`Extras (${data.addons.length})`} />
        <Tab value="halls" label={`Halls (${data.halls.length})`} />
      </Tabs>

      {tab === "packages" && (
        <Section
          title="Packages (menu plans with choices)"
          right={
            <Button variant="contained" onClick={() => setPkg({ name: "", meal: "Lunch", items: [], sections: [], pricePerPlate: 0, minPlates: 50, description: "", active: true })}>
              + New package
            </Button>
          }
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Package", "Meal", "Choices (customer picks)", "gm / person", "Sheet rate / plate", "Final rate / plate", "Active", ""].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 800 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.packages.map((p) => (
                <TableRow key={p._id} hover sx={{ opacity: p.active === false ? 0.45 : 1 }}>
                  <TableCell sx={{ fontWeight: 700 }}>{p.name}</TableCell>
                  <TableCell>{p.meal}</TableCell>
                  <TableCell sx={{ maxWidth: 420 }}>
                    <Typography variant="caption">
                      {(p.sections || []).length
                        ? p.sections.map((sec) => `${sec.label}: ${sec.pick} of ${sec.options.length} (${sec.grams}g)`).join(" · ")
                        : (p.items || []).map((x) => `${x.name} ${x.grams}g`).join(", ")}
                    </Typography>
                  </TableCell>
                  <TableCell>{pkgGrams(p)}</TableCell>
                  <TableCell>{rangeText(p)}</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>{inr(p.pricePerPlate)}</TableCell>
                  <TableCell>{activeBox("package", p)}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => setPkg({ sections: [], ...JSON.parse(JSON.stringify(p)) })}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography variant="caption" color="text.secondary">
            Untick Active to hide a package from staff (old packages stay in old bookings).
          </Typography>

          {pkg && (
            <Box sx={{ mt: 2, p: 2, border: "2px solid #FBCFE8", borderRadius: 2, bgcolor: "#FDF2F8" }}>
              <Typography fontWeight={800} sx={{ mb: 1 }}>
                {pkg._id ? `Edit: ${pkg.name}` : "New package"}
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1.5 }}>
                <TextField size="small" label="Name" value={pkg.name} onChange={(e) => setPkg({ ...pkg, name: e.target.value })} />
                <TextField size="small" select label="Meal" value={pkg.meal} onChange={(e) => setPkg({ ...pkg, meal: e.target.value })} sx={{ minWidth: 140 }}>
                  {MEALS.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField size="small" label="Final rate / plate" type="number" value={pkg.pricePerPlate} onChange={(e) => setPkg({ ...pkg, pricePerPlate: e.target.value })} />
                <TextField size="small" label="Min plates" type="number" value={pkg.minPlates} onChange={(e) => setPkg({ ...pkg, minPlates: e.target.value })} />
                <TextField size="small" label="Description" value={pkg.description} onChange={(e) => setPkg({ ...pkg, description: e.target.value })} sx={{ flex: 1 }} />
              </Stack>

              {(pkg.sections || []).map((sec, si) => {
                const upd = (patch) => setPkg({ ...pkg, sections: pkg.sections.map((x, j) => (j === si ? { ...x, ...patch } : x)) });
                return (
                  <Box key={si} sx={{ p: 1.25, mb: 1, bgcolor: "#fff", borderRadius: 2, border: "1px solid #F9A8D4" }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <TextField size="small" label="Section (e.g. Starter)" value={sec.label} onChange={(e) => upd({ label: e.target.value })} />
                      <TextField size="small" label="Customer picks" type="number" value={sec.pick} onChange={(e) => upd({ pick: e.target.value })} sx={{ width: 120 }} />
                      <TextField size="small" label="gm / person (each)" type="number" value={sec.grams} onChange={(e) => upd({ grams: e.target.value })} sx={{ width: 140 }} />
                      <Box sx={{ flex: 1 }} />
                      <IconButton size="small" onClick={() => setPkg({ ...pkg, sections: pkg.sections.filter((_, j) => j !== si) })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                    <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.75} sx={{ mt: 1 }} alignItems="center">
                      {(sec.options || []).map((o) => (
                        <Box key={o.itemId} sx={{ px: 1, py: 0.25, borderRadius: 5, bgcolor: "#FCE7F3", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                          {o.name} · {inr(itemById[o.itemId]?.pricePerKg)}
                          <IconButton size="small" onClick={() => upd({ options: sec.options.filter((y) => y.itemId !== o.itemId) })} sx={{ p: 0.25 }}>
                            <DeleteIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      ))}
                      <TextField
                        size="small"
                        select
                        label="Add option"
                        value=""
                        onChange={(e) => {
                          const it = itemById[e.target.value];
                          if (it && !(sec.options || []).some((y) => y.itemId === String(it._id))) upd({ options: [...(sec.options || []), { itemId: String(it._id), name: it.name, category: it.category }] });
                        }}
                        sx={{ minWidth: 200 }}
                      >
                        {cats.map((c) => [
                          <MenuItem key={`h-${c}`} disabled sx={{ fontWeight: 800, opacity: "1 !important" }}>
                            {c}
                          </MenuItem>,
                          ...data.items
                            .filter((x) => x.category === c && x.active !== false)
                            .map((x) => (
                              <MenuItem key={x._id} value={x._id} sx={{ pl: 3 }}>
                                {x.name} · {inr(x.pricePerKg)}/{x.unit}
                              </MenuItem>
                            )),
                        ])}
                      </TextField>
                    </Stack>
                  </Box>
                );
              })}
              <Button onClick={() => setPkg({ ...pkg, sections: [...(pkg.sections || []), { label: "", pick: 1, grams: 100, options: [] }] })}>+ Add section</Button>
              {(pkg.items || []).length > 0 && (
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                  Fixed items (old style): {pkg.items.map((x) => `${x.name} ${x.grams}g`).join(", ")}
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography sx={{ flex: 1 }} fontWeight={700}>
                  Sheet rate {rangeText(pkg)} / plate · {pkgGrams(pkg)} g per person · Final rate {inr(pkg.pricePerPlate)}
                </Typography>
                <Button onClick={() => setPkg({ ...pkg, pricePerPlate: Math.round(pkgRange(pkg).max) })}>Use highest sheet rate</Button>
                <Button onClick={() => setPkg(null)}>Close</Button>
                <Button variant="contained" disabled={!pkg.name.trim()} onClick={async () => (await save("package", pkg)) && setPkg(null)}>
                  Save package
                </Button>
              </Stack>
            </Box>
          )}
        </Section>
      )}

      {tab === "items" && (
        <Section
          title="Menu items (rate per kg / litre, grams per person)"
          right={
            <Stack direction="row" spacing={1}>
              <TextField size="small" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
              <Button variant="contained" onClick={() => setEdit((s) => ({ ...s, new: { name: "", category: cats[0] || "Other", unit: "kg", pricePerKg: 0, defaultGrams: 100, active: true } }))}>
                + New item
              </Button>
            </Stack>
          }
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Item", "Category", "Unit", "Rate / kg·litre", "Default gm / person", "Active", ""].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 800 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[...(edit.new ? [edit.new] : []), ...data.items.filter((x) => !q.trim() || `${x.name} ${x.category}`.toLowerCase().includes(q.trim().toLowerCase()))].map((x) => (
                <TableRow key={x._id || "new"} sx={{ opacity: x.active === false ? 0.5 : 1 }}>
                  <TableCell>{field("item", x, "name")}</TableCell>
                  <TableCell>{field("item", x, "category")}</TableCell>
                  <TableCell>
                    {field("item", x, "unit", { select: true, children: ["kg", "litre", "pc"].map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>), sx: { width: 90 } })}
                  </TableCell>
                  <TableCell>{field("item", x, "pricePerKg", { type: "number", sx: { width: 110 } })}</TableCell>
                  <TableCell>{field("item", x, "defaultGrams", { type: "number", sx: { width: 110 } })}</TableCell>
                  <TableCell>{x._id ? activeBox("item", x) : null}</TableCell>
                  <TableCell>{rowSave("item", x)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography variant="caption" color="text.secondary">
            Rate per kg is the selling rate from the quotation sheet. Changing it updates the sheet rate of packages. Rates already given to customers in bookings do not change.
          </Typography>
        </Section>
      )}

      {tab === "addons" && (
        <Section title="Extras (stage, decoration, sound…)" right={<Button variant="contained" onClick={() => setEdit((s) => ({ ...s, new: { name: "", price: 0, unit: "fixed", active: true } }))}>+ New extra</Button>}>
          <Table size="small">
            <TableBody>
              {[...(edit.new && tab === "addons" ? [edit.new] : []), ...data.addons].map((x) => (
                <TableRow key={x._id || "new"} sx={{ opacity: x.active === false ? 0.5 : 1 }}>
                  <TableCell>{field("addon", x, "name", { sx: { minWidth: 240 } })}</TableCell>
                  <TableCell>{field("addon", x, "price", { type: "number", label: "Price", sx: { width: 120 } })}</TableCell>
                  <TableCell>
                    {field("addon", x, "unit", {
                      select: true,
                      label: "Per",
                      sx: { width: 120 },
                      children: [["fixed", "Fixed"], ["hour", "Per hour"], ["day", "Per day"], ["plate", "Per plate"]].map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>),
                    })}
                  </TableCell>
                  <TableCell>{x._id ? activeBox("addon", x) : null}</TableCell>
                  <TableCell>{rowSave("addon", x)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {tab === "halls" && (
        <Section title="Halls / venues" right={<Button variant="contained" onClick={() => setEdit((s) => ({ ...s, new: { name: "", rentPerHour: 0, rentPerDay: 0, minHours: 0, capacity: 0, active: true } }))}>+ New hall</Button>}>
          <Table size="small">
            <TableBody>
              {[...(edit.new && tab === "halls" ? [edit.new] : []), ...data.halls].map((x) => (
                <TableRow key={x._id || "new"} sx={{ opacity: x.active === false ? 0.5 : 1 }}>
                  <TableCell>{field("hall", x, "name", { sx: { minWidth: 220 } })}</TableCell>
                  <TableCell>{field("hall", x, "rentPerHour", { type: "number", label: "Rent / hour", sx: { width: 120 } })}</TableCell>
                  <TableCell>{field("hall", x, "minHours", { type: "number", label: "Min hours", sx: { width: 100 } })}</TableCell>
                  <TableCell>{field("hall", x, "rentPerDay", { type: "number", label: "Rent / day", sx: { width: 120 } })}</TableCell>
                  <TableCell>{field("hall", x, "capacity", { type: "number", label: "Capacity", sx: { width: 100 } })}</TableCell>
                  <TableCell>{x._id ? activeBox("hall", x) : null}</TableCell>
                  <TableCell>{rowSave("hall", x)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}
    </Box>
  );
};

export default BanquetSetupDashboard;
