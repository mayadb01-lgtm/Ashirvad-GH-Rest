import { useState, useEffect, useCallback, useRef } from "react";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SkipPreviousRoundedIcon from "@mui/icons-material/SkipPreviousRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { useDateNavigation } from "../../hooks/useDateNavigation";
import { getRestStaff } from "../../redux/actions/restStaffAction";
import { getOfficeBookCategoryUpaadByMonthRange } from "../../redux/actions/officeBookAction";
import {
  getSalarySheetsByMonthRange,
  getSalaryAndOvertimeByMonthRange,
} from "../../redux/actions/staffSalaryAction";
import { getStaffUpaadByMonthRange } from "../../redux/actions/restEntryAction";

dayjs.locale("en-gb");

const columns = [
  {
    field: "index",
    headerName: "No",
    flex: 0.4,
    minWidth: 40,
    headerAlign: "center",
    align: "center",
    renderCell: (params) => (
      <>{params.api.getRowIndexRelativeToVisibleRows(params.id) + 1}</>
    ),
  },
  {
    field: "month",
    headerName: "Month",
    flex: 0.9,
    minWidth: 70,
    headerAlign: "center",
    align: "center",
  },
  {
    field: "fullname",
    headerName: "Staff Name",
    flex: 1.3,
    minWidth: 90,
    headerAlign: "center",
    align: "center",
  },
  {
    field: "perDayPay",
    headerName: "Per Day Pay",
    flex: 0.8,
    minWidth: 70,
    headerAlign: "center",
    align: "center",
    renderCell: (params) =>
      `${Number(params.value || 0).toLocaleString("en-IN")}`,
  },
  {
    field: "attendance",
    headerName: "Attendance",
    flex: 0.7,
    minWidth: 70,
    headerAlign: "center",
    align: "center",
  },
  {
    field: "total",
    headerName: "Total",
    flex: 0.8,
    minWidth: 70,
    headerAlign: "center",
    align: "center",
    renderCell: (params) =>
      `${Number(params.value || 0).toLocaleString("en-IN")}`,
  },
  {
    field: "restaurantUpaad",
    headerName: "Rest. Upaad",
    flex: 0.8,
    minWidth: 70,
    headerAlign: "center",
    align: "center",
    renderCell: (params) =>
      `${Number(params.value || 0).toLocaleString("en-IN")}`,
  },
  {
    field: "officeUpaad",
    headerName: "Office Upaad",
    flex: 0.8,
    minWidth: 70,
    headerAlign: "center",
    align: "center",
    renderCell: (params) =>
      `${Number(params.value || 0).toLocaleString("en-IN")}`,
  },
  {
    field: "currentBalance",
    headerName: "Balance",
    flex: 0.8,
    minWidth: 70,
    headerAlign: "center",
    align: "center",
    renderCell: (params) =>
      `${Number(params.value || 0).toLocaleString("en-IN")}`,
  },
  {
    field: "salaryPaid",
    headerName: "Salary Paid?",
    flex: 0.8,
    minWidth: 80,
    headerAlign: "center",
    align: "center",
    renderCell: (params) => (
      <Chip
        label={params.value ? "Paid" : "Unpaid"}
        color={params.value ? "success" : "default"}
        size="small"
        variant={params.value ? "filled" : "outlined"}
      />
    ),
  },
  {
    // Informational only - not used in any total/balance calculation.
    field: "salaryAndOvertime",
    headerName: "Prev Month Salary and Overtime",
    flex: 1.2,
    minWidth: 90,
    headerAlign: "center",
    align: "center",
    renderCell: (params) =>
      `${Number(params.value || 0).toLocaleString("en-IN")}`,
  },
];

const StaffSalaryDashboard = () => {
  const dispatch = useAppDispatch();
  const { restStaff } = useAppSelector((state) => state.restStaff);
  const { loading: staffUpaadLoading, staffTotalUpaad } = useAppSelector(
    (state) => state.restEntry
  );
  const { loading: officeUpaadLoading, officeBookCategoryUpaad } =
    useAppSelector((state) => state.officeBook);
  const {
    loading: salaryLoading,
    salarySheets,
    salaryAndOvertime,
    salaryAndOvertimeLoading,
  } = useAppSelector((state) => state.staffSalary);
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [selectedName, setSelectedName] = useState(null);
  const [statusFilter, setStatusFilter] = useState("Active");
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
    dispatch(getRestStaff());
  }, [dispatch]);

  useEffect(() => {
    const formattedStartDate = startDate.format("DD-MM-YYYY");
    const formattedEndDate = endDate.format("DD-MM-YYYY");
    dispatch(getStaffUpaadByMonthRange(formattedStartDate, formattedEndDate));
    dispatch(
      getOfficeBookCategoryUpaadByMonthRange(
        formattedStartDate,
        formattedEndDate
      )
    );
    dispatch(getSalarySheetsByMonthRange(formattedStartDate, formattedEndDate));
    dispatch(
      getSalaryAndOvertimeByMonthRange(formattedStartDate, formattedEndDate)
    );
  }, [dispatch, startDate, endDate]);

  const staffStatusById = (restStaff || []).reduce((acc, staff) => {
    acc[staff._id?.toString()] = staff.staffStatus || "Active";
    return acc;
  }, {});

  const allRows = (salarySheets || []).flatMap((sheet) => {
    // Build the same "YYYY-MM" key both backends group by
    const monthKey = `${sheet.year}-${String(sheet.month).padStart(2, "0")}`;
    const staffMonthBucket = staffTotalUpaad?.[monthKey] || {};
    const officeMonthBucket = officeBookCategoryUpaad?.[monthKey] || {};
    const salaryAndOvertimeMonthBucket = salaryAndOvertime?.[monthKey] || {};

    return (sheet.rows || []).map((row) => {
      const restaurantUpaad = staffMonthBucket[row.staffId?.toString()] || 0;
      const officeUpaad = officeMonthBucket[row.staffId?.toString()] || 0;
      const total = Number(row.perDayPay || 0) * Number(row.attendance || 0);

      return {
        ...row,
        id: `${sheet._id}-${row._id}`,
        month: `${dayjs()
          .month(sheet.month - 1)
          .format("MMMM")} ${sheet.year}`,
        // numeric key purely for sorting months ascending; not for display
        monthSortKey: sheet.year * 12 + sheet.month,
        total,
        restaurantUpaad,
        officeUpaad,
        currentBalance: total - restaurantUpaad - officeUpaad,
        salaryPaid: Boolean(row.salaryPaid),
        // Informational only - not persisted, not used in any total/balance calculation.
        salaryAndOvertime:
          Number(salaryAndOvertimeMonthBucket[row.staffId?.toString()]) || 0,
        staffStatus: staffStatusById[row.staffId?.toString()] || "Active",
      };
    });
  });

  // Group rows by staff (fullname), then sort months ascending inside each group,
  // and keep each staff's rows contiguous in the final list.
  const sortedRows = [...allRows].sort((a, b) => {
    const nameCompare = (a.fullname || "").localeCompare(b.fullname || "");
    if (nameCompare !== 0) return nameCompare;
    return a.monthSortKey - b.monthSortKey;
  });

  const statusFilteredRows =
    statusFilter === "All"
      ? sortedRows
      : sortedRows.filter((row) => row.staffStatus === statusFilter);

  const nameOptions = [
    ...new Set(statusFilteredRows.map((row) => row.fullname)),
  ].filter(Boolean);

  const rows = selectedName
    ? statusFilteredRows.filter((row) => row.fullname === selectedName)
    : statusFilteredRows;

  const summary = rows.reduce(
    (acc, row) => {
      acc.totalSalary += row.total || 0;
      acc.totalRestUpaad += row.restaurantUpaad || 0;
      acc.totalOfficeUpaad += row.officeUpaad || 0;
      acc.totalBalance += row.currentBalance || 0;
      acc.totalSalaryAndOvertime += row.salaryAndOvertime || 0;
      return acc;
    },
    {
      totalSalary: 0,
      totalRestUpaad: 0,
      totalOfficeUpaad: 0,
      totalBalance: 0,
      totalSalaryAndOvertime: 0,
    }
  );

  const totalsRow = {
    id: "totals",
    month: "Total",
    fullname: "Total",
    perDayPay: "Total",
    attendance: "Total",
    total: summary.totalSalary,
    restaurantUpaad: summary.totalRestUpaad,
    officeUpaad: summary.totalOfficeUpaad,
    currentBalance: summary.totalBalance,
    salaryPaid: false,
    salaryAndOvertime: summary.totalSalaryAndOvertime,
  };

  const rowsWithTotals = [...rows, totalsRow];

  const headerMap = {
    month: "Month",
    fullname: "Staff Name",
    perDayPay: "Per Day Pay",
    attendance: "Attendance",
    total: "Total",
    restaurantUpaad: "Rest. Upaad",
    officeUpaad: "Office Upaad",
    currentBalance: "Balance",
    salaryPaid: "Salary Paid?",
    salaryAndOvertime: "Prev Month Salary and Overtime",
  };

  const handleExportToExcel = () => {
    if (!Array.isArray(rows) || rows.length === 0) {
      toast.error("No data available to export for selected date range.");
      return;
    }

    const fileName = `${
      fileNameRef.current?.innerText || "Staff Salary Dashboard"
    } - ${startDate.format("DD-MM-YYYY")} to ${endDate.format(
      "DD-MM-YYYY"
    )}.xlsx`;

    const exportData = rowsWithTotals.map((item) => {
      const transformed = {};
      Object.keys(headerMap).forEach((key) => {
        let value = item[key];
        if (key === "salaryPaid") {
          value =
            typeof value === "boolean" ? (value ? "Paid" : "Unpaid") : value;
        }
        transformed[headerMap[key]] = value;
      });
      return transformed;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Staff Salary");

    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Box
      sx={{
        py: 2,
        px: { xs: 2, md: 3 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <Box sx={{ alignItems: "center", py: 3 }}>
        <Typography
          ref={fileNameRef}
          variant="h5"
          fontWeight={600}
          color="text.primary"
        >
          Staff Salary Dashboard
        </Typography>
      </Box>

      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        mb={2}
        flexWrap="wrap"
      >
        <Typography variant="subtitle2" fontWeight={500} color="text.secondary">
          Select Date Range:
        </Typography>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <DatePicker
            views={["year", "month", "day"]}
            value={startDate}
            onChange={handleStartDateChange}
            format="DD-MM-YYYY"
            slotProps={{ textField: { size: "small" } }}
          />
          <Typography>-</Typography>
          <DatePicker
            views={["year", "month", "day"]}
            value={endDate}
            onChange={handleEndDateChange}
            format="DD-MM-YYYY"
            slotProps={{ textField: { size: "small" } }}
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
      </Stack>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        mb={2}
        flex
        gap={1}
        flexWrap={"wrap"}
      >
        <TextField
          select
          label="Staff Status"
          size="small"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setSelectedName(null);
          }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="Active">Active</MenuItem>
          <MenuItem value="Inactive">Inactive</MenuItem>
          <MenuItem value="All">All</MenuItem>
        </TextField>

        <Autocomplete
          options={nameOptions}
          value={selectedName}
          onChange={(event, newValue) => setSelectedName(newValue)}
          sx={{ minWidth: 220 }}
          renderInput={(params) => (
            <TextField {...params} label="Filter by Name" size="small" />
          )}
        />

        <Button
          variant="outlined"
          color="primary"
          onClick={handleExportToExcel}
        >
          Export to Excel
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
        <Box
          sx={{
            p: 2,
            minWidth: 180,
            border: "1px solid #ddd",
            borderRadius: 2,
          }}
        >
          <Typography variant="body2">Total Salary</Typography>
          <Typography variant="h6">
            {summary.totalSalary.toLocaleString("en-IN")}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            minWidth: 180,
            border: "1px solid #ddd",
            borderRadius: 2,
          }}
        >
          <Typography variant="body2">Restaurant Upaad</Typography>
          <Typography variant="h6">
            {summary.totalRestUpaad.toLocaleString("en-IN")}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            minWidth: 180,
            border: "1px solid #ddd",
            borderRadius: 2,
          }}
        >
          <Typography variant="body2">Office Upaad</Typography>
          <Typography variant="h6">
            {summary.totalOfficeUpaad.toLocaleString("en-IN")}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            minWidth: 180,
            border: "1px solid #ddd",
            borderRadius: 2,
          }}
        >
          <Typography variant="body2">Net Balance</Typography>
          <Typography variant="h6">
            {summary.totalBalance.toLocaleString("en-IN")}
          </Typography>
        </Box>
      </Stack>

      {rows.length > 0 ? (
        <DataGrid
          loading={
            staffUpaadLoading ||
            officeUpaadLoading ||
            salaryLoading ||
            salaryAndOvertimeLoading
          }
          rows={rowsWithTotals}
          columns={columns}
          hideFooter
          disableColumnMenu
          columnHeaderHeight={56}
          WebkitFontSmoothing="auto"
          letterSpacing="normal"
          sx={{
            mt: 2,
            width: "100%",
            maxWidth: "100%",
            "& .MuiDataGrid-main": { overflow: "hidden" },
            "& .MuiDataGrid-virtualScroller": { overflowX: "hidden" },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold",
              whiteSpace: "normal",
              lineHeight: 1.2,
              textAlign: "center",
            },
            "& .MuiDataGrid-cell:hover": { color: "primary.main" },
            "& .MuiDataGrid-columnHeader, .MuiDataGrid-cell": {
              border: "1px solid #f0f0f0",
            },
            "& .MuiDataGrid-row:last-child": {
              fontWeight: "bold",
            },
          }}
        />
      ) : (
        <Typography variant="subtitle1" color="text.secondary" mt={2}>
          No salary sheet found for {startDate.format("DD-MM-YYYY")} to{" "}
          {endDate.format("DD-MM-YYYY")}
        </Typography>
      )}
    </Box>
  );
};

export default StaffSalaryDashboard;
