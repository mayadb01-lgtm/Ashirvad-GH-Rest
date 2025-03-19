import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  styled,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SummaryTable from "../components/SummaryTable";

export const SummaryGrid = ({ entries, columns, colors }) => (
  <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6, xl: 6 }}>
    <Box>
      <Stack direction="column" spacing={0.5} sx={{ padding: "4px" }}>
        {entries.map((entry, index) => (
          <SummaryTable
            key={index}
            title={entry.title}
            dayRows={entry.dayRows}
            nightRows={entry.nightRows}
            extraDayRows={entry.extraDayRows}
            extraNightRows={entry.extraNightRows}
            pendingJamaCash={entry.pendingJamaCash}
            pendingJamaCard={entry.pendingJamaCard}
            pendingJamaPPS={entry.pendingJamaPPS}
            pendingJamaPPC={entry.pendingJamaPPC}
            reservationCash={entry.reservationCash}
            reservationCard={entry.reservationCard}
            reservationPPS={entry.reservationPPS}
            reservationPPC={entry.reservationPPC}
            reservationUnPaid={entry.reservationUnPaid}
            columns={columns}
            color={colors[entry.colorKey]}
          />
        ))}
      </Stack>
    </Box>
  </Grid>
);

export const PaymentSummary = ({
  processedEntries,
  columns,
  paymentColors,
  modeRows,
  modeColumns,
}) => (
  <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
    <Grid size={{ xs: 12 }} display="flex">
      <SummaryGrid
        entries={[
          {
            title: "Cash Entries Summary",
            dayRows: processedEntries.cash.day,
            nightRows: processedEntries.cash.night,
            extraDayRows: processedEntries.cash.extraDay,
            extraNightRows: processedEntries.cash.extraNight,
            pendingJamaCash: processedEntries.cash.pendingJamaCash,
            reservationCash: processedEntries.cash.reservationCash,
            colorKey: "Cash",
          },
          {
            title: "Card Entries Summary",
            dayRows: processedEntries.card.day,
            nightRows: processedEntries.card.night,
            extraDayRows: processedEntries.card.extraDay,
            extraNightRows: processedEntries.card.extraNight,
            pendingJamaCard: processedEntries.card.pendingJamaCard,
            reservationCard: processedEntries.card.reservationCard,
            colorKey: "Card",
          },
        ]}
        columns={columns}
        colors={paymentColors}
      />
      <SummaryGrid
        entries={[
          {
            title: "PPS Entries Summary",
            dayRows: processedEntries.pps.day,
            nightRows: processedEntries.pps.night,
            extraDayRows: processedEntries.pps.extraDay,
            extraNightRows: processedEntries.pps.extraNight,
            pendingJamaPPS: processedEntries.pps.pendingJamaPPS,
            reservationPPS: processedEntries.pps.reservationPPS,
            colorKey: "PPS",
          },
          {
            title: "PPC Entries Summary",
            dayRows: processedEntries.ppc.day,
            nightRows: processedEntries.ppc.night,
            extraDayRows: processedEntries.ppc.extraDay,
            extraNightRows: processedEntries.ppc.extraNight,
            pendingJamaPPC: processedEntries.ppc.pendingJamaPPC,
            reservationPPC: processedEntries.ppc.reservationPPC,
            colorKey: "PPC",
          },
        ]}
        columns={columns}
        colors={paymentColors}
      />
    </Grid>

    <Grid size={{ xs: 12 }} display="flex">
      <SummaryGrid
        entries={[
          {
            title: "UnPaid Entries Summary",
            dayRows: processedEntries.unpaid.day,
            nightRows: processedEntries.unpaid.night,
            extraDayRows: processedEntries.unpaid.extraDay,
            extraNightRows: processedEntries.unpaid.extraNight,
            reservationUnPaid: processedEntries.unpaid.reservationUnPaid,
            colorKey: "UnPaid",
          },
        ]}
        columns={columns}
        colors={paymentColors}
      />
      <SummaryGrid
        entries={[
          {
            title: "Revenue Summary",
            dayRows: modeRows || [],
            nightRows: [],
            extraDayRows: [],
            extraNightRows: [],
            colorKey: "Summary",
          },
        ]}
        columns={modeColumns}
        colors={paymentColors}
      />
    </Grid>
  </Grid>
);

const accordionStyles = {
  borderBottom: "1px solid #e0e0e0",
  minHeight: "0",
  height: "40px",
  boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
};

const titleStyles = {
  fontWeight: 500,
  fontSize: "14px",
};

export const AccordionSection = ({ bgColor, title, subtitle, children }) => (
  <Accordion>
    <AccordionSummary
      expandIcon={<ExpandMoreIcon />}
      style={{ ...accordionStyles, backgroundColor: bgColor }}
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        flex={1}
        justifyContent="space-between"
      >
        <Typography variant="h6" sx={titleStyles}>
          {title}
        </Typography>
        <Typography variant="h6" sx={titleStyles}>
          {subtitle}
        </Typography>
      </Stack>
    </AccordionSummary>
    <AccordionDetails style={{ margin: 0, padding: 0 }}>
      {children}
    </AccordionDetails>
  </Accordion>
);

// Loader
const GradientSpinner = styled("div")({
  width: "80px",
  height: "80px",
  border: "8px solid",
  borderColor: "rgba(255, 255, 255, 0.3) transparent transparent transparent",
  borderRadius: "50%",
  animation: "spin 1.2s linear infinite",
  background: "linear-gradient(135deg, #6e8efb, #a777e3)",
  maskImage: "radial-gradient(circle, transparent 60%, black 61%)",
  WebkitMaskImage: "radial-gradient(circle, transparent 60%, black 61%)",
  "@keyframes spin": {
    "0%": { transform: "rotate(0deg)" },
    "100%": { transform: "rotate(360deg)" },
  },
});

const ModernLoader = ({ userLoading, adminLoading, entryLoading }) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "transparent",
      }}
    >
      {userLoading
        ? "User Loading"
        : adminLoading
          ? "Admin Loading"
          : entryLoading
            ? "Entry Loading"
            : "Loading..."}
      <GradientSpinner />
    </Box>
  );
};

export default ModernLoader;
