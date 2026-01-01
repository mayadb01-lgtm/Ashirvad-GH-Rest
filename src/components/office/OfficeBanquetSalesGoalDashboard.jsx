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
import { getOfficeBookByDateRange } from "../../redux/actions/officeBookAction";
import {
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

// Constants
const STORAGE_KEY = "banquet_yearly_sales_goal";
const MIN_GOAL = 0;
const GOAL_STEP = 1000;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;
const MONTHS_PER_YEAR = 12;
const DAYS_PER_WEEK = 7;

// Thresholds for view modes
const DAILY_VIEW_THRESHOLD = 31;
const WEEKLY_VIEW_THRESHOLD = 180;

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  excellent: 100,
  good: 75,
  fair: 50,
};

const OfficeBanquetSalesGoalDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, officeBook } = useAppSelector((state) => state.officeBook);

  // State management
  const [startDate, setStartDate] = useState(() => dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(() => dayjs());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [viewMode, setViewMode] = useState("auto");
  const [yearlyGoal, setYearlyGoal] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? parseFloat(saved) : MIN_GOAL;
    } catch (error) {
      console.error("Error loading saved goal:", error);
      return MIN_GOAL;
    }
  });

  // Event handlers
  const handleStartDateChange = useCallback((newDate) => {
    if (newDate?.isValid()) {
      setStartDate(newDate);
    }
  }, []);

  const handleEndDateChange = useCallback((newDate) => {
    if (newDate?.isValid()) {
      setEndDate(newDate);
    }
  }, []);

  const handleYearlyGoalChange = useCallback((e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= MIN_GOAL) {
      setYearlyGoal(value);
    }
  }, []);

  const handleViewModeChange = useCallback((e, newMode) => {
    if (newMode) {
      setViewMode(newMode);
    }
  }, []);

  const toggleFullScreen = useCallback(() => {
    setIsFullScreen((prev) => !prev);
  }, []);

  // Fetch office book data
  useEffect(() => {
    if (startDate && endDate) {
      dispatch(
        getOfficeBookByDateRange(
          startDate.format("DD-MM-YYYY"),
          endDate.format("DD-MM-YYYY")
        )
      );
    }
  }, [dispatch, startDate, endDate]);

  // Persist yearly goal to localStorage
  useEffect(() => {
    if (yearlyGoal > MIN_GOAL) {
      try {
        localStorage.setItem(STORAGE_KEY, yearlyGoal.toString());
      } catch (error) {
        console.error("Error saving goal:", error);
      }
    }
  }, [yearlyGoal]);

  // Computed values
  const monthlyGoal = useMemo(() => yearlyGoal / MONTHS_PER_YEAR, [yearlyGoal]);

  // Currency formatter
  const formatIndianCurrency = useCallback((amount) => {
    const absAmount = Math.abs(amount);
    if (absAmount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (absAmount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    } else if (absAmount >= 1000) {
      return `₹${(amount / 1000).toFixed(2)} K`;
    }
    return `₹${amount.toFixed(0)}`;
  }, []);

  // Process actual sales data from office book
  const actualSalesData = useMemo(() => {
    if (!officeBook?.length) return [];

    const dateMap = new Map();

    officeBook.forEach((entry) => {
      const date = entry.createDate;
      if (!date) return;

      // Calculate daily total from officeIn entries (Banquet only)
      const dailyTotal =
        entry?.officeIn
          ?.filter((item) => {
            const category = (
              item.categoryName ||
              item.category ||
              ""
            ).toLowerCase();
            return category === "banquet";
          })
          .reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

      if (dailyTotal > 0) {
        dateMap.set(date, (dateMap.get(date) || 0) + dailyTotal);
      }
    });

    return Array.from(dateMap.entries())
      .map(([date, amount]) => ({
        date: dayjs(date, "DD-MM-YYYY"),
        amount,
      }))
      .sort((a, b) => a.date.valueOf() - b.date.valueOf());
  }, [officeBook]);

  // Determine effective view mode
  const effectiveViewMode = useMemo(() => {
    if (viewMode !== "auto") return viewMode;

    const days = endDate.diff(startDate, "day") + 1;
    if (days <= DAILY_VIEW_THRESHOLD) return "daily";
    if (days <= WEEKLY_VIEW_THRESHOLD) return "weekly";
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
        return matchingEntry?.amount || 0;
      });
    }

    if (effectiveViewMode === "weekly") {
      return dateRangeLabels.map((label) => {
        const weekStart = dayjs(label, "DD-MM").year(startDate.year());
        const weekEnd = weekStart.add(DAYS_PER_WEEK - 1, "day");

        return actualSalesData
          .filter((entry) => {
            const entryTime = entry.date.valueOf();
            return (
              entryTime >= weekStart.valueOf() && entryTime <= weekEnd.valueOf()
            );
          })
          .reduce((sum, entry) => sum + entry.amount, 0);
      });
    }

    return dateRangeLabels.map((label) => {
      return actualSalesData
        .filter((entry) => entry.date.format("MMM YY") === label)
        .reduce((sum, entry) => sum + entry.amount, 0);
    });
  }, [dateRangeLabels, actualSalesData, effectiveViewMode, startDate]);

  // Goal line values
  const goalLineValues = useMemo(() => {
    const dailyGoal = monthlyGoal / DAYS_PER_MONTH;

    if (effectiveViewMode === "daily") {
      return dateRangeLabels.map(() => dailyGoal);
    }

    if (effectiveViewMode === "weekly") {
      return dateRangeLabels.map(() => dailyGoal * DAYS_PER_WEEK);
    }

    return dateRangeLabels.map(() => monthlyGoal);
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
    const totalGoalForPeriod = (monthlyGoal / DAYS_PER_MONTH) * days;
    const achievementPercent =
      totalGoalForPeriod === 0
        ? 0
        : parseFloat(
            ((totalActualSales / totalGoalForPeriod) * 100).toFixed(1)
          );

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

    const avgDailySales = days > 0 ? totalActualSales / days : 0;
    const projectedAnnual = avgDailySales * DAYS_PER_YEAR;

    return {
      totalActualSales,
      totalGoalForPeriod,
      achievementPercent,
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

  // Get performance color
  const getPerformanceColor = useCallback((percent) => {
    if (percent >= PERFORMANCE_THRESHOLDS.excellent) return "success.main";
    if (percent >= PERFORMANCE_THRESHOLDS.good) return "info.main";
    if (percent >= PERFORMANCE_THRESHOLDS.fair) return "warning.main";
    return "error.main";
  }, []);

  // Custom Tooltip Component (memoized)
  const CustomTooltip = useCallback(
    ({ payload, label }) => {
      if (!payload?.length) return null;

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
    },
    [formatIndianCurrency]
  );

  // Derived states for conditional rendering
  const hasData = officeBook?.length > 0;
  const hasGoal = yearlyGoal > MIN_GOAL;
  const showMetrics = hasGoal && !loading && hasData;

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
        🏢 Office Banquet Sales Goal Dashboard
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
            maxDate={endDate}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={handleEndDateChange}
            format="DD-MM-YYYY"
            slotProps={{ textField: { size: "small" } }}
            minDate={startDate}
          />
        </LocalizationProvider>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          size="small"
          aria-label="View mode selector"
        >
          <ToggleButton value="auto" aria-label="Auto view">
            Auto
          </ToggleButton>
          <ToggleButton value="daily" aria-label="Daily view">
            Daily
          </ToggleButton>
          <ToggleButton value="weekly" aria-label="Weekly view">
            Weekly
          </ToggleButton>
          <ToggleButton value="monthly" aria-label="Monthly view">
            Monthly
          </ToggleButton>
        </ToggleButtonGroup>

        <FormControlLabel
          control={
            <Checkbox checked={isFullScreen} onChange={toggleFullScreen} />
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
              inputProps={{
                min: MIN_GOAL,
                step: GOAL_STEP,
                "aria-label": "Yearly sales goal input",
              }}
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
            {showMetrics ? (
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
                        bgcolor: getPerformanceColor(
                          metrics.achievementPercent
                        ),
                      },
                    }}
                    aria-label={`Achievement percentage: ${metrics.achievementPercent}%`}
                  />
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    color={
                      metrics.achievementPercent >=
                      PERFORMANCE_THRESHOLDS.excellent
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
                {!hasGoal
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
      {showMetrics && (
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

      {/* Chart Section */}
      {loading ? (
        <Stack alignItems="center" mt={4}>
          <CircularProgress />
          <Typography mt={2} color="text.secondary">
            Loading sales data...
          </Typography>
        </Stack>
      ) : !hasData ? (
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
      ) : !hasGoal ? (
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
                tickFormatter={formatIndianCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="actualSales"
                fill="#3B82F6"
                fillOpacity={0.1}
                stroke="none"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="goalSales"
                stroke="#10B981"
                strokeWidth={3}
                name="Sales Goal"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="actualSales"
                stroke="#3B82F6"
                strokeWidth={3}
                name="Actual Sales"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </Box>
  );
};

export default OfficeBanquetSalesGoalDashboard;
