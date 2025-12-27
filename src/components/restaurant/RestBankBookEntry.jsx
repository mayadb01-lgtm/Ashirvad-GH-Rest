import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Stack,
  TextField,
  Autocomplete,
  Button,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import dayjs from "dayjs";
import { getRestEntryByPaymentMethod } from "../../redux/actions/restEntryAction";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
dayjs.locale("en-gb");

const BankBooksDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, restEntries } = useAppSelector((state) => state.restEntry);
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [selectedMethod, setSelectedMethod] = useState(null);
  const optionsForMethod = ["Cash", "Card", "PP"];
  const fileNameRef = useRef(null);

  const handleStartDateChange = useCallback((newDate) => {
    if (newDate) setStartDate(newDate);
  }, []);

  const handleEndDateChange = useCallback((newDate) => {
    if (newDate) setEndDate(newDate);
  }, []);

  useEffect(() => {
    dispatch(
      getRestEntryByPaymentMethod(
        startDate.format("DD-MM-YYYY"),
        endDate.format("DD-MM-YYYY")
      )
    );
  }, [dispatch, startDate, endDate]);

  const columns = useMemo(() => {
    if (selectedMethod) {
      return [
        {
          field: "id",
          headerName: "Index",
          width: 150,
          headerAlign: "center",
          align: "center",
        },
        {
          field: "createDate",
          headerName: "Date",
          width: 150,
          headerAlign: "center",
          align: "center",
        },
        {
          field: selectedMethod,
          headerName: selectedMethod,
          width: 150,
          headerAlign: "center",
          align: "center",
        },
      ];
    } else {
      return [
        {
          field: "id",
          headerName: "Index",
          width: 150,
          headerAlign: "center",
          align: "center",
        },
        {
          field: "createDate",
          headerName: "Date",
          width: 150,
          headerAlign: "center",
          align: "center",
        },
        {
          field: "Cash",
          headerName: "Cash",
          width: 150,
          headerAlign: "center",
          align: "center",
        },
        {
          field: "Card",
          headerName: "Card",
          width: 150,
          headerAlign: "center",
          align: "center",
        },
        {
          field: "PP",
          headerName: "PP",
          width: 150,
          headerAlign: "center",
          align: "center",
        },
        {
          field: "grandTotal",
          headerName: "Grand Total",
          width: 150,
          headerAlign: "center",
          align: "center",
        },
      ];
    }
  }, [selectedMethod]);

  const preparedEntries = useMemo(() => {
    if (!Array.isArray(restEntries)) return [];

    const clonedEntries = JSON.parse(JSON.stringify(restEntries));

    const totalRow = {
      id: "Total",
      Cash: clonedEntries.reduce((total, e) => total + e.Cash, 0),
      Card: clonedEntries.reduce((total, e) => total + e.Card, 0),
      PP: clonedEntries.reduce((total, e) => total + e.PP, 0),
      grandTotal: clonedEntries.reduce((total, e) => total + e.grandTotal, 0),
    };

    const sortedEntries = clonedEntries.sort((a, b) =>
      dayjs(a.entryCreateDate).diff(dayjs(b.entryCreateDate))
    );

    console.log("restEntries", restEntries);

    const rows = sortedEntries.map((entry, index) => {
      const base = {
        id: index + 1,
        createDate: entry.createDate,
      };
      if (selectedMethod) {
        return {
          ...base,
          [selectedMethod]: entry[selectedMethod],
        };
      } else {
        return {
          ...base,
          Cash: entry.Cash,
          Card: entry.Card,
          PP: entry.PP,
          grandTotal: entry.grandTotal,
        };
      }
    });

    return [...rows, totalRow];
  }, [restEntries, selectedMethod]);

  const headerMap = {
    createDate: "Date",
    Cash: "Cash",
    Card: "Card",
    PP: "PP",
    grandTotal: "Grand Total",
  };

  const handleExportToExcel = () => {
    if (!Array.isArray(preparedEntries) || preparedEntries.length === 0) {
      toast.error("No data available to export for selected date range.");
      return;
    }
    const headingText = fileNameRef.current?.innerText || "";
    let prefix = "Export";
    if (headingText.includes("Guest House")) prefix = "GH";
    else if (headingText.includes("Restaurant")) prefix = "R";
    else if (headingText.includes("Office")) prefix = "OB";

    const fileName = `${prefix} Bank Book - ${startDate.format(
      "DD-MM-YYYY"
    )} to ${endDate.format("DD-MM-YYYY")}.xlsx`;

    const exportData = preparedEntries
      .filter((row) => row.type !== "group" && row.id !== "Total")
      .map(({ ...item }) => {
        const transformed = {};
        Object.keys(headerMap).forEach((key) => {
          transformed[headerMap[key]] = item[key];
        });
        return transformed;
      });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Book");

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
          Restaurant Bank Book
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
            renderInput={(params) => <TextField {...params} size="small" />}
            views={["year", "month", "day"]}
          />
          <Typography>-</Typography>
          <DatePicker
            value={endDate}
            onChange={handleEndDateChange}
            format="DD-MM-YYYY"
            renderInput={(params) => <TextField {...params} size="small" />}
            views={["year", "month", "day"]}
          />
        </LocalizationProvider>
        <Autocomplete
          disablePortal
          id="Method"
          options={optionsForMethod}
          sx={{ width: 200 }}
          value={selectedMethod}
          onChange={(event, newValue) => {
            setSelectedMethod(newValue);
          }}
          renderInput={(params) => <TextField {...params} label="Method" />}
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
          rows={preparedEntries}
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

export default BankBooksDashboard;
