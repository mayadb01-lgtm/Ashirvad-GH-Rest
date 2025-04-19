import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../redux/hooks";
// DayJs
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
import { LineChart, BarChart, PieChart } from "@mui/x-charts";
import { getRestEntriesByDateRange } from "../../redux/actions/restEntryAction";

const RestHome = () => {
  const dispatch = useAppDispatch();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { loading, restEntries } = useAppSelector((state) => state.restEntry);
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [showPercentage, setShowPercentage] = useState(true);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    dispatch(
      getRestEntriesByDateRange(
        startDate.format("DD-MM-YYYY"),
        endDate.format("DD-MM-YYYY")
      )
    );
  }, [dispatch, endDate, startDate]);

  const handleStartDateChange = useCallback((newDate) => {
    if (newDate) setStartDate(newDate);
  }, []);

  const handleEndDateChange = useCallback((newDate) => {
    if (newDate) setEndDate(newDate);
  }, []);

  const chartBoxStyle = {
    width: "100%",
    height: "100%",
    bgcolor: "#fff",
    borderRadius: 3,
    boxShadow: 3,
    p: 3,
  };

  // Chart 1: Expenses Report

  const pieChartExpensesCategoryData = useMemo(() => {
    if (!Array.isArray(restEntries) || restEntries.length === 0) return [];

    const categoryTotals = {};

    restEntries.forEach((entry) => {
      entry?.expenses?.forEach((expense) => {
        const { categoryName, amount = 0 } = expense || {};
        if (!categoryName) return;

        if (categoryTotals[categoryName]) {
          categoryTotals[categoryName] += amount;
        } else {
          categoryTotals[categoryName] = amount;
        }
      });
    });

    const totalAmount = Object.values(categoryTotals).reduce(
      (sum, amount) => sum + amount,
      0
    );

    return Object.entries(categoryTotals).map(([categoryName, amount]) => ({
      id: categoryName,
      label: categoryName,
      value: amount,
      percentage:
        totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(2) : "0.00",
    }));
  }, [restEntries]);

  const totalExpensesAmount = useMemo(() => {
    return pieChartExpensesCategoryData.reduce(
      (sum, item) => sum + item.value,
      0
    );
  }, [pieChartExpensesCategoryData]);

  // Chart 2: Payment Method Pie Chart

  const pieChartPaymentMethodData = useMemo(() => {
    if (!Array.isArray(restEntries) || restEntries.length === 0) return [];

    const paymentTotals = {
      Card: 0,
      Cash: 0,
      PP: 0,
    };

    restEntries.forEach((entry) => {
      const { totalCard, totalCash, totalPP, grandTotal } = entry;

      if (totalCard) paymentTotals.Card += totalCard;
      if (totalCash) paymentTotals.Cash += totalCash;
      if (totalPP) paymentTotals.PP += totalPP;
    });

    const totalAmount =
      paymentTotals.Card + paymentTotals.Cash + paymentTotals.PP;

    return Object.entries(paymentTotals).map(([method, amount]) => ({
      id: method,
      label: method,
      value: amount,
      percentage:
        totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(2) : "0.00",
    }));
  }, [restEntries]);

  const totalPaymentAmount = useMemo(() => {
    return pieChartPaymentMethodData.reduce((sum, item) => sum + item.value, 0);
  }, [pieChartPaymentMethodData]);

  return (
    <Box
      sx={{
        px: { xs: 2, md: 2 },
        py: 2,
        bgcolor: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <Typography variant="h5" fontWeight={700} textAlign="center" mb={2}>
        🍽️ Restaurant Dashboard
      </Typography>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="center"
        mb={2}
        width={"100%"}
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

        {/* Toggle Percentage / Amount */}
        <FormControlLabel
          control={
            <Checkbox
              checked={showPercentage}
              onChange={() => setShowPercentage((prev) => !prev)}
              color="primary"
            />
          }
          label="Show Percentage"
          sx={{
            ".MuiFormControlLabel-label": { fontWeight: 500 },
          }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={showDetails}
              onChange={() => setShowDetails((prev) => !prev)}
              color="primary"
            />
          }
          label="Detailed View"
          sx={{
            ".MuiFormControlLabel-label": { fontWeight: 500 },
          }}
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
          {/* Chart 1 - Pie Chart = Expenses Report*/}
          <Stack
            direction={isFullScreen ? "column" : "row"}
            spacing={2}
            alignItems="flex-start"
            mb={2}
            display="flex"
            width={"100%"}
          >
            <Grid item xs={12} md={12} sx={chartBoxStyle}>
              <Box>
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  justifyContent={"space-between"}
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
                {/* Pie Chart */}
                <PieChart
                  height={isFullScreen ? 500 : 300}
                  width={isFullScreen ? 1000 : 600}
                  series={[
                    {
                      data: pieChartExpensesCategoryData.map((item, index) => ({
                        ...item,
                        color: `hsl(${(index * 45) % 360}, 70%, 50%)`,
                      })),
                      arcLabel: (item) =>
                        showPercentage
                          ? `${item.percentage}%`
                          : `₹${item.value.toFixed(0)}`,
                    },
                  ]}
                />
                <Stack
                  direction="column"
                  spacing={1}
                  mt={2}
                  display={showDetails ? "block" : "none"}
                >
                  {pieChartExpensesCategoryData.map((item, index) => (
                    <Box
                      key={item.id}
                      display="flex"
                      alignItems="center"
                      gap={1}
                    >
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          backgroundColor: `hsl(${(index * 45) % 360}, 70%, 50%)`,
                        }}
                      />
                      <Typography variant="body2">
                        {item.label}: ₹{item.value.toFixed(2)} (
                        {item.percentage}%)
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Grid>

            <Grid item xs={12} md={12} sx={chartBoxStyle}>
              <Box>
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  justifyContent={"space-between"}
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    gutterBottom
                    color="primary"
                  >
                    💳 Payment Method Distribution
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    gutterBottom
                    color="primary"
                  >
                    {/* totalPaymentAmount */}
                    Total Payment: ₹{totalPaymentAmount.toFixed(2)}
                  </Typography>
                </Stack>
              </Box>
              <PieChart
                height={isFullScreen ? 500 : 300}
                width={isFullScreen ? 1000 : 600}
                series={[
                  {
                    data: pieChartPaymentMethodData.map((item, index) => ({
                      ...item,
                      color: `hsl(${(index * 45) % 360}, 70%, 50%)`,
                    })),
                    arcLabel: (item) =>
                      showPercentage
                        ? `${item.percentage}%`
                        : `₹${item.value.toFixed(0)}`,
                  },
                ]}
              />
              <Stack
                direction="column"
                spacing={1}
                mt={2}
                display={showDetails ? "block" : "none"}
              >
                {pieChartPaymentMethodData.map((item, index) => (
                  <Box key={item.id} display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        backgroundColor: `hsl(${(index * 45) % 360}, 70%, 50%)`,
                      }}
                    />
                    <Typography variant="body2">
                      {item.label}: ₹{item.value.toFixed(2)} ({item.percentage}
                      %)
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Grid>
          </Stack>
          <Stack
            direction={isFullScreen ? "column" : "row"}
            spacing={isFullScreen ? 4 : 2}
            alignItems="center"
            mb={isFullScreen ? 4 : 2}
            display="flex"
            width={"100%"}
          >
            <Grid item xs={12} md={12} sx={chartBoxStyle}>
              <Box>
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  gutterBottom
                  color="primary"
                  marginBlock={2}
                >
                  Upaad 
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={12} sx={chartBoxStyle}>
              <Box>
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  gutterBottom
                  color="primary"
                >
                  Sales
                </Typography>
              </Box>
            </Grid>
          </Stack>
        </Grid>
      )}
    </Box>
  );
};

export default RestHome;
