import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../redux/hooks";
import { DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import SkipPreviousRoundedIcon from "@mui/icons-material/SkipPreviousRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import { Button } from "@mui/material";
import { useDateNavigation } from "../../hooks/useDateNavigation";
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
import { formatChartData } from "../charts/chartUtils";
import LineChartComponent from "../charts/LineChartComponent";
import PieChartComponent from "../charts/PieChartComponent";
import { getOfficeBookByDateRange } from "../../redux/actions/officeBookAction";

const OfficeHome = () => {
  const dispatch = useAppDispatch();
  const { loading, officeBook } = useAppSelector((state) => state.officeBook);
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [isFullScreen, setIsFullScreen] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      try {
        await dispatch(
          getOfficeBookByDateRange(
            startDate.format("DD-MM-YYYY"),
            endDate.format("DD-MM-YYYY")
          )
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [dispatch, startDate, endDate]);

  const handleStartDateChange = useCallback(
    (newDate) => newDate && setStartDate(newDate),
    []
  );
  const handleEndDateChange = useCallback(
    (newDate) => newDate && setEndDate(newDate),
    []
  );

  const { goToPreviousRange, goToNextRange } = useDateNavigation({
    startDate,
    endDate,
    setStartDate,
    setEndDate,
  });

  // Prepare - Chart 1 data
  const pieChartOfficeCategoryExpensesInData = useMemo(
    () =>
      officeBook?.length
        ? formatChartData(officeBook, "officeCategoryExpensesIn")
        : [],
    [officeBook]
  );

  const totalOfficeCategoryExpensesInAmount =
    pieChartOfficeCategoryExpensesInData.reduce(
      (sum, entry) => sum + entry.value,
      0
    );

  // // Prepare - Chart 2 data
  const pieChartOfficeCategoryExpensesOutData = useMemo(
    () =>
      officeBook?.length
        ? formatChartData(officeBook, "officeCategoryExpensesOut")
        : [],
    [officeBook]
  );

  const totalOfficeCategoryExpensesOutAmount =
    pieChartOfficeCategoryExpensesOutData.reduce(
      (sum, entry) => sum + entry.value,
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
        🏢 Office Book Graph
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
      ) : officeBook.length === 0 ? (
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
              <Box width="90%" height="90%">
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
                    🏠 Office Category In
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    gutterBottom
                    color="primary"
                  >
                    Total Spent: ₹
                    {totalOfficeCategoryExpensesInAmount.toFixed(2)}
                  </Typography>
                </Stack>
                {pieChartOfficeCategoryExpensesInData.length === 0 ? (
                  <Typography>No expense data available</Typography>
                ) : (
                  <PieChartComponent
                    data={pieChartOfficeCategoryExpensesInData}
                    isFullScreen={isFullScreen}
                  />
                )}
              </Box>
            </Grid>

            {/* Pie Chart - Office In and Out */}
            <Grid item xs={12} md={12} sx={chartBoxStyle}>
              <Box width="90%" height="90%">
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
                    🏠 Office Category Out
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    gutterBottom
                    color="primary"
                  >
                    Total Spent: ₹
                    {totalOfficeCategoryExpensesOutAmount.toFixed(2)}
                  </Typography>
                </Stack>
                {pieChartOfficeCategoryExpensesOutData.length === 0 ? (
                  <Typography>No expense data available</Typography>
                ) : (
                  <PieChartComponent
                    data={pieChartOfficeCategoryExpensesOutData}
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

export default OfficeHome;
