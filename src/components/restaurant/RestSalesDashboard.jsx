import { useEffect, useState, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Stack,
  TextField,
  Button,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import SkipPreviousRoundedIcon from "@mui/icons-material/SkipPreviousRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import { useDateNavigation } from "../../hooks/useDateNavigation";
import dayjs from "dayjs";
import { getRestEntriesByDateRange } from "../../redux/actions/restEntryAction";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

dayjs.locale("en-gb");

const RestSalesDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, restEntries } = useAppSelector((state) => state.restEntry);
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
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

  useEffect(() => {
    dispatch(
      getRestEntriesByDateRange(
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
      field: "date",
      headerName: "Date",
      width: 150,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "total",
      headerName: "Total",
      width: 150,
      headerAlign: "center",
      align: "center",
    },
  ];

  const totalRow = {
    id: "Total",
    date: "",
    total:
      restEntries &&
      restEntries.reduce((total, entry) => total + entry.grandTotal, 0),
  };

  const averageRow = {
    id: "Average",
    date: "",
    total:
      restEntries && restEntries.length > 0
        ? parseFloat((totalRow.total / restEntries.length).toFixed(2))
        : 0,
  };

  const preparedEntries = restEntries
    .map((entry, index) => ({
      id: index + 1,
      date: entry.createDate,
      total: entry.grandTotal,
    }))
    .concat(totalRow)
    .concat(averageRow);

  // handleExportToExcel

  const headerMap = {
    date: "Date",
    total: "Total",
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

    const fileName = `${prefix} Sales Report - ${startDate.format(
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");

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
          Restaurant Sales Report
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
        <Box
          display="flex"
          alignItems="center"
          gap={2}
          justifyContent="center"
          border={1}
          borderColor="divider"
          borderRadius={2}
          p={2}
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
              sx={{
                minWidth: "40px",
                padding: "4px",
              }}
            >
              <SkipPreviousRoundedIcon fontSize="small" />
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={goToNextRange}
              sx={{
                minWidth: "40px",
                padding: "4px",
              }}
            >
              <SkipNextRoundedIcon fontSize="small" />
            </Button>
          </Stack>
        </Box>
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

export default RestSalesDashboard;
