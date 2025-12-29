import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Stack,
  TextField,
  Button,
  Autocomplete,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { getEntriesByDateRange } from "../../redux/actions/entryAction";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { GH_MODE_OF_PAYMENT_OPTIONS } from "../../utils/utils";

dayjs.locale("en-gb");

const GHUpaidEntriesDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, entries } = useAppSelector((state) => state.entry);
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const fileNameRef = useRef(null);

  useEffect(() => {
    dispatch(
      getEntriesByDateRange(
        startDate.format("DD-MM-YYYY"),
        endDate.format("DD-MM-YYYY")
      )
    );
  }, [dispatch, startDate, endDate]);

  const handleStartDateChange = useCallback((newDate) => {
    if (newDate) setStartDate(newDate);
  }, []);

  const handleEndDateChange = useCallback((newDate) => {
    if (newDate) setEndDate(newDate);
  }, []);

  const columns = useMemo(() => {
    return [
      {
        field: "id",
        headerName: "Index",
        width: 150,
        headerAlign: "center",
        align: "center",
        flex: 1,
      },
      {
        field: "date",
        headerName: "Date",
        flex: 1,
        minWidth: 200,
        headerAlign: "center",
        align: "center",
        flex: 1,
      },
      {
        field: "UnPaid",
        headerName: "UnPaid",
        flex: 1,
        minWidth: 150,
        headerAlign: "center",
        align: "center",
        flex: 1,
      },
      {
        field: "Paid",
        headerName: "Paid",
        flex: 1,
        minWidth: 150,
        headerAlign: "center",
        align: "center",
        flex: 1,
      },
      {
        field: "total",
        headerName: "Total",
        flex: 1,
        minWidth: 150,
        headerAlign: "center",
        align: "center",
        flex: 1,
      },
    ];
  }, []);

  // Prepare rows
  const preparedData = useMemo(() => {
    if (!entries) return [];

    const rows = entries.map((entry, index) => {
      const unpaidTotal = entry.entry
        .filter((item) => !item.isPaid || item.modeOfPayment === "UnPaid")
        .reduce((sum, item) => sum + item.rate, 0);

      const paidTotal = entry.entry
        .filter((item) => item.isPaid && item.period === "UnPaid")
        .reduce((sum, item) => sum + item.rate, 0);

      return {
        id: index + 1,
        date: entry.date,
        UnPaid: unpaidTotal,
        Paid: paidTotal,
        total: unpaidTotal - paidTotal,
      };
    });

    // Total row
    const totalRow = {
      id: "Total",
      date: "Total",
      UnPaid: rows.reduce((sum, row) => sum + row.UnPaid, 0),
      Paid: rows.reduce((sum, row) => sum + row.Paid, 0),
      total: rows.reduce((sum, row) => sum + row.total, 0),
    };
    return [...rows, totalRow];
  }, [entries]);

  const handleExportToExcel = () => {
    if (!preparedData || preparedData.length === 0) {
      toast.error("No data available to export for selected date range.");
      return;
    }
    const headingText = fileNameRef.current?.innerText || "";
    let prefix = "Export";
    if (headingText.includes("Guest House")) prefix = "GH";
    else if (headingText.includes("Restaurant")) prefix = "R";
    else if (headingText.includes("Office")) prefix = "OB";

    const fileName = `${prefix} UnPaid Report - ${startDate.format(
      "DD-MM-YYYY"
    )} to ${endDate.format("DD-MM-YYYY")}.xlsx`;

    const worksheet = XLSX.utils.json_to_sheet(preparedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "UnPaid Report");
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Box
      sx={{
        py: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <Box
        sx={{
          alignItems: "center",
          py: 3,
        }}
      >
        <Typography
          ref={fileNameRef}
          variant="h5"
          fontWeight={600}
          color="text.primary"
        >
          Guest House - UnPaid Report
        </Typography>
      </Box>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="subtitle2" fontWeight={500} color="text.secondary">
          Select Date Range
        </Typography>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <DatePicker
            value={startDate}
            onChange={handleStartDateChange}
            format="DD-MM-YYYY"
            textField={(params) => <TextField {...params} size="small" />}
            views={["year", "month", "day"]}
          />
          <Typography>-</Typography>
          <DatePicker
            value={endDate}
            onChange={handleEndDateChange}
            format="DD-MM-YYYY"
            textField={(params) => <TextField {...params} size="small" />}
            views={["year", "month", "day"]}
          />
        </LocalizationProvider>
        {/* <Button
          variant="outlined"
          color="primary"
          onClick={() => {
            const prevMonth = dayjs(startDate).subtract(1, "month");
            setStartDate(prevMonth.startOf("month"));
            setEndDate(prevMonth.endOf("month"));
          }}
        >
          Previous Month
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => {
            const nextMonth = dayjs(startDate).add(1, "month");
            setStartDate(nextMonth.startOf("month"));
            setEndDate(nextMonth.endOf("month"));
          }}
        >
          Next Month
        </Button> */}
        <Button
          variant="outlined"
          color="primary"
          sx={{ mt: 2 }}
          onClick={handleExportToExcel}
        >
          Export to Excel
        </Button>
      </Stack>
      {loading ? (
        <CircularProgress sx={{ mt: 2 }} />
      ) : (
        <DataGrid
          rows={preparedData}
          columns={columns}
          pageSize={5}
          WebkitFontSmoothing="auto"
          letterSpacing={"normal"}
          sx={{
            mt: 2,
            height: 400,
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold",
            },
            "& .MuiDataGrid-cell:hover": {
              color: "primary.main",
            },
            "& .MuiDataGrid-columnHeader, .MuiDataGrid-cell": {
              border: "1px solid #f0f0f0",
            },
            "& .MuiDataGrid-row[data-id='Total'] .MuiDataGrid-cell": {
              fontWeight: "bold",
            },
          }}
        />
      )}
    </Box>
  );
};

export default GHUpaidEntriesDashboard;
