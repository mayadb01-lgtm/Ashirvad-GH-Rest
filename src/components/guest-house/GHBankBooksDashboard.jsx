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

const GHBankBooksDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, entries } = useAppSelector((state) => state.entry);
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const fileNameRef = useRef(null);

  const [selectedMethod, setSelectedMethod] = useState(null);

  const handleStartDateChange = useCallback((newDate) => {
    if (newDate) setStartDate(newDate);
  }, []);

  const handleEndDateChange = useCallback((newDate) => {
    if (newDate) setEndDate(newDate);
  }, []);

  useEffect(() => {
    dispatch(
      getEntriesByDateRange(
        startDate.format("DD-MM-YYYY"),
        endDate.format("DD-MM-YYYY")
      )
    );
  }, [dispatch, startDate, endDate]);

  // Prepare rows
  const preparedData = useMemo(() => {
    if (!entries) return [];

    const rows = entries.map((entry, index) => {
      const row = { id: index + 1, date: entry.date, total: 0 };

      const methodsToInclude = selectedMethod
        ? [selectedMethod]
        : GH_MODE_OF_PAYMENT_OPTIONS;

      methodsToInclude.forEach((method) => {
        const totalByMethod = entry.entry
          .filter(
            (item) => item.modeOfPayment === method && item.period !== "UnPaid"
          )
          .reduce((sum, item) => sum + item.rate, 0);

        row[method] = totalByMethod;
        row.total += totalByMethod;
      });

      return row;
    });

    // Total row
    const totalRow = { id: "Total", date: "", total: 0 };
    const methodsToInclude = selectedMethod
      ? [selectedMethod]
      : GH_MODE_OF_PAYMENT_OPTIONS;

    methodsToInclude.forEach((method) => {
      totalRow[method] = rows.reduce((sum, row) => sum + (row[method] || 0), 0);
      totalRow.total += totalRow[method];
    });

    // Average row
    const averageRow = { id: "Average", date: "", total: 0 };
    const rowCount = rows.length;

    methodsToInclude.forEach((method) => {
      averageRow[method] =
        rowCount > 0 ? parseFloat((totalRow[method] / rowCount).toFixed(2)) : 0;
      averageRow.total += averageRow[method];
    });
    averageRow.total = parseFloat(averageRow.total.toFixed(2));

    return [...rows, totalRow, averageRow];
  }, [entries, selectedMethod]);

  const columns = useMemo(() => {
    const base = [
      {
        field: "id",
        headerName: "Index",
        width: 100,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "date",
        headerName: "Date",
        width: 150,
        headerAlign: "center",
        align: "center",
      },
    ];

    const dynamic = selectedMethod
      ? [
          {
            field: selectedMethod,
            headerName: selectedMethod,
            width: 100,
            headerAlign: "center",
            align: "center",
          },
        ]
      : GH_MODE_OF_PAYMENT_OPTIONS.map((method) => ({
          field: method,
          headerName: method,
          width: 100,
          headerAlign: "center",
          align: "center",
        }));

    const total = [
      {
        field: "total",
        headerName: "Total",
        width: 100,
        headerAlign: "center",
        align: "center",
      },
    ];
    return [...base, ...dynamic, ...total];
  }, [selectedMethod]);

  const handleExportToExcel = () => {
    if (!preparedData || preparedData.length === 0) {
      toast.error("No data available to export for selected date range.");
      return;
    }
    const headingText = fileNameRef.current?.innerText || "";
    let prefix = "BB";
    if (headingText.includes("Guest House")) prefix = "GH";
    else if (headingText.includes("Restaurant")) prefix = "R";
    else if (headingText.includes("Office")) prefix = "OB";

    const fileName = `${prefix} Bank Book - ${startDate.format(
      "DD-MM-YYYY"
    )} to ${endDate.format("DD-MM-YYYY")}.xlsx`;

    const exportData = preparedData.filter(
      (row) => row.id !== "Total" && row.id !== "Average"
    );

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Book");
    XLSX.writeFile(workbook, fileName);

    toast.success("Data exported successfully.");
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
          Guest House - Bank Book
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
        <Autocomplete
          disablePortal
          options={GH_MODE_OF_PAYMENT_OPTIONS}
          value={selectedMethod}
          onChange={(_, value) => setSelectedMethod(value)}
          sx={{ width: 200 }}
          renderInput={(params) => (
            <TextField {...params} label="Payment Method" />
          )}
          clearOnEscape
          size="small"
        />
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
            "& .MuiDataGrid-row[data-id='Average'] .MuiDataGrid-cell": {
              fontWeight: "bold",
            },
          }}
        />
      )}
    </Box>
  );
};

export default GHBankBooksDashboard;
