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
import { getAapvanaByDateRange } from "../../redux/actions/restEntryAction";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { getPendingUser } from "../../redux/actions/restPendingAction";
import { getOfficeBookByDateRange } from "../../redux/actions/officeBookAction";

dayjs.locale("en-gb");

const AapvanaLevanaBalance = () => {
  const dispatch = useAppDispatch();
  const { loading: restLoading, restEntries } = useAppSelector(
    (state) => state.restEntry
  );
  const { restPending } = useAppSelector((state) => state.restPending);
  const { loading: officeLoading, officeBook } = useAppSelector(
    (state) => state.officeBook
  );

  useEffect(() => {
    dispatch(getPendingUser());
  }, [dispatch]);

  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [selectedStaff, setSelectedStaff] = useState(null);

  const handleStartDateChange = useCallback((newDate) => {
    if (newDate) setStartDate(newDate);
  }, []);

  const handleEndDateChange = useCallback((newDate) => {
    if (newDate) setEndDate(newDate);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          dispatch(
            getAapvanaByDateRange(
              startDate.format("DD-MM-YYYY"),
              endDate.format("DD-MM-YYYY")
            )
          ),
          dispatch(
            getOfficeBookByDateRange(
              startDate.format("DD-MM-YYYY"),
              endDate.format("DD-MM-YYYY")
            )
          ),
        ]);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [dispatch, startDate, endDate]);

  const columns = [
    {
      field: "id",
      headerName: "Index",
      width: 80,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "createDate",
      headerName: "Date",
      width: 150,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "fullname",
      headerName: "Name",
      width: 200,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "amountIn",
      headerName: "Amount In",
      width: 150,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "amountOut",
      headerName: "Amount Out",
      width: 150,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "balance",
      headerName: "Balance",
      width: 150,
      align: "center",
      headerAlign: "center",
    },
  ];

  console.log("selectedStaff", selectedStaff);

  const preparedEntries = useMemo(() => {
    const safeRestEntries = Array.isArray(restEntries) ? restEntries : [];
    const safeOfficeBook = Array.isArray(officeBook) ? officeBook : [];

    const restFiltered = selectedStaff
      ? safeRestEntries.filter(
          (entry) => entry.fullname === selectedStaff.fullname
        )
      : safeRestEntries;

    const officeFiltered = selectedStaff
      ? safeOfficeBook
          .flatMap((entry) => entry.officeIn || [])
          .filter(
            (entry) =>
              entry.categoryName === "Pending" &&
              entry.expenseName === selectedStaff.fullname
          )
      : safeOfficeBook
          .flatMap((entry) => entry.officeIn || [])
          .filter((entry) => entry.categoryName === "Pending");

    const totalAmountOut = restFiltered.reduce(
      (sum, e) => sum + (e.amount || 0),
      0
    );

    const totalAmountIn = officeFiltered.reduce(
      (sum, e) => sum + (e.amount || 0),
      0
    );

    const balance = totalAmountIn - totalAmountOut;

    const totalRow = {
      id: "Total",
      createDate: "",
      fullname: "",
      amountIn: totalAmountIn,
      amountOut: totalAmountOut,
      balance: balance,
    };

    // Combine all entries
    const finalRows = [
      ...restFiltered.map((entry, index) => ({
        id: index + 1,
        createDate: entry.createDate,
        fullname: entry.fullname,
        amountOut: entry.amount,
        amountIn: 0,
        balance: null,
      })),
      ...officeFiltered.map((entry, index) => ({
        id: restFiltered.length + index + 1,
        createDate: entry.createDate,
        fullname: entry.expenseName,
        amountIn: entry.amount,
        amountOut: 0,
        balance: null,
      })),
      totalRow,
    ];

    return finalRows.map((entry) => ({
      ...entry,
      balance: entry.balance ?? entry.amountIn - entry.amountOut,
    }));
  }, [restEntries, officeBook, selectedStaff]);

  // handleExportToExcel

  const headerMap = {
    createDate: "Date",
    fullname: "Staff Name",
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
          Aapvana Levana Balance
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
        {/* fullname selection */}
        <Autocomplete
          disablePortal
          id="fullname"
          options={restPending}
          getOptionLabel={(option) => option.fullname}
          style={{ width: 300 }}
          renderInput={(params) => <TextField {...params} label="Select" />}
          onChange={(event, newValue) => {
            setSelectedStaff(newValue);
          }}
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
      {restLoading || officeLoading ? (
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

export default AapvanaLevanaBalance;
