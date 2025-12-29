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
import { getExpensesByDateRange } from "../../redux/actions/restEntryAction";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
dayjs.locale("en-gb");

const RestExpensesDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, restEntries } = useAppSelector((state) => state.restEntry);
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const fileNameRef = useRef(null);

  const handleStartDateChange = useCallback((newDate) => {
    if (newDate) setStartDate(newDate);
  }, []);

  const handleEndDateChange = useCallback((newDate) => {
    if (newDate) setEndDate(newDate);
  }, []);

  useEffect(() => {
    dispatch(
      getExpensesByDateRange(
        startDate.format("DD-MM-YYYY"),
        endDate.format("DD-MM-YYYY")
      )
    );
  }, [dispatch, startDate, endDate]);

  const columns = [
    {
      field: "id",
      headerName: "Index",
      width: 100,
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
      field: "expenseName",
      headerName: "Expense Name",
      width: 250,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "categoryName",
      headerName: "Category Name",
      width: 250,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "amount",
      headerName: "Amount",
      width: 150,
      headerAlign: "center",
      align: "center",
    },
  ];

  // Prepare options
  const optionsForCategory = useMemo(
    () => Array.from(new Set(restEntries?.map((entry) => entry.categoryName))),
    [restEntries]
  );

  const optionsForExpense = useMemo(
    () => Array.from(new Set(restEntries?.map((entry) => entry.expenseName))),
    [restEntries]
  );

  const preparedEntries = useMemo(() => {
    const filteredData =
      restEntries?.filter((entry) => {
        const matchesCategory = selectedCategory
          ? entry.categoryName === selectedCategory
          : true;
        const matchesExpense = selectedExpense
          ? entry.expenseName === selectedExpense
          : true;
        return matchesCategory && matchesExpense;
      }) || [];

    const totalAmount = filteredData.reduce(
      (sum, curr) => sum + (curr.amount || 0),
      0
    );

    const totalRow = {
      id: "Total",
      createDate: "",
      expenseName: "",
      categoryName: "",
      amount: totalAmount,
    };

    // Calculate unique days - get unique dates from filtered entries
    const uniqueDates = new Set(filteredData.map((entry) => entry.createDate));
    const numberOfUniqueDays = uniqueDates.size;

    const averageRow = {
      id: "Average",
      createDate: numberOfUniqueDays, // Show unique day count
      expenseName: "",
      categoryName: "",
      amount:
        numberOfUniqueDays > 0
          ? parseFloat((totalAmount / numberOfUniqueDays).toFixed(2))
          : 0,
    };

    return [
      ...filteredData.map((entry, index) => ({
        id: index + 1,
        createDate: entry.createDate,
        expenseName: entry.expenseName,
        categoryName: entry.categoryName,
        amount: entry.amount,
      })),
      totalRow,
      averageRow,
    ];
  }, [restEntries, selectedCategory, selectedExpense]);

  // Select Category - Options - Unique Categories

  const headerMap = {
    createDate: "Date",
    expenseName: "Expense Name",
    categoryName: "Category Name",
    amount: "Amount",
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

    const fileName = `${prefix} Expense Report - ${startDate.format(
      "DD-MM-YYYY"
    )} to ${endDate.format("DD-MM-YYYY")}.xlsx`;

    const exportData = preparedEntries
      .filter(
        (row) =>
          row.type !== "group" && row.id !== "Total" && row.id !== "Average"
      )
      .map(({ ...item }) => {
        const transformed = {};
        Object.keys(headerMap).forEach((key) => {
          transformed[headerMap[key]] = item[key];
        });
        return transformed;
      });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expense Report");

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
          Restaurant Expense Report
        </Typography>
      </Box>
      <Stack direction="row" spacing={2} alignItems="center">
        {/* Header */}
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
          id="category"
          options={optionsForCategory}
          value={selectedCategory}
          onChange={(e, newValue) => setSelectedCategory(newValue)}
          style={{ width: 200 }}
          renderInput={(params) => (
            <TextField {...params} label="Select Category" size="small" />
          )}
        />
        <Autocomplete
          disablePortal
          id="expense"
          options={optionsForExpense}
          value={selectedExpense}
          onChange={(e, newValue) => setSelectedExpense(newValue)}
          style={{ width: 200 }}
          renderInput={(params) => (
            <TextField {...params} label="Select Expense" size="small" />
          )}
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

export default RestExpensesDashboard;
