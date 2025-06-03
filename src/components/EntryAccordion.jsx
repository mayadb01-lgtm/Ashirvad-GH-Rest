import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import React, { Suspense } from "react";

const TableComponent = React.lazy(() => import("./TableComponent"));

const EntryAccordion = ({
  title,
  period,
  onSubmit,
  bgColor,
  tableData,
  selectedDate,
}) => {
  return (
    <Accordion style={{ boxShadow: "none" }} expanded={true}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        style={{
          backgroundColor: bgColor,
          border: "1px solid #e0e0e0",
          minHeight: "0",
          height: "40px",
          boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          flex={1}
          justifyContent="space-between"
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 500, fontSize: "14px" }}
          >
            {title}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails style={{ margin: 0, padding: 0 }}>
        <Suspense fallback={<CircularProgress />}>
          <TableComponent
            period={period}
            title={`${title} Table`}
            rowsLength={11}
            onSubmit={onSubmit}
            tableData={tableData}
            selectedDate={selectedDate}
          />
        </Suspense>
      </AccordionDetails>
    </Accordion>
  );
};

export default EntryAccordion;
