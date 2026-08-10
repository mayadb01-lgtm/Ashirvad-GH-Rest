import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Box,
  Typography,
  Stack,
  TextField,
  Autocomplete,
  Button,
  Card,
  CardContent,
  Alert,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import SkipPreviousRoundedIcon from "@mui/icons-material/SkipPreviousRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import { useDateNavigation } from "../../hooks/useDateNavigation";
import dayjs from "dayjs";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { DownloadForOffline } from "@mui/icons-material";

dayjs.locale("en-gb");

const DATE_FORMAT = "DD-MM-YYYY";

const OfficeCreditDebit = () => {
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [selectedExpenseName, setSelectedExpenseName] = useState(null);

  const fileNameRef = useRef(null);

  const handleStartDateChange = useCallback((newDate) => {
    if (newDate) setStartDate(newDate);
  }, []);
  const handleEndDateChange = useCallback((newDate) => {
    if (newDate) setEndDate(newDate);
  }, []);

  const { goToPreviousRange, goToNextRange } = useDateNavigation({
    startDate,
    endDate,
    setStartDate,
    setEndDate,
  });

  // Raw data straight from the server for the current date range.
  // This is never mutated by filtering - filtering/derived values are
  // computed with useMemo below so the original data is always available.
  const [rawRows, setRawRows] = useState([]);
  const [expenseNameOptions, setExpenseNameOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const start = startDate.format(DATE_FORMAT);
        const end = endDate.format(DATE_FORMAT);
        const { data } = await axios.get(
          `${import.meta.env.VITE_REACT_APP_SERVER_URL}/vendor/get-vendor-entries/${start}/${end}`
        );
        if (cancelled) return;

        if (data?.success) {
          setRawRows(
            (data.data.finalRows || []).filter((row) => row.id !== "Total")
          );
          setExpenseNameOptions(data.data.expenseNameOptions || []);
        } else {
          setError(data?.message || "Could not load entries.");
          setRawRows([]);
          setExpenseNameOptions([]);
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err?.response?.data?.message || "Could not load entries.";
        setError(message);
        toast.error(message);
        setRawRows([]);
        setExpenseNameOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  // Apply the expenseName filter and recompute the running balance +
  // totals for just the filtered subset. Derived purely from rawRows,
  // so switching/clearing the filter always starts from the full data.
  const { displayRows, totals } = useMemo(() => {
    const filteredRows = selectedExpenseName
      ? rawRows.filter((row) => row.expenseName === selectedExpenseName)
      : rawRows;

    let runningBalance = 0;
    const rowsWithBalance = filteredRows.map((row) => {
      runningBalance += row.credit - row.debit;
      return { ...row, balance: runningBalance };
    });

    const creditAmountTotal = rowsWithBalance.reduce(
      (sum, row) => sum + row.credit,
      0
    );
    const debitAmountTotal = rowsWithBalance.reduce(
      (sum, row) => sum + row.debit,
      0
    );
    const totalBalance = creditAmountTotal - debitAmountTotal;

    return {
      displayRows: [
        ...rowsWithBalance,
        {
          id: "Total",
          createDate: "",
          entryCreateDate: null,
          fullname: "",
          expenseName: null,
          modeOfPayment: "Total",
          credit: creditAmountTotal,
          debit: debitAmountTotal,
          balance: totalBalance,
        },
      ],
      totals: { creditAmountTotal, debitAmountTotal, totalBalance },
    };
  }, [rawRows, selectedExpenseName]);

  const columns = [
    {
      field: "createDate",
      headerName: "Date",
      width: 100,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "fullname",
      headerName: "Name",
      width: 150,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "expenseName",
      headerName: "Expense",
      width: 180,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "source",
      headerName: "Source",
      width: 180,
      align: "center",
      headerAlign: "center",
      valueFormatter: (value) =>
        ({
          restAapvana: "Restaurant Aapvana",
          restExpense: "Restaurant Expense",
          officeIn: "Office In",
          officeOut: "Office Out",
        })[value] ||
        value ||
        "",
    },
    {
      field: "modeOfPayment",
      headerName: "Mode of Payment",
      width: 150,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "credit",
      headerName: "Credit",
      width: 100,
      align: "center",
      headerAlign: "center",
      cellClassName: "credit-cell",
      valueFormatter: (value) => (value ? value.toLocaleString("en-IN") : ""),
    },
    {
      field: "debit",
      headerName: "Debit",
      width: 100,
      align: "center",
      headerAlign: "center",
      cellClassName: "debit-cell",
      valueFormatter: (value) => (value ? value.toLocaleString("en-IN") : ""),
    },
    {
      field: "balance",
      headerName: "Balance",
      width: 130,
      align: "center",
      headerAlign: "center",
      valueFormatter: (value) =>
        typeof value === "number" ? value.toLocaleString("en-IN") : "",
    },
  ];

  const headerMap = {
    createDate: "Date",
    fullname: "Full Name",
    expenseName: "Expense Name",
    source: "Source",
    modeOfPayment: "Mode of Payment",
    credit: "Amount In",
    debit: "Amount Out",
    balance: "Balance",
  };

  const handleExportToExcel = () => {
    if (displayRows.length === 0) {
      toast.error("No data available to export for selected date range.");
      return;
    }

    const fileName = `Merged Vendor Report - ${startDate.format(
      DATE_FORMAT
    )} to ${endDate.format(DATE_FORMAT)}.xlsx`;

    const exportData = displayRows.map((item) => {
      const transformed = {};
      Object.keys(headerMap).forEach((key) => {
        transformed[headerMap[key]] = item[key];
      });
      return transformed;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Aapvana Levana");
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
      <Box sx={{ alignItems: "center", py: 3 }}>
        <Typography
          ref={fileNameRef}
          variant="h5"
          fontWeight={600}
          color="text.primary"
        >
          Merged Vendor Report
        </Typography>
      </Box>

      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Typography variant="subtitle2" fontWeight={500} color="text.secondary">
          Select Date Range
        </Typography>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <DatePicker
            value={startDate}
            onChange={handleStartDateChange}
            format={DATE_FORMAT}
            slotProps={{ textField: { size: "small" } }}
            views={["year", "month", "day"]}
          />
          <Typography>-</Typography>
          <DatePicker
            value={endDate}
            onChange={handleEndDateChange}
            format={DATE_FORMAT}
            slotProps={{ textField: { size: "small" } }}
            views={["year", "month", "day"]}
          />
        </LocalizationProvider>

        <Box
          display="flex"
          alignItems="center"
          gap={2}
          justifyContent="center"
          border={1}
          borderColor="divider"
          borderRadius={2}
          p={1}
        >
          <Typography variant="subtitle2" color="text.secondary">
            Month
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={goToPreviousRange}
              sx={{ minWidth: "40px", padding: "4px" }}
            >
              <SkipPreviousRoundedIcon fontSize="small" />
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={goToNextRange}
              sx={{ minWidth: "40px", padding: "4px" }}
            >
              <SkipNextRoundedIcon fontSize="small" />
            </Button>
          </Stack>
        </Box>

        <Autocomplete
          disablePortal
          id="expenseName"
          options={expenseNameOptions}
          value={selectedExpenseName}
          style={{ width: 260 }}
          renderInput={(params) => (
            <TextField {...params} label="Expense Name" />
          )}
          onChange={(event, newValue) => setSelectedExpenseName(newValue)}
          size="small"
        />

        <Button
          variant="outlined"
          color="primary"
          onClick={handleExportToExcel}
          size="small"
        >
          Export to Excel
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ width: "100%", maxWidth: 1100, mt: 2 }}>
          {error}
        </Alert>
      )}

      <Stack
        direction="row"
        spacing={2}
        sx={{ mt: 3, width: "100%", maxWidth: 1100 }}
      >
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Total Credit
            </Typography>
            <Typography variant="h6" color="success.main">
              {totals.creditAmountTotal.toLocaleString("en-IN")}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Total Debit
            </Typography>
            <Typography variant="h6" color="error.main">
              {totals.debitAmountTotal.toLocaleString("en-IN")}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Balance
            </Typography>
            <Typography variant="h6">
              {totals.totalBalance.toLocaleString("en-IN")}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      <Box sx={{ width: "100%", maxWidth: 1100, mt: 3, height: 400 }}>
        <DataGrid
          rows={displayRows}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          showCellVerticalBorder
          showColumnVerticalBorder
          disableRowSelectionOnClick
          getRowClassName={(params) =>
            params.row.id === "Total" ? "total-row" : ""
          }
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          pageSizeOptions={[25, 50, 100]}
          sx={{
            WebkitFontSmoothing: "auto",
            "&.MuiDataGrid-root .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold",
            },
            "& .total-row": {
              fontWeight: 700,
              backgroundColor: "action.hover",
            },
            "& .credit-cell": {
              color: "success.main",
              fontWeight: 600,
            },
            "& .debit-cell": {
              color: "error.main",
              fontWeight: 600,
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default OfficeCreditDebit;
