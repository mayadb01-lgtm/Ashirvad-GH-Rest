import { useEffect, useState, useCallback, useMemo } from "react";
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
      field: "expenseName",
      headerName: "Expense Name",
      width: 150,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "categoryName",
      headerName: "Category Name",
      width: 150,
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

  const selectedStaffEntries =
    restEntries &&
    restEntries.filter((entry) => entry.categoryName === selectedCategory);

  const preparedEntries = useMemo(() => {
    const totalRow = {
      id: "Total",
      createDate: "",
      expenseName: "",
      categoryName: "",
      amount: selectedCategory
        ? selectedStaffEntries.reduce((a, b) => a + b.amount, 0)
        : restEntries.reduce((a, b) => a + b.amount, 0),
    };
    if (selectedCategory) {
      return selectedStaffEntries
        .map((entry, index) => ({
          id: index + 1,
          createDate: entry.createDate,
          expenseName: entry.expenseName,
          categoryName: entry.categoryName,
          amount: entry.amount,
        }))
        .concat(totalRow);
    }
    return restEntries
      .map((entry, index) => ({
        id: index + 1,
        createDate: entry.createDate,
        expenseName: entry.expenseName,
        categoryName: entry.categoryName,
        amount: entry.amount,
      }))
      .concat(totalRow);
  }, [restEntries, selectedCategory, selectedStaffEntries]);

  // Select Category - Options - Unique Categories

  const optionsForCategory = useMemo(() => {
    const uniqueCategories = new Set(
      restEntries && restEntries.map((entry) => entry.categoryName)
    );
    return Array.from(uniqueCategories);
  }, [restEntries]);

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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Guest Entries");

    XLSX.writeFile(workbook, "GuestHouseEntries.xlsx");
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
        <Typography variant="h5" fontWeight={600} color="text.primary">
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
          id="category"
          options={optionsForCategory}
          getOptionLabel={(option) => option}
          style={{ width: 300 }}
          renderInput={(params) => (
            <TextField {...params} label="Select Category" />
          )}
          onChange={(event, newValue) => {
            setSelectedCategory(newValue);
          }}
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
          sx={{
            mt: 2,
            height: 400,
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold",
            },
          }}
        />
      )}
    </Box>
  );
};

export default RestExpensesDashboard;
