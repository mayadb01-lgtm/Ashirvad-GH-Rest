import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../redux/hooks";
import { DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
dayjs.locale("en-gb");
import {
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { getRestEntriesByDateRange } from "../../redux/actions/restEntryAction";
import { formatChartData } from "../charts/chartUtils";
import LineChartComponent from "../charts/LineChartComponent";
import PieChartComponent from "../charts/PieChartComponent";

const RestHome = () => {
  const dispatch = useAppDispatch();
  const { loading, restEntries } = useAppSelector((state) => state.restEntry);

  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    dispatch(
      getRestEntriesByDateRange(
        startDate.format("DD-MM-YYYY"),
        endDate.format("DD-MM-YYYY")
      )
    );
  }, [dispatch, startDate, endDate]);

  const handleStartDateChange = useCallback(
    (newDate) => newDate && setStartDate(newDate),
    []
  );
  const handleEndDateChange = useCallback(
    (newDate) => newDate && setEndDate(newDate),
    []
  );

  // Prepare - Chart 1 data = Expenses by category
  const pieChartExpensesCategoryData = useMemo(
    () =>
      restEntries?.length
        ? formatChartData(restEntries, "categoryExpenses")
        : [],
    [restEntries]
  );

  const totalExpensesAmount = pieChartExpensesCategoryData.reduce(
    (sum, entry) => sum + entry.value,
    0
  );

  // Prepare - Chart 2 data = Expenses by payment method
  const upaadLineChartData = useMemo(
    () => (restEntries?.length ? formatChartData(restEntries, "upaad") : []),
    [restEntries]
  );

  const totalUpaadAmount = upaadLineChartData.reduce(
    (sum, entry) => sum + entry.amount,
    0
  );

  // Prepare - Chart 3 data = Expenses by payment method
  const paymentMethodLineChartData = useMemo(
    () =>
      restEntries?.length ? formatChartData(restEntries, "paymentMethods") : [],
    [restEntries]
  );

  const totalPaymentMethodAmount = paymentMethodLineChartData.reduce(
    (sum, entry) => sum + entry.value,
    0
  );

  // Prepare - Chart 4 data = Sales Per Day
  const salesPerDayLineChartData = useMemo(
    () =>
      restEntries?.length ? formatChartData(restEntries, "salesPerDay") : [],
    [restEntries]
  );

  const totalSalesPerDayAmount = salesPerDayLineChartData.reduce(
    (sum, entry) => sum + entry.amount,
    0
  );

  const chartBoxStyle = {
    width: "100%",
    height: isFullScreen ? "80vh" : { xs: "320px", sm: "550px" },
    bgcolor: "#fff",
    borderRadius: 3,
    boxShadow: 3,
    p: 3,
  };

  return (
    <Box sx={{ px: 2, py: 2, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      <Typography variant="h5" fontWeight={700} textAlign="center" mb={3}>
        🍽️ Restaurant Dashboard
      </Typography>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="center"
        mb={3}
      >
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={handleStartDateChange}
            format="DD-MM-YYYY"
            slotProps={{ textField: { size: "small" } }}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={handleEndDateChange}
            format="DD-MM-YYYY"
            slotProps={{ textField: { size: "small" } }}
          />
        </LocalizationProvider>
        <FormControlLabel
          control={
            <Checkbox
              checked={isFullScreen}
              onChange={() => setIsFullScreen((prev) => !prev)}
            />
          }
          label="Full Screen Graph"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={showDetails}
              onChange={() => setShowDetails((prev) => !prev)}
            />
          }
          label="Detailed View"
        />
      </Stack>

      {loading ? (
        <Stack alignItems="center" mt={4}>
          <CircularProgress />
        </Stack>
      ) : restEntries.length === 0 ? (
        <Typography textAlign="center" mt={4}>
          No data available for selected range
        </Typography>
      ) : (
        <Grid
          container
          sx={{
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
          width={"100%"}
        >
          <Stack
            direction={isFullScreen ? "column" : "row"}
            spacing={2}
            alignItems="center"
            mb={2}
            display="flex"
            width={"100%"}
          >
            {/* Pie Chart - Expenses */}
            <Grid item xs={12} md={12} sx={chartBoxStyle}>
              <Box width="100%" height="100%">
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    gutterBottom
                    color="primary"
                  >
                    💸 Expenses Report
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    gutterBottom
                    color="primary"
                  >
                    Total Spent: ₹{totalExpensesAmount.toFixed(2)}
                  </Typography>
                </Stack>
                {pieChartExpensesCategoryData.length === 0 ? (
                  <Typography>No expense data available</Typography>
                ) : (
                  <PieChartComponent
                    data={pieChartExpensesCategoryData}
                    isFullScreen={isFullScreen}
                  />
                )}
              </Box>
            </Grid>

            {/* Line Chart - Upaad */}
            <Grid item xs={12} md={12} sx={chartBoxStyle}>
              <Box width="100%" height="100%">
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    gutterBottom
                    color="primary"
                  >
                    📈 Upaad Report
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    gutterBottom
                    color="primary"
                  >
                    Total Spent: ₹{totalUpaadAmount.toFixed(2)}
                  </Typography>
                </Stack>

                {upaadLineChartData.length === 0 ? (
                  <Typography>No upaad data available</Typography>
                ) : (
                  <LineChartComponent
                    data={upaadLineChartData}
                    isFullScreen={isFullScreen}
                  />
                )}
              </Box>
            </Grid>
          </Stack>
          <Stack
            direction={isFullScreen ? "column" : "row"}
            spacing={2}
            alignItems="center"
            mb={2}
            display="flex"
            width={"100%"}
          >
            {/* Pie Chart - Payment Method */}
            <Grid item xs={12} md={12} sx={chartBoxStyle}>
              <Box width="100%" height="100%">
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    gutterBottom
                    color="primary"
                  >
                    💳 Payment Method
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    gutterBottom
                    color="primary"
                  >
                    Total Spent: ₹{totalPaymentMethodAmount.toFixed(2)}
                  </Typography>
                </Stack>
                {pieChartExpensesCategoryData.length === 0 ? (
                  <Typography>No expense data available</Typography>
                ) : (
                  <PieChartComponent
                    data={paymentMethodLineChartData}
                    isFullScreen={isFullScreen}
                  />
                )}
              </Box>
            </Grid>

            {/* Line Chart - Sales */}
            <Grid item xs={12} md={12} sx={chartBoxStyle}>
              <Box width="100%" height="100%">
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    gutterBottom
                    color="primary"
                  >
                    💰 Sales Report
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    gutterBottom
                    color="primary"
                  >
                    Total Spent: ₹{totalSalesPerDayAmount.toFixed(2)}
                  </Typography>
                </Stack>

                {upaadLineChartData.length === 0 ? (
                  <Typography>No sales data available</Typography>
                ) : (
                  <LineChartComponent
                    data={salesPerDayLineChartData}
                    isFullScreen={isFullScreen}
                  />
                )}
              </Box>
            </Grid>
          </Stack>
        </Grid>
      )}
    </Box>
  );
};

export default RestHome;
