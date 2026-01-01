import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Stack,
  TextField,
  Paper,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import dayjs from "dayjs";
import { getRestEntriesByDateRange } from "../../redux/actions/restEntryAction";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  Area,
  ComposedChart,
} from "recharts";
import { TrendingUp, TrendingDown, ShowChart } from "@mui/icons-material";

dayjs.locale("en-gb");

const RestSalesGoalDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, restEntries } = useAppSelector((state) => state.restEntry);
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [viewMode, setViewMode] = useState("auto");

  const [yearlyGoal, setYearlyGoal] = useState(() => {
    const saved = localStorage.getItem("rest_yearly_sales_goal");
    return saved ? parseFloat(saved) : 0;
  });

  useEffect(() => {
    dispatch(
      getRestEntriesByDateRange(
        startDate.format("DD-MM-YYYY"),
        endDate.format("DD-MM-YYYY")
      )
    );
  }, [dispatch, startDate, endDate]);

  useEffect(() => {
    if (yearlyGoal > 0) {
      localStorage.setItem("rest_yearly_sales_goal", yearlyGoal.toString());
    }
  }, [yearlyGoal]);

  const handleStartDateChange = useCallback((newDate) => {
    if (newDate) setStartDate(newDate);
  }, []);

  const handleEndDateChange = useCallback((newDate) => {
    if (newDate) setEndDate(newDate);
  }, []);

  const handleYearlyGoalChange = useCallback((e) => {
    const value = parseFloat(e.target.value) || 0;
    if (value >= 0) {
      setYearlyGoal(value);
    }
  }, []);

  const monthlyGoal = useMemo(() => yearlyGoal / 12, [yearlyGoal]);

  const formatIndianCurrency = useCallback((amount) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(2)} K`;
    }
    return `₹${amount.toFixed(0)}`;
  }, []);

  // Process actual sales data
  const actualSalesData = useMemo(() => {
    if (!restEntries || restEntries.length === 0) return [];

    const dateMap = new Map();

    restEntries.forEach((entry) => {
      const date = entry.createDate;
      const total = entry.grandTotal;

      if (dateMap.has(date)) {
        dateMap.set(date, dateMap.get(date) + total);
      } else {
        dateMap.set(date, total);
      }
    });

    const sortedData = Array.from(dateMap.entries())
      .map(([date, amount]) => ({
        date: dayjs(date, "DD-MM-YYYY"),
        amount,
      }))
      .sort((a, b) => a.date.valueOf() - b.date.valueOf());

    return sortedData;
  }, [restEntries]);

  // Determine effective view mode
  const effectiveViewMode = useMemo(() => {
    if (viewMode !== "auto") return viewMode;

    const days = endDate.diff(startDate, "day") + 1;
    if (days <= 31) return "daily";
    if (days <= 180) return "weekly";
    return "monthly";
  }, [viewMode, startDate, endDate]);

  // Generate date range labels
  const dateRangeLabels = useMemo(() => {
    const days = endDate.diff(startDate, "day") + 1;
    const labels = [];

    if (effectiveViewMode === "daily") {
      for (let i = 0; i < days; i++) {
        labels.push(startDate.add(i, "day").format("DD-MM"));
      }
    } else if (effectiveViewMode === "weekly") {
      let current = startDate;
      while (current.isBefore(endDate) || current.isSame(endDate, "day")) {
        labels.push(current.format("DD-MM"));
        current = current.add(1, "week");
      }
    } else {
      let current = startDate.startOf("month");
      while (current.isBefore(endDate) || current.isSame(endDate, "month")) {
        labels.push(current.format("MMM YY"));
        current = current.add(1, "month");
      }
    }

    return labels;
  }, [startDate, endDate, effectiveViewMode]);

  // Map actual sales values
  const actualSalesValues = useMemo(() => {
    if (effectiveViewMode === "daily") {
      return dateRangeLabels.map((label) => {
        const matchingEntry = actualSalesData.find(
          (entry) => entry.date.format("DD-MM") === label
        );
        return matchingEntry ? matchingEntry.amount : 0;
      });
    } else if (effectiveViewMode === "weekly") {
      return dateRangeLabels.map((label) => {
        const weekStart = dayjs(label, "DD-MM").year(startDate.year());
        const weekEnd = weekStart.add(6, "day");

        return actualSalesData
          .filter((entry) => {
            const entryTime = entry.date.valueOf();
            const weekStartTime = weekStart.valueOf();
            const weekEndTime = weekEnd.valueOf();
            return entryTime >= weekStartTime && entryTime <= weekEndTime;
          })
          .reduce((sum, entry) => sum + entry.amount, 0);
      });
    } else {
      return dateRangeLabels.map((label) => {
        return actualSalesData
          .filter((entry) => entry.date.format("MMM YY") === label)
          .reduce((sum, entry) => sum + entry.amount, 0);
      });
    }
  }, [dateRangeLabels, actualSalesData, effectiveViewMode, startDate]);

  // Goal line values
  const goalLineValues = useMemo(() => {
    if (effectiveViewMode === "daily") {
      return dateRangeLabels.map(() => monthlyGoal / 30);
    } else if (effectiveViewMode === "weekly") {
      return dateRangeLabels.map(() => (monthlyGoal * 7) / 30);
    } else {
      return dateRangeLabels.map(() => monthlyGoal);
    }
  }, [dateRangeLabels, monthlyGoal, effectiveViewMode]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return dateRangeLabels.map((label, index) => ({
      date: label,
      actualSales: actualSalesValues[index],
      goalSales: goalLineValues[index],
    }));
  }, [dateRangeLabels, actualSalesValues, goalLineValues]);

  // Enhanced Metrics
  const metrics = useMemo(() => {
    const totalActualSales = actualSalesData.reduce(
      (sum, entry) => sum + entry.amount,
      0
    );
    const days = endDate.diff(startDate, "day") + 1;
    const totalGoalForPeriod = (monthlyGoal / 30) * days;
    const achievementPercent =
      totalGoalForPeriod === 0
        ? 0
        : ((totalActualSales / totalGoalForPeriod) * 100).toFixed(1);

    const gapAmount = totalActualSales - totalGoalForPeriod;
    const isAboveGoal = gapAmount >= 0;

    const salesValues = actualSalesValues.filter((v) => v > 0);
    const bestSale = salesValues.length > 0 ? Math.max(...salesValues) : 0;
    const worstSale = salesValues.length > 0 ? Math.min(...salesValues) : 0;
    const avgSale =
      salesValues.length > 0
        ? salesValues.reduce((a, b) => a + b, 0) / salesValues.length
        : 0;

    const bestIndex = actualSalesValues.indexOf(bestSale);
    const worstIndex = actualSalesValues.indexOf(worstSale);

    const daysAboveGoal = actualSalesValues.filter(
      (val, idx) => val >= goalLineValues[idx]
    ).length;
    const daysBelowGoal = actualSalesValues.length - daysAboveGoal;

    const avgDailySales = totalActualSales / days;
    const projectedAnnual = avgDailySales * 365;

    return {
      totalActualSales,
      totalGoalForPeriod,
      achievementPercent: parseFloat(achievementPercent),
      gapAmount,
      isAboveGoal,
      bestSale,
      worstSale,
      avgSale,
      bestPeriod: bestIndex >= 0 ? dateRangeLabels[bestIndex] : "-",
      worstPeriod: worstIndex >= 0 ? dateRangeLabels[worstIndex] : "-",
      daysAboveGoal,
      daysBelowGoal,
      projectedAnnual,
    };
  }, [
    actualSalesData,
    startDate,
    endDate,
    monthlyGoal,
    actualSalesValues,
    goalLineValues,
    dateRangeLabels,
  ]);

  // Custom Tooltip
  const CustomTooltip = ({ payload, label }) => {
    if (payload?.length) {
      const actual =
        payload.find((p) => p.dataKey === "actualSales")?.value || 0;
      const goal = payload.find((p) => p.dataKey === "goalSales")?.value || 0;
      const diff = actual - goal;

      return (
        <Paper sx={{ p: 1.5, borderRadius: 1 }}>
          <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
            {label}
          </Typography>
          <Typography variant="body2" color="#3B82F6">
            Actual: {formatIndianCurrency(actual)}
          </Typography>
          <Typography variant="body2" color="#10B981">
            Goal: {formatIndianCurrency(goal)}
          </Typography>
          <Typography
            variant="body2"
            fontWeight={600}
            color={diff >= 0 ? "success.main" : "error.main"}
          >
            {diff >= 0 ? "+" : ""}
            {formatIndianCurrency(diff)}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box
      sx={{
        px: { xs: 1, md: 2 },
        py: 1,
        bgcolor: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <Typography variant="h5" fontWeight={700} textAlign="center" mb={1}>
        🍽️ Restaurant Sales Goal Dashboard
      </Typography>

      {/* Date Range + View Mode */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="center"
        alignItems="center"
        mb={2}
        flexWrap="wrap"
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

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="auto">Auto</ToggleButton>
          <ToggleButton value="daily">Daily</ToggleButton>
          <ToggleButton value="weekly">Weekly</ToggleButton>
          <ToggleButton value="monthly">Monthly</ToggleButton>
        </ToggleButtonGroup>

        <FormControlLabel
          control={
            <Checkbox
              checked={isFullScreen}
              onChange={() => setIsFullScreen((prev) => !prev)}
            />
          }
          label="Full Screen"
        />
      </Stack>

      {/* Sales Goal + Summary - Compact */}
      <Grid container spacing={1} mb={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 2, bgcolor: "white", borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>
              📊 Sales Goal
            </Typography>
            <TextField
              label="Yearly Sales Goal (₹)"
              type="number"
              value={yearlyGoal || ""}
              onChange={handleYearlyGoalChange}
              placeholder="e.g., 1200000"
              size="small"
              fullWidth
              inputProps={{ min: 12000, step: 1000 }}
            />
            <Stack direction="row" spacing={2} mt={1.5}>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary">
                  Monthly Goal
                </Typography>
                <Typography variant="h6" fontWeight={600} color="primary">
                  {formatIndianCurrency(monthlyGoal)}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary">
                  Yearly Goal
                </Typography>
                <Typography variant="h6" fontWeight={600} color="primary">
                  {formatIndianCurrency(yearlyGoal)}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 2, bgcolor: "white", borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>
              📈 Performance
            </Typography>
            {yearlyGoal > 0 && !loading && restEntries.length > 0 ? (
              <Stack spacing={1}>
                <Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(metrics.achievementPercent, 100)}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      bgcolor: "#e0e0e0",
                      "& .MuiLinearProgress-bar": {
                        bgcolor:
                          metrics.achievementPercent >= 100
                            ? "success.main"
                            : metrics.achievementPercent >= 75
                              ? "info.main"
                              : metrics.achievementPercent >= 50
                                ? "warning.main"
                                : "error.main",
                      },
                    }}
                  />
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    color={
                      metrics.achievementPercent >= 100
                        ? "success.main"
                        : "warning.main"
                    }
                    mt={0.5}
                  >
                    {metrics.achievementPercent}%
                  </Typography>
                </Box>

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total Sales
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {formatIndianCurrency(metrics.totalActualSales)}
                    </Typography>
                  </Box>
                  <Chip
                    icon={
                      metrics.isAboveGoal ? <TrendingUp /> : <TrendingDown />
                    }
                    label={
                      metrics.isAboveGoal
                        ? `${formatIndianCurrency(metrics.gapAmount)} above`
                        : `${formatIndianCurrency(Math.abs(metrics.gapAmount))} short`
                    }
                    color={metrics.isAboveGoal ? "success" : "error"}
                    size="small"
                  />
                </Stack>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" py={3}>
                {yearlyGoal === 0
                  ? "Set goal to see metrics"
                  : loading
                    ? "Loading..."
                    : "No data"}
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Compact Metrics Cards */}
      {yearlyGoal > 0 && !loading && restEntries.length > 0 && (
        <Grid container spacing={1} mb={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper elevation={1} sx={{ p: 1.5, textAlign: "center" }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Best Period
              </Typography>
              <Typography variant="h6" fontWeight={600} color="success.main">
                {formatIndianCurrency(metrics.bestSale)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.bestPeriod}
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper elevation={1} sx={{ p: 1.5, textAlign: "center" }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Worst Period
              </Typography>
              <Typography variant="h6" fontWeight={600} color="error.main">
                {formatIndianCurrency(metrics.worstSale)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.worstPeriod}
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper elevation={1} sx={{ p: 1.5, textAlign: "center" }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Average
              </Typography>
              <Typography variant="h6" fontWeight={600} color="info.main">
                {formatIndianCurrency(metrics.avgSale)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Per period
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper elevation={1} sx={{ p: 1.5, textAlign: "center" }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Projected Annual
              </Typography>
              <Typography variant="h6" fontWeight={600} color="primary">
                {formatIndianCurrency(metrics.projectedAnnual)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Current rate
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Paper
              elevation={1}
              sx={{ p: 1, textAlign: "center", bgcolor: "success.light" }}
            >
              <Typography variant="body2" fontWeight={600}>
                ✓ {metrics.daysAboveGoal} Above Goal
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Paper
              elevation={1}
              sx={{ p: 1, textAlign: "center", bgcolor: "error.light" }}
            >
              <Typography variant="body2" fontWeight={600}>
                ✗ {metrics.daysBelowGoal} Below Goal
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Chart - MAXIMIZED */}
      {loading ? (
        <Stack alignItems="center" mt={4}>
          <CircularProgress />
          <Typography mt={2} color="text.secondary">
            Loading sales data...
          </Typography>
        </Stack>
      ) : restEntries.length === 0 ? (
        <Paper
          elevation={1}
          sx={{ p: 3, textAlign: "center", borderRadius: 2 }}
        >
          <Typography variant="h6" color="text.secondary">
            📭 No data available
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Select a different date range
          </Typography>
        </Paper>
      ) : yearlyGoal === 0 ? (
        <Paper
          elevation={1}
          sx={{ p: 3, textAlign: "center", borderRadius: 2 }}
        >
          <Typography variant="h6" color="text.secondary">
            🎯 Set a yearly sales goal
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Enter target above to see comparison
          </Typography>
        </Paper>
      ) : (
        <Paper
          elevation={2}
          sx={{ p: 2, bgcolor: "white", borderRadius: 2, width: "100%" }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={1}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              Sales Goal vs Actual Sales
            </Typography>
            <Chip
              icon={<ShowChart />}
              label={`${effectiveViewMode.charAt(0).toUpperCase() + effectiveViewMode.slice(1)} View`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Stack>
          <ResponsiveContainer width="100%" height={isFullScreen ? 650 : 500}>
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                label={{
                  value: "Date",
                  position: "insideBottom",
                  offset: -5,
                  style: { fontWeight: "bold" },
                }}
              />
              <YAxis
                label={{
                  value: "Sales Amount (₹)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontWeight: "bold" },
                }}
                tickFormatter={(value) => formatIndianCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="actualSales"
                fill="#3B82F6"
                fillOpacity={0.1}
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="goalSales"
                stroke="#10B981"
                strokeWidth={3}
                name="Sales Goal"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="actualSales"
                stroke="#3B82F6"
                strokeWidth={3}
                name="Actual Sales"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </Box>
  );
};

export default RestSalesGoalDashboard;
