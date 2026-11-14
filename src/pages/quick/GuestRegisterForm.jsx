// Govt / police register ke liye guest details (sab OPTIONAL). Room dene ke liye zaroori nahi.
// Alag collection mein save hota hai, purani GH entry ko nahi chhoota.
import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import toast from "react-hot-toast";
import Grid from "@mui/material/Grid2";
import { Alert, Box, Button, Chip, Collapse, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CollectionsIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import { API, Q } from "./shared";

const MAX_PHOTOS = 10;

dayjs.extend(customParseFormat);

export const DOC_TYPES = ["Aadhar Card", "Passport", "Driving License", "Voter ID", "PAN Card", "Other"];
export const VEHICLES = ["None", "Two Wheeler", "Four Wheeler", "Other"];
export const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
const newGid = () => `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const emptyGuest = () => ({ gid: newGid(), fullName: "", mobile: "", dob: "", documentType: "Aadhar Card", documentNumber: "", documentImages: [] });

// Aadhaar check digit (Verhoeff) — catches most mistyped / misread digits
const VD = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const VP = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
const aadhaarOk = (num) => {
  const x = String(num || "").replace(/\s/g, "");
  if (!/^[2-9]\d{11}$/.test(x)) return false;
  let c = 0;
  [...x].reverse().forEach((d, i) => (c = VD[c][VP[i % 8][Number(d)]]));
  return c === 0;
};
// helper text for a document number field
const docHint = (type, num) => {
  if (type !== "Aadhar Card" || !num) return "";
  const d = String(num).replace(/\s/g, "");
  if (!/^\d{12}$/.test(d)) return /x/i.test(d) ? "Masked Aadhaar — the full 12-digit number is needed for Pathik" : "Aadhaar has 12 digits";
  return aadhaarOk(d) ? "" : "This Aadhaar number is not valid — one digit is probably wrong";
};

// Scan an ID: take / choose 1-3 photos (e.g. Aadhaar front + back), then the AI reads them
const ScanBox = ({ label, busy, onRead, compact }) => {
  const [photos, setPhotos] = useState([]);
  const add = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - photos.length);
    e.target.value = "";
    const urls = [];
    for (const f of files) {
      try {
        urls.push(await shrink(f, 1800, 0.8));
      } catch {
        toast.error("Could not read a photo");
      }
    }
    setPhotos((p) => [...p, ...urls].slice(0, 3));
  };
  const read = async () => {
    const ok = await onRead(photos);
    if (ok) setPhotos([]);
  };
  return (
    <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, bgcolor: "#F8FAFC", ...(compact ? {} : { mb: 1.5 }) }}>
      <Typography fontWeight={700} variant="body2" sx={{ mb: 0.75 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        {photos.map((ph, i) => (
          <Box key={i} sx={{ position: "relative" }}>
            <img src={ph} alt="ID" style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 6, border: "1px solid #CBD5E1" }} />
            <Chip size="small" label="✕" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} sx={{ position: "absolute", top: -8, right: -8, bgcolor: "#fff", height: 20 }} />
          </Box>
        ))}
        {photos.length < 3 && (
          <>
            <Button size="small" variant="outlined" component="label" startIcon={<PhotoCameraIcon />} disabled={busy}>
              {photos.length ? "Back side / next" : "Take ID photo"}
              <input hidden type="file" accept="image/*" capture="environment" onChange={add} />
            </Button>
            <Button size="small" variant="outlined" component="label" startIcon={<CollectionsIcon />} disabled={busy}>
              Gallery
              <input hidden type="file" accept="image/*" multiple onChange={add} />
            </Button>
          </>
        )}
        {photos.length > 0 && (
          <Button size="small" variant="contained" onClick={read} disabled={busy} sx={{ fontWeight: 800 }}>
            {busy ? "Reading…" : `Read ID (${photos.length} photo${photos.length > 1 ? "s" : ""})`}
          </Button>
        )}
      </Stack>
      {!photos.length && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
          Aadhaar: take the front and the back (the address is on the back). Passport / licence / voter ID also work.
        </Typography>
      )}
    </Paper>
  );
};

// "08:00 PM" → "20:00"
const to24 = (t) => {
  const d = dayjs(String(t || ""), ["hh:mm A", "h:mm A", "HH:mm"], true);
  return d.isValid() ? d.format("HH:mm") : "";
};

// Photo ko chhota karo (max 1400px, JPEG) taaki server pe kam jagah le
const shrink = (file, max = 1400, q = 0.72) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", q));
    };
    img.onerror = () => reject(new Error("Could not read photo"));
    img.src = url;
  });

const seedFrom = (date, seed) => {
  const parts = String(seed?.fullname || "").trim().split(/\s+/).filter(Boolean);
  const d = dayjs(date, "DD-MM-YYYY");
  return {
    firstName: parts[0] || "",
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
    mobile: seed?.mobileNumber && String(seed.mobileNumber) !== "0" ? String(seed.mobileNumber) : "",
    phone: seed?.mobileNumber && String(seed.mobileNumber) !== "0" ? String(seed.mobileNumber) : "",
    country: "India",
    adults: Number(seed?.noOfPeople) || 1,
    children: 0,
    checkinDate: d.isValid() ? d.format("YYYY-MM-DD") : "",
    checkinTime: to24(seed?.checkInTime),
    checkoutDate: d.isValid() ? d.add(1, "day").format("YYYY-MM-DD") : "",
    checkoutTime: to24(seed?.checkOutTime),
    documentType: "Aadhar Card",
    vehicleType: "None",
    otherGuests: [],
    documentImages: [],
  };
};

const GuestRegisterForm = ({ date, period, roomNo, seed, isAdmin, onSaved, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [g, setG] = useState(null);
  const [exists, setExists] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");
  const [thumbs, setThumbs] = useState({});
  const [reading, setReading] = useState(""); // "main" | gid | "new" while the AI reads
  const [aiNote, setAiNote] = useState(null); // { unsure: Set of fields, warnings: [] } from the last main-guest read
  const base = `${API}/guest-register/one/${date}/${period}/${roomNo}`;

  useEffect(() => {
    if (!open || g) return;
    axios
      .get(base)
      .then(({ data }) => {
        if (data.data) {
          setG({ ...seedFrom(date, seed), ...data.data, otherGuests: (data.data.otherGuests || []).map((o) => ({ ...o, gid: o.gid || newGid(), documentImages: o.documentImages || [] })) });
          setExists(true);
        } else setG(seedFrom(date, seed));
      })
      .catch(() => setG(seedFrom(date, seed)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Admin ko photo dikhao
  useEffect(() => {
    const all = [...(g?.documentImages || []), ...(g?.otherGuests || []).flatMap((o) => o.documentImages || [])];
    if (!isAdmin || !all.length) return;
    all.forEach((name) => {
      if (thumbs[name]) return;
      axios
        .get(`${API}/guest-register/photo/${name}`, { responseType: "blob" })
        .then(({ data }) => setThumbs((t) => ({ ...t, [name]: URL.createObjectURL(data) })))
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g?.documentImages, g?.otherGuests, isAdmin]);

  const set = (k, v) => setG((p) => ({ ...p, [k]: v }));
  const setOther = (i, k, v) => setG((p) => ({ ...p, otherGuests: p.otherGuests.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));

  // photo upload (main guest when no gid) — keeps every person's saved photo list in step with the server
  const upload = async (image, gid) => {
    const { data } = await axios.post(`${base}/photo`, gid ? { image, gid } : { image });
    const d = data.data;
    setG((p) => ({
      ...p,
      documentImages: d.documentImages,
      otherGuests: p.otherGuests.map((o) => ({ ...o, documentImages: d.otherGuests?.find((y) => y.gid === o.gid)?.documentImages || o.documentImages || [] })),
    }));
    setExists(true);
  };
  const readId = async (photos) => {
    const { data } = await axios.post(`${API}/guest-register/read-id`, { photos, date, period, roomNo }, { timeout: 180000 });
    return data.data;
  };
  const aiError = (e) => (e?.response?.data?.code === "NO_AI" ? "AI reader is not set up — please fill the details by hand" : e?.response?.data?.message || "Could not read the ID");
  // main guest: fill the form, save the ID photos with the room
  const scanMain = async (photos) => {
    setReading("main");
    try {
      const a = await readId(photos);
      if (!a.isId) {
        toast.error("This does not look like an ID — try a clearer photo");
        return false;
      }
      const keys = ["firstName", "middleName", "lastName", "dob", "houseNo", "address", "locality", "city", "district", "state", "zipCode", "country", "documentType", "documentNumber"];
      setG((p) => ({ ...p, ...Object.fromEntries(keys.filter((k) => a[k]).map((k) => [k, a[k]])) }));
      setAiNote({ unsure: new Set(a.unsure), warnings: a.warnings });
      let saved = 0;
      for (const ph of photos) {
        try {
          await upload(ph);
          saved++;
        } catch (e) {
          toast.error(`ID photo not saved: ${e?.response?.data?.message || e.message}`);
        }
      }
      toast.success(`ID read${saved ? ` and ${saved} photo${saved > 1 ? "s" : ""} saved` : ""} — add the mobile number, check the fields marked ⚠, then Save`);
      return true;
    } catch (e) {
      toast.error(aiError(e));
      return false;
    } finally {
      setReading("");
    }
  };
  // accompanying guest: new row (or fill row i), photos saved with that person
  const scanOther = async (photos, i = -1) => {
    const gid = i >= 0 ? g.otherGuests[i].gid : newGid();
    setReading(i >= 0 ? gid : "new");
    try {
      const a = await readId(photos);
      if (!a.isId) {
        toast.error("This does not look like an ID — try a clearer photo");
        return false;
      }
      const filled = { fullName: [a.firstName, a.middleName, a.lastName].filter(Boolean).join(" "), dob: a.dob, documentType: a.documentType, documentNumber: a.documentNumber, aiWarnings: a.warnings, aiUnsure: a.unsure };
      setG((p) => {
        const others = i >= 0 ? p.otherGuests.map((o, j) => (j === i ? { ...o, ...Object.fromEntries(Object.entries(filled).filter(([, v]) => v !== "" && v != null)) } : o)) : [...p.otherGuests, { ...emptyGuest(), gid, ...filled }];
        return { ...p, otherGuests: others, adults: Math.max(Number(p.adults) || 1, 1 + others.length) };
      });
      for (const ph of photos) {
        try {
          await upload(ph, gid);
        } catch (e) {
          toast.error(`ID photo not saved: ${e?.response?.data?.message || e.message}`);
        }
      }
      toast.success(`${filled.fullName || "Guest"} added — check the details, then Save`);
      return true;
    } catch (e) {
      toast.error(aiError(e));
      return false;
    } finally {
      setReading("");
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await axios.put(base, g);
      setG((p) => ({ ...p, ...data.data }));
      setExists(true);
      onSaved?.();
      toast.success("Guest registration details saved");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };

  // Ek saath kai photo (gallery se) ya camera se ek-ek — sab ek ke baad ek upload
  const addPhoto = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const room = MAX_PHOTOS - (g?.documentImages?.length || 0);
    if (files.length > room) toast.error(`Only ${room} more photo${room === 1 ? "" : "s"} allowed (max ${MAX_PHOTOS}). Extra photos skipped.`);
    const list = files.slice(0, Math.max(0, room));
    if (!list.length) return;
    setBusy(true);
    let ok = 0;
    for (let i = 0; i < list.length; i++) {
      setUploading(`${i + 1} / ${list.length}`);
      try {
        const image = await shrink(list[i]);
        const { data } = await axios.post(`${base}/photo`, { image });
        setG((p) => ({ ...p, documentImages: data.data.documentImages }));
        ok++;
      } catch (err) {
        toast.error(`Photo ${i + 1}: ${err?.response?.data?.message || err.message || "could not save"}`);
      }
    }
    setUploading("");
    setBusy(false);
    if (ok) {
      setExists(true);
      onSaved?.();
      toast.success(`${ok} photo${ok === 1 ? "" : "s"} saved`);
    }
  };

  const removePhoto = async (name) => {
    if (!window.confirm("Remove this photo?")) return;
    try {
      const { data } = await axios.delete(`${base}/photo/${name}`);
      setG((p) => ({ ...p, documentImages: data.data?.documentImages || [] }));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not remove photo");
    }
  };

  const flag = (k) => aiNote?.unsure?.has(k);
  const T = (label, k, props = {}) => (
    <Grid size={{ xs: 12, sm: 6 }}>
      <TextField
        label={flag(k) ? `⚠ ${label}` : label}
        value={g?.[k] ?? ""}
        onChange={(e) => {
          set(k, e.target.value);
          if (flag(k)) setAiNote((n) => ({ ...n, unsure: new Set([...n.unsure].filter((x) => x !== k)) }));
        }}
        fullWidth
        size="small"
        color={flag(k) ? "warning" : undefined}
        focused={flag(k) || undefined}
        {...(k === "documentNumber" && docHint(g?.documentType, g?.documentNumber) ? { error: true, helperText: docHint(g?.documentType, g?.documentNumber) } : flag(k) ? { helperText: "Hard to read on the ID — please check" } : {})}
        {...props}
      />
    </Grid>
  );
  const S = (label, k, options) => (
    <Grid size={{ xs: 12, sm: 6 }}>
      <TextField select label={label} value={g?.[k] ?? ""} onChange={(e) => set(k, e.target.value)} fullWidth size="small">
        <MenuItem value="">—</MenuItem>
        {options.map((o) => (
          <MenuItem key={o} value={o}>
            {o}
          </MenuItem>
        ))}
      </TextField>
    </Grid>
  );

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, borderStyle: "dashed" }}>
      <Button fullWidth onClick={() => setOpen((o) => !o)} endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />} sx={{ justifyContent: "space-between", color: Q.ink, py: 1.2 }}>
        <span>
          📄 Guest registration (Govt / Police) <Typography component="span" variant="caption" color={Q.muted}>(required before next day&apos;s settlement)</Typography>
        </span>
        {exists && <Chip size="small" color="success" label="Filled" sx={{ ml: "auto", mr: 1 }} />}
      </Button>
      <Collapse in={open} unmountOnExit>
        {!g ? (
          <Typography sx={{ p: 2 }} color={Q.muted}>
            Loading…
          </Typography>
        ) : (
          <Box sx={{ p: 1.5, pt: 0 }}>
            <Alert severity="info" sx={{ mb: 1.5 }}>
              Not needed to give the room, but must be completed by the next day&apos;s settlement. Required: first name, mobile, address, city, state, document type and number. This data goes into the CSV for the government site.
            </Alert>
            <ScanBox label="📷 Scan the main guest's ID — fills the form" busy={!!reading || busy} onRead={scanMain} />
            {aiNote?.warnings?.length > 0 && (
              <Alert severity="warning" sx={{ mb: 1.5 }} onClose={() => setAiNote((n) => ({ ...n, warnings: [] }))}>
                {aiNote.warnings.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </Alert>
            )}
            <Grid container spacing={1.25}>
              {T("First name", "firstName")}
              {T("Middle name", "middleName")}
              {T("Last name", "lastName")}
              {T("Company name", "companyName")}
              {T("House / Flat no.", "houseNo")}
              {T("Address", "address", { multiline: true, minRows: 2 })}
              {T("Locality", "locality")}
              {T("Country", "country")}
              {S("State", "state", STATES)}
              {T("District", "district")}
              {T("City", "city")}
              {T("Zip code", "zipCode", { inputProps: { inputMode: "numeric" } })}
              {T("Date of birth", "dob", { type: "date", InputLabelProps: { shrink: true } })}
              {T("Mobile no.", "mobile", { inputProps: { inputMode: "numeric" } })}
              {T("Phone no.", "phone", { inputProps: { inputMode: "numeric" } })}
              {T("Email", "email", { type: "email" })}
              {T("Coming from", "comingFrom")}
              {T("Going to", "goingTo")}
              {S("Document type", "documentType", DOC_TYPES)}
              {T("Document number", "documentNumber")}
              {T("Check-in date", "checkinDate", { type: "date", InputLabelProps: { shrink: true } })}
              {T("Check-in time", "checkinTime", { type: "time", InputLabelProps: { shrink: true } })}
              {T("Check-out date", "checkoutDate", { type: "date", InputLabelProps: { shrink: true } })}
              {T("Check-out time", "checkoutTime", { type: "time", InputLabelProps: { shrink: true } })}
              {T("No. of adults", "adults", { type: "number" })}
              {T("No. of children", "children", { type: "number" })}
              {S("Vehicle type", "vehicleType", VEHICLES)}
              {T("Vehicle no.", "vehicleNo", { placeholder: "GJ01KP1788" })}
            </Grid>

            <Typography fontWeight={700} sx={{ mt: 2, mb: 1 }}>
              Accompanying guests
            </Typography>
            <Stack spacing={1}>
              {(g.otherGuests || []).map((o, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField size="small" fullWidth label="Full name" value={o.fullName} onChange={(e) => setOther(i, "fullName", e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField size="small" fullWidth label="Mobile" value={o.mobile} onChange={(e) => setOther(i, "mobile", e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 5 }}>
                      <TextField select size="small" fullWidth label="Document" value={o.documentType} onChange={(e) => setOther(i, "documentType", e.target.value)}>
                        {DOC_TYPES.map((d) => (
                          <MenuItem key={d} value={d}>
                            {d}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 5, sm: 6 }}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Document no."
                        value={o.documentNumber}
                        onChange={(e) => setOther(i, "documentNumber", e.target.value)}
                        error={!!docHint(o.documentType, o.documentNumber)}
                        helperText={docHint(o.documentType, o.documentNumber) || (o.aiUnsure?.includes("documentNumber") ? "⚠ Hard to read — please check" : "")}
                      />
                    </Grid>
                    <Grid size={{ xs: 1 }}>
                      <IconButton aria-label="Remove" onClick={() => set("otherGuests", g.otherGuests.filter((_, j) => j !== i))}>
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      {o.aiWarnings?.length > 0 && (
                        <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
                          {o.aiWarnings.map((w) => (
                            <div key={w}>{w}</div>
                          ))}
                        </Alert>
                      )}
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        {(o.documentImages || []).map((name) =>
                          isAdmin && thumbs[name] ? (
                            <a key={name} href={thumbs[name]} target="_blank" rel="noopener noreferrer">
                              <img src={thumbs[name]} alt="ID" style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 6, border: "1px solid #E5E7EB" }} />
                            </a>
                          ) : null
                        )}
                        {(o.documentImages || []).length > 0 && !isAdmin && <Chip size="small" color="success" variant="outlined" label={`✓ ${o.documentImages.length} ID photo${o.documentImages.length > 1 ? "s" : ""} saved`} />}
                      </Stack>
                      {!(o.documentImages || []).length && <ScanBox compact label="📷 Scan this guest's ID" busy={!!reading || busy} onRead={(ph) => scanOther(ph, i)} />}
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              <ScanBox compact label="📷 Add a guest by scanning their ID" busy={!!reading || busy} onRead={(ph) => scanOther(ph)} />
              <Button size="small" onClick={() => set("otherGuests", [...(g.otherGuests || []), emptyGuest()])} sx={{ alignSelf: "flex-start" }}>
                + Add accompanying guest (type by hand)
              </Button>
            </Stack>

            <Typography fontWeight={700} sx={{ mt: 2, mb: 1 }}>
              Main guest / room document photos ({g.documentImages?.length || 0} / {MAX_PHOTOS})
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {(g.documentImages || []).map((name) => (
                <Box key={name} sx={{ position: "relative" }}>
                  {isAdmin && thumbs[name] ? (
                    <a href={thumbs[name]} target="_blank" rel="noopener noreferrer">
                      <img src={thumbs[name]} alt="document" style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #E5E7EB" }} />
                    </a>
                  ) : (
                    <Chip label="✓ Photo saved" color="success" variant="outlined" />
                  )}
                  {isAdmin && (
                    <IconButton size="small" onClick={() => removePhoto(name)} sx={{ position: "absolute", top: -8, right: -8, bgcolor: "#fff", border: "1px solid #E5E7EB" }} aria-label="Remove photo">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
              {(g.documentImages?.length || 0) < MAX_PHOTOS && (
                <>
                  <Button variant="outlined" component="label" startIcon={<PhotoCameraIcon />} disabled={busy}>
                    Take photo
                    <input hidden type="file" accept="image/*" capture="environment" onChange={addPhoto} />
                  </Button>
                  <Button variant="outlined" component="label" startIcon={<CollectionsIcon />} disabled={busy}>
                    Choose photos (multiple)
                    <input hidden type="file" accept="image/*" multiple onChange={addPhoto} />
                  </Button>
                </>
              )}
              {uploading && <Chip color="info" label={`Uploading ${uploading}…`} />}
            </Stack>

            <Button fullWidth variant="contained" onClick={save} disabled={busy} sx={{ mt: 2, bgcolor: Q.ink, "&:hover": { bgcolor: Q.ink } }}>
              {busy ? "Saving…" : "Save registration details"}
            </Button>
          </Box>
        )}
      </Collapse>
    </Paper>
  );
};

export default GuestRegisterForm;
