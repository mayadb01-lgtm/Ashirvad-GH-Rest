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
import { getUpadByDateRange } from "../../redux/actions/restEntryAction";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
dayjs.locale("en-gb");

const RestUpaadEntriesDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, restEntries } = useAppSelector((state) => state.restEntry);
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [selectedStaff, setSelectedStaff] = useState(null);
  const fileNameRef = useRef(null);

  const handleStartDateChange = useCallback((newDate) => {
    if (newDate) setStartDate(newDate);
  }, []);

  const handleEndDateChange = useCallback((newDate) => {
    if (newDate) setEndDate(newDate);
  }, []);

  useEffect(() => {
    dispatch(
      getUpadByDateRange(
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
      field: "fullname",
      headerName: "Staff Name",
      width: 300,
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
    restEntries
      .filter((entry) => entry.fullname === selectedStaff?.fullname)
      .sort((a, b) => dayjs(a.entryCreateDate).diff(dayjs(b.entryCreateDate)));

  const preparedEntries = useMemo(() => {
    const totalRow = {
      id: "Total",
      createDate: "",
      fullname: "",
      amount: selectedStaff
        ? selectedStaffEntries
            .map((entry) => entry.amount)
            .reduce((a, b) => a + b, 0)
        : restEntries.map((entry) => entry.amount).reduce((a, b) => a + b, 0),
    };

    // Calculate unique days - get unique dates from entries
    const entriesToUse = selectedStaff ? selectedStaffEntries : restEntries;
    const uniqueDates = new Set(entriesToUse.map((entry) => entry.createDate));
    const numberOfUniqueDays = uniqueDates.size;

    const averageRow = {
      id: "Average",
      createDate: numberOfUniqueDays,
      fullname: "",
      amount:
        numberOfUniqueDays > 0
          ? parseFloat((totalRow.amount / numberOfUniqueDays).toFixed(2))
          : 0,
    };

    if (selectedStaff) {
      return selectedStaffEntries
        .map((entry, index) => ({
          id: index + 1,
          createDate: entry.createDate,
          fullname: entry.fullname,
          amount: entry.amount,
        }))
        .concat(totalRow)
        .concat(averageRow);
    }

    const sortedEntries = [...restEntries].sort((a, b) =>
      dayjs(a.entryCreateDate).diff(dayjs(b.entryCreateDate))
    );
    return sortedEntries
      .map((entry, index) => ({
        id: index + 1,
        createDate: entry.createDate,
        fullname: entry.fullname,
        amount: entry.amount,
      }))
      .concat(totalRow)
      .concat(averageRow);
  }, [restEntries, selectedStaff, selectedStaffEntries]);

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
    const headingText = fileNameRef.current?.innerText || "";
    let prefix = "Export";
    if (headingText.includes("Guest House")) prefix = "GH";
    else if (headingText.includes("Restaurant")) prefix = "R";
    else if (headingText.includes("Office")) prefix = "OB";

    const fileName = `${prefix} Upaad Report - ${startDate.format(
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Upaad Report");

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
          Restaurant Upaad Report
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
          options={restEntries}
          getOptionLabel={(option) => option.fullname}
          style={{ width: 300 }}
          renderInput={(params) => (
            <TextField {...params} label="Select Staff" />
          )}
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

export default RestUpaadEntriesDashboard;
