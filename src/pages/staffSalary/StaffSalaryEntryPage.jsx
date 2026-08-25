import { useEffect, useMemo, useState } from "react";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import Grid from "@mui/material/Grid2";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import SkipPreviousRoundedIcon from "@mui/icons-material/SkipPreviousRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import ModernLoader from "../../utils/util";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { getRestStaff } from "../../redux/actions/restStaffAction";
import { getStaffUpaadByMonth } from "../../redux/actions/restEntryAction";
import { getOfficeBookCategoryUpaadByMonthAndYear } from "../../redux/actions/officeBookAction";
import {
  getSalarySheet,
  getPreviousMonthSalarySheet,
  createSalarySheet,
  updateSalarySheet,
  deleteSalarySheet,
  getSalaryAndOvertimeByMonthRange,
} from "../../redux/actions/staffSalaryAction";

dayjs.locale("en-gb");

const tableColumns = [
  { label: "No", width: "4%", align: "center" },
  { label: "Staff Name", width: "12%", align: "left" },
  { label: "Per Day Pay", width: "8%", align: "center" },
  { label: "Attendance", width: "7%", align: "center" },
  { label: "Total", width: "8%", align: "center" },
  { label: "Rest Upaad", width: "8%", align: "center" },
  { label: "Office Upaad", width: "8%", align: "center" },
  { label: "Current Balance", width: "9%", align: "center" },
  { label: "Salary Paid?", width: "6%", align: "center" },
  { label: "Prev Month Salary", width: "10%", align: "center" },
  { label: "Prev Month Salary and Overtime", width: "10%", align: "center" },
];

const buildDraftRows = (
  staff,
  staffTotalUpaad = {},
  officeBookCategoryUpaad = {},
  salaryAndOvertime = {}
) =>
  staff.map((s) => {
    const restaurantUpaad = staffTotalUpaad?.[s._id?.toString()] || 0;
    const officeUpaad = officeBookCategoryUpaad?.[s._id?.toString()] || 0;
    const total = Number(s.perDayPay || 0) * Number(s.attendance || 0);
    const currentBalance = total - restaurantUpaad - officeUpaad;

    return {
      staffId: s._id,
      fullname: s.fullname,
      perDayPay: s.perDayPay || 0,
      attendance: 0,
      total,
      restaurantUpaad,
      officeUpaad,
      currentBalance,
      salaryPaid: false,
      // Informational only - not persisted, not used in any total/balance calculation.
      salaryAndOvertime: Number(salaryAndOvertime?.[s._id?.toString()]) || 0,
    };
  });

const StaffSalaryEntryPage = () => {
  const dispatch = useAppDispatch();
  const { loading: staffLoading, restStaff } = useAppSelector(
    (state) => state.restStaff
  );
  const { loading: staffUpaadLoading, staffTotalUpaad } = useAppSelector(
    (state) => state.restEntry
  );
  const { loading: officeBookCategoryUpaadLoading, officeBookCategoryUpaad } =
    useAppSelector((state) => state.officeBook);
  const {
    loading: salaryLoading,
    salarySheet,
    salarySheetNotFound,
    previousSalarySheet,
    salaryAndOvertime,
  } = useAppSelector((state) => state.staffSalary);

  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("Active");

  const isNew = salarySheetNotFound;

  const month = selectedMonth.month() + 1;
  const year = selectedMonth.year();

  const previousMonthDate = selectedMonth.subtract(1, "month");
  const previousMonth = previousMonthDate.month() + 1;
  const previousYear = previousMonthDate.year();

  // "YYYY-MM" key matching the shape returned by getSalaryAndOvertimeByMonthRange
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const salaryAndOvertimeMonthBucket = salaryAndOvertime?.[monthKey] || {};

  useEffect(() => {
    dispatch(getRestStaff());
    dispatch(getStaffUpaadByMonth(month, year));
    dispatch(getOfficeBookCategoryUpaadByMonthAndYear(month, year));
    dispatch(getSalarySheet(month, year));
    dispatch(getPreviousMonthSalarySheet(previousMonth, previousYear));
    dispatch(
      getSalaryAndOvertimeByMonthRange(
        selectedMonth.startOf("month").format("DD-MM-YYYY"),
        selectedMonth.endOf("month").format("DD-MM-YYYY")
      )
    );
  }, [dispatch, month, year, previousMonth, previousYear, selectedMonth]);

  // Map of staffId -> amount paid last month (only for staff whose "Salary Paid?"
  // checkbox was checked in the previous month's sheet)
  const previousMonthPaidAmountByStaffId = useMemo(() => {
    const map = {};
    (previousSalarySheet?.rows || []).forEach((row) => {
      if (row.salaryPaid) {
        map[row.staffId?.toString()] = row.salaryPaidAmount ?? 0;
      }
    });
    return map;
  }, [previousSalarySheet]);

  const getPreviousMonthPaidAmount = (staffId) => {
    const amount = previousMonthPaidAmountByStaffId[staffId?.toString()];
    return amount === undefined ? "Not Paid" : amount;
  };

  const staffStatusById = useMemo(() => {
    const map = {};
    (restStaff || []).forEach((s) => {
      map[s._id?.toString()] = s.staffStatus || "Active";
    });
    return map;
  }, [restStaff]);

  const filteredRows = useMemo(() => {
    const rowsWithIndex = rows.map((row, index) => ({ row, index }));
    if (statusFilter === "All") return rowsWithIndex;
    return rowsWithIndex.filter(
      ({ row }) =>
        (staffStatusById[row.staffId?.toString()] || "Active") === statusFilter
    );
  }, [rows, statusFilter, staffStatusById]);

  useEffect(() => {
    if (salarySheet && salarySheet.rows?.length > 0) {
      const allRows = salarySheet.rows.map((row) => {
        const restaurantUpaad = staffTotalUpaad?.[row.staffId?.toString()] || 0;
        const officeUpaad =
          officeBookCategoryUpaad?.[row.staffId?.toString()] || 0;
        const total = Number(row.perDayPay || 0) * Number(row.attendance || 0);

        return {
          staffId: row.staffId,
          fullname: row.fullname,
          perDayPay: row.perDayPay || 0,
          attendance: row.attendance || 0,
          total,
          restaurantUpaad,
          officeUpaad,
          currentBalance: total - restaurantUpaad - officeUpaad,
          salaryPaid: Boolean(row.salaryPaid),
          // Informational only - not persisted, not used in any total/balance calculation.
          salaryAndOvertime:
            Number(salaryAndOvertimeMonthBucket[row.staffId?.toString()]) || 0,
        };
      });

      setRows(allRows);
    } else {
      setRows([]);
    }
  }, [
    salarySheet,
    staffTotalUpaad,
    officeBookCategoryUpaad,
    salaryAndOvertimeMonthBucket,
  ]);

  useEffect(() => {
    if (
      isNew &&
      restStaff?.length > 0 &&
      staffTotalUpaad &&
      officeBookCategoryUpaad
    ) {
      setRows(
        buildDraftRows(
          restStaff,
          staffTotalUpaad,
          officeBookCategoryUpaad,
          salaryAndOvertimeMonthBucket
        )
      );
    }
  }, [
    isNew,
    restStaff,
    staffTotalUpaad,
    officeBookCategoryUpaad,
    salaryAndOvertimeMonthBucket,
  ]);

  const resetForm = () => {
    setRows(
      buildDraftRows(
        restStaff,
        staffTotalUpaad,
        officeBookCategoryUpaad,
        salaryAndOvertimeMonthBucket
      )
    );
  };

  const handleRowChange = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;

        const updatedRow = {
          ...row,
          [field]: value,
        };

        updatedRow.total =
          Number(updatedRow.perDayPay || 0) *
          Number(updatedRow.attendance || 0);

        updatedRow.currentBalance =
          updatedRow.total -
          Number(updatedRow.restaurantUpaad || 0) -
          Number(updatedRow.officeUpaad || 0);

        return updatedRow;
      })
    );
  };

  // Create
  const handleCreate = () => {
    const confirmSubmit = window.confirm(
      `Are you sure you want to create salary sheet for ${selectedMonth.format("MMMM YYYY")}?`
    );
    if (!confirmSubmit) return;
    const editableRows = rows.map(
      ({
        staffId,
        fullname,
        perDayPay,
        attendance,
        salaryPaid,
        currentBalance,
      }) => ({
        staffId,
        fullname,
        perDayPay,
        attendance,
        salaryPaid,
        salaryPaidAmount: currentBalance || 0,
      })
    );
    dispatch(
      createSalarySheet({ month, year, rows: editableRows, remarks: "" })
    );
  };

  // Update
  const handleUpdate = () => {
    const confirmSubmit = window.confirm(
      `Are you sure you want to update salary sheet for ${selectedMonth.format("MMMM YYYY")}?`
    );
    if (!confirmSubmit) return;
    const editableRows = rows.map(
      ({
        staffId,
        fullname,
        perDayPay,
        attendance,
        salaryPaid,
        currentBalance,
      }) => ({
        staffId,
        fullname,
        perDayPay,
        attendance,
        salaryPaid,
        salaryPaidAmount: currentBalance || 0,
      })
    );
    dispatch(
      updateSalarySheet(month, year, { rows: editableRows, remarks: "" })
    );
  };

  // Delete
  const handleDelete = () => {
    const confirmSubmit = window.confirm(
      `Are you sure you want to delete salary sheet for ${selectedMonth.format("MMMM YYYY")}?`
    );
    if (!confirmSubmit) return;
    dispatch(deleteSalarySheet(month, year));
    resetForm();
  };

  const goToPreviousMonth = () => {
    setSelectedMonth(selectedMonth.subtract(1, "month"));
  };

  const goToNextMonth = () => {
    setSelectedMonth(selectedMonth.add(1, "month"));
  };

  if (
    salaryLoading ||
    staffUpaadLoading ||
    officeBookCategoryUpaadLoading ||
    staffLoading
  )
    return <ModernLoader />;

  return (
    <>
      <Grid
        container
        spacing={1}
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ width: "100%", padding: { xs: "8px 12px", md: "8px 24px" } }}
      >
        {/* Controls: Title + Month Picker + Buttons */}
        <Grid size={12}>
          <Grid container spacing={3}>
            {/* Title + Month Picker */}
            <Grid size={12}>
              <Grid
                container
                spacing={2}
                alignItems="center"
                sx={{ flexWrap: "wrap", gap: 1 }}
              >
                <Grid>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ minWidth: "160px" }}
                  >
                    Staff Salary Entry
                  </Typography>
                </Grid>
                <Grid>
                  <LocalizationProvider
                    dateAdapter={AdapterDayjs}
                    adapterLocale="en-gb"
                  >
                    <DatePicker
                      views={["year", "month"]}
                      value={selectedMonth}
                      onChange={(newDate) => {
                        if (newDate) setSelectedMonth(newDate);
                      }}
                      format="MMMM YYYY"
                      slots={{
                        textField: (params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                            error={false}
                            helperText={null}
                          />
                        ),
                      }}
                      sx={{
                        "& .MuiInputBase-input": { padding: "8.5px 14px" },
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                {/* Previous and Next Month Button */}
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
                      onClick={goToPreviousMonth}
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
                      onClick={goToNextMonth}
                      sx={{
                        minWidth: "40px",
                        padding: "4px",
                      }}
                    >
                      <SkipNextRoundedIcon fontSize="small" />
                    </Button>
                  </Stack>
                </Box>
                <Grid>
                  <TextField
                    select
                    label="Staff Status"
                    size="small"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{ minWidth: 150 }}
                  >
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                    <MenuItem value="All">All</MenuItem>
                  </TextField>
                </Grid>
                {isNew && (
                  <Grid>
                    <Chip
                      label="New Salary Sheet"
                      color="warning"
                      size="small"
                      variant="outlined"
                    />
                  </Grid>
                )}
              </Grid>
            </Grid>

            {/* Action Buttons */}
            <Grid size={12}>
              <Grid container spacing={2}>
                <Grid>
                  <Button
                    variant="contained"
                    color="error"
                    sx={{ "&:hover": { backgroundColor: "#e57373" } }}
                    onClick={resetForm}
                  >
                    Reset
                  </Button>
                </Grid>

                {!isNew ? (
                  <>
                    <Grid>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={handleUpdate}
                        sx={{ "&:hover": { backgroundColor: "#ab47bc" } }}
                      >
                        Update
                      </Button>
                    </Grid>
                    <Grid>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={handleDelete}
                      >
                        Delete
                      </Button>
                    </Grid>
                  </>
                ) : (
                  <Grid>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleCreate}
                      sx={{ "&:hover": { backgroundColor: "#64b5f6" } }}
                    >
                      Create
                    </Button>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Table */}
        <Grid size={12}>
          <Box sx={{ width: "100%" }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 500,
                fontSize: "18px",
                backgroundColor: isNew ? "#fff3e0" : "#e8e2fd",
                padding: "4px 16px",
                borderRadius: "4px",
                width: "fit-content",
                mb: 1,
              }}
            >
              {selectedMonth.format("MMMM YYYY")}
            </Typography>

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{
                width: "100%",
                boxShadow: 1,
                borderRadius: "8px",
                overflowX: "hidden",
              }}
            >
              <Table
                stickyHeader
                size="small"
                sx={{
                  width: "100%",
                  tableLayout: "fixed",
                  "& .MuiTableCell-root": {
                    borderRight: "1px solid",
                    borderColor: "divider",
                    px: 0.5,
                    overflow: "hidden",
                  },
                  "& .MuiTableCell-root:last-of-type": {
                    borderRight: "none",
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    {tableColumns.map((col) => (
                      <TableCell
                        key={col.label}
                        align={col.align}
                        sx={{
                          width: col.width,
                          fontWeight: 700,
                          fontSize: "12px",
                          whiteSpace: "normal",
                          lineHeight: 1.2,
                          wordBreak: "break-word",
                          backgroundColor: "#f5f3fc",
                          color: "text.primary",
                        }}
                      >
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={tableColumns.length} align="center">
                        No staff rows found.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredRows.map(({ row, index: rowIndex }, index) => (
                    <TableRow
                      key={row._id ?? rowIndex}
                      sx={{
                        "&:nth-of-type(odd)": { backgroundColor: "#fafafa" },
                        "&:hover": { backgroundColor: "#f0edfa" },
                      }}
                    >
                      <TableCell align="center">{index + 1}</TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={row.fullname}
                      >
                        {row.fullname}
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          variant="outlined"
                          type="number"
                          size="small"
                          value={row.perDayPay}
                          onChange={(e) =>
                            handleRowChange(
                              rowIndex,
                              "perDayPay",
                              Number(e.target.value)
                            )
                          }
                          fullWidth
                          inputProps={{ style: { textAlign: "center" } }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          variant="outlined"
                          type="number"
                          size="small"
                          value={row.attendance}
                          error={row.attendance > 31}
                          helperText={
                            row.attendance > 31 ? "Max 31 days allowed" : ""
                          }
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            if (value > 31) {
                              e.target.value = 31;
                            }
                            handleRowChange(rowIndex, "attendance", value);
                          }}
                          fullWidth
                          inputProps={{ style: { textAlign: "center" } }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          variant="outlined"
                          type="number"
                          size="small"
                          value={row.total || 0}
                          disabled
                          fullWidth
                          inputProps={{ style: { textAlign: "center" } }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          variant="outlined"
                          type="number"
                          size="small"
                          value={row.restaurantUpaad}
                          disabled
                          fullWidth
                          inputProps={{ style: { textAlign: "center" } }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          variant="outlined"
                          type="number"
                          size="small"
                          value={row.officeUpaad}
                          disabled
                          fullWidth
                          inputProps={{ style: { textAlign: "center" } }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          variant="outlined"
                          type="number"
                          size="small"
                          value={row.currentBalance || 0}
                          disabled
                          fullWidth
                          inputProps={{ style: { textAlign: "center" } }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Checkbox
                          checked={Boolean(row.salaryPaid)}
                          onChange={(e) =>
                            handleRowChange(
                              rowIndex,
                              "salaryPaid",
                              e.target.checked
                            )
                          }
                          color="success"
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {(() => {
                          const previousAmount = getPreviousMonthPaidAmount(
                            row.staffId
                          );
                          return previousAmount === "Not Paid" ? (
                            <Typography variant="body2" color="text.disabled">
                              Not Paid
                            </Typography>
                          ) : (
                            <Typography
                              variant="body2"
                              color="success.main"
                              fontWeight={600}
                            >
                              {previousAmount}
                            </Typography>
                          );
                        })()}
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          variant="outlined"
                          type="number"
                          size="small"
                          value={row.salaryAndOvertime || 0}
                          disabled
                          fullWidth
                          inputProps={{ style: { textAlign: "center" } }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export default StaffSalaryEntryPage;
