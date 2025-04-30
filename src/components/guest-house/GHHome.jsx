import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../redux/hooks";
import { DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { getEntriesByDateRange } from "../../redux/actions/entryAction";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import {
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import { LineChart, BarChart } from "@mui/x-charts";
import Grid from "@mui/material/Grid2";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { COLORS, renderActiveShape } from "../charts/chartUtils";

dayjs.locale("en-gb");

const GHHome = () => {
  const dispatch = useAppDispatch();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { loading, entries } = useAppSelector((state) => state.entry);
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [activeIndex, setActiveIndex] = useState(0);
  const onPieEnter = useCallback((_, index) => setActiveIndex(index), []);

  useEffect(() => {
    dispatch(getEntriesByDateRange(startDate, endDate));
  }, [dispatch, startDate, endDate]);

  const handleStartDateChange = useCallback((newDate) => {
    if (newDate) setStartDate(newDate);
  }, []);

  const handleEndDateChange = useCallback((newDate) => {
    if (newDate) setEndDate(newDate);
  }, []);

  const formattedDatasetL1 = useMemo(() => {
    const sortedEntries = [...entries].sort((a, b) =>
      dayjs(a.createdAt).diff(dayjs(b.createdAt))
    );
    return sortedEntries.map((entry) => ({
      x: dayjs(entry.createdAt).format("DD MMM"),
      y: entry.entry
        .map((entry) => entry.noOfPeople)
        .reduce((a, b) => a + b, 0),
    }));
  }, [entries]);

  const dayNightData = useMemo(() => {
    return entries.map((entry) => ({
      date: dayjs(entry.createdAt).format("DD MMM"),
      day: entry.entry
        .map((entry) => entry.perios === "day" || entry.period === "extraDay")
        .reduce((a, b) => a + b, 0),
      night: entry.entry
        .map(
          (entry) => entry.perios === "night" || entry.period === "extraNight"
        )
        .reduce((a, b) => a + b, 0),
    }));
  }, [entries]);

  const modeOfPaymentData = useMemo(() => {
    const paymentModes = ["Cash", "Card", "PPS", "PPC", "UnPaid"];
    const totals = Object.fromEntries(paymentModes.map((mode) => [mode, 0]));

    entries.forEach((entry) => {
      entry.entry.forEach((e) => {
        if (paymentModes.includes(e.modeOfPayment)) {
          totals[e.modeOfPayment] += e.rate ?? 0;
        }
      });
    });

    return Object.keys(totals).map((key) => ({
      name: key,
      value: totals[key],
    }));
  }, [entries]);

  const totalAmountDataSet = useMemo(() => {
    const sortedEntries = [...entries].sort((a, b) =>
      dayjs(a.createdAt).diff(dayjs(b.createdAt))
    );
    return sortedEntries.map((entry) => ({
      x: dayjs(entry.createdAt).format("DD MMM"),
      y: entry.entry.map((entry) => entry.rate).reduce((a, b) => a + b, 0),
    }));
  }, [entries]);

  const chartBoxStyle = {
    width: "100%",
    height: "100%",
    bgcolor: "#fff",
    borderRadius: 3,
    boxShadow: 3,
    p: 3,
  };

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
        🏨 Guest House Dashboard
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
      </Stack>

      {loading ? (
        <Stack alignItems="center" mt={4}>
          <CircularProgress />
        </Stack>
      ) : entries.length === 0 ? (
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
          {/* Chart 1 - Line Chart */}
          <Stack
            direction={isFullScreen ? "column" : "row"}
            spacing={2}
            alignItems="center"
            mb={2}
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
                >
                  📈 Date vs Number of People
                </Typography>
                <LineChart
                  height={isFullScreen ? 500 : 300}
                  width={isFullScreen ? 1000 : 600}
                  series={[
                    {
                      data: formattedDatasetL1.map((item) => item.y),
                      label: "No. of People",
                    },
                  ]}
                  xAxis={[
                    {
                      scaleType: "band",
                      data: formattedDatasetL1.map((item) => item.x),
                    },
                  ]}
                  yAxis={[{ label: "No. of People" }]}
                />
              </Box>
            </Grid>

            {/* Chart 2 - Bar Chart */}
            <Grid item xs={12} md={12} sx={chartBoxStyle}>
              <Box>
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  gutterBottom
                  color="primary"
                >
                  🌓 Date vs Day/Night Stay
                </Typography>
                <BarChart
                  height={isFullScreen ? 500 : 300}
                  width={isFullScreen ? 1000 : 600}
                  series={[
                    {
                      data: dayNightData.map((item) => item.day),
                      label: "Day",
                      stack: "total",
                    },
                    {
                      data: dayNightData.map((item) => item.night),
                      label: "Night",
                      stack: "total",
                    },
                  ]}
                  xAxis={[
                    {
                      scaleType: "band",
                      data: dayNightData.map((item) => item.date),
                    },
                  ]}
                />
              </Box>
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
            {/* Chart 3 - Pie Chart */}
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
                    💳 Payment Method Distribution
                  </Typography>
                </Stack>

                {modeOfPaymentData
                  .map((item) => item.value)
                  .reduce((a, b) => a + b) === 0 ? (
                  <Typography textAlign="center" mt={4}>
                    No data available for selected range
                  </Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={330}>
                    <PieChart>
                      <Pie
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        data={modeOfPaymentData.filter((d) => d.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={isFullScreen ? 100 : 60}
                        outerRadius={isFullScreen ? 160 : 100}
                        onMouseEnter={onPieEnter}
                      >
                        {modeOfPaymentData.map((_, index) => (
                          <Cell
                            key={index}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </Grid>

            {/* Chart 4 - Total Amount Line Chart */}
            <Grid item xs={12} md={12} sx={chartBoxStyle}>
              <Box>
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  gutterBottom
                  color="primary"
                >
                  💰 Date vs Total Amount
                </Typography>
                <LineChart
                  height={isFullScreen ? 500 : 300}
                  width={isFullScreen ? 1000 : 600}
                  series={[
                    {
                      data: totalAmountDataSet.map((item) => item.y),
                      label: "Total Amount",
                    },
                  ]}
                  xAxis={[
                    {
                      scaleType: "band",
                      data: totalAmountDataSet.map((item) => item.x),
                    },
                  ]}
                  yAxis={[{ label: "Total Amount" }]}
                />
              </Box>
            </Grid>
          </Stack>
        </Grid>
      )}
    </Box>
  );
};

export default GHHome;
