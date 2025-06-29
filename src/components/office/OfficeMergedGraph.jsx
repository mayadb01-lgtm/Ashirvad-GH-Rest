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
import { formatChartData } from "../charts/chartUtils";
import LineChartComponent from "../charts/LineChartComponent";
import PieChartComponent from "../charts/PieChartComponent";
import { getOfficeBookByDateRange } from "../../redux/actions/officeBookAction";
import { GH_MODE_OF_PAYMENT_OPTIONS } from "../../utils/utils";
import { getEntriesByDateRange } from "../../redux/actions/entryAction";
import {
  getExpensesByDateRange,
  getRestEntriesByDateRange,
} from "../../redux/actions/restEntryAction";

// Utility helper for GH sales sum
const sumValidEntryRates = (entries, validModes) => {
  return entries.reduce((sum, e) => {
    const subtotal =
      e.entry
        ?.filter(
          (item) =>
            validModes.includes(item.modeOfPayment) && item.period !== "UnPaid"
        )
        .reduce((acc, i) => acc + i.rate, 0) || 0;
    return sum + subtotal;
  }, 0);
};

const OfficeMergedGraph = () => {
  const dispatch = useAppDispatch();
  const { loading: ghLoading, entries } = useAppSelector(
    (state) => state.entry
  );
  const { loading: restLoading, restEntries } = useAppSelector(
    (state) => state.restEntry
  );
  const { loading: officeLoading, officeBook } = useAppSelector(
    (state) => state.officeBook
  );
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          dispatch(
            getOfficeBookByDateRange(
              startDate.format("DD-MM-YYYY"),
              endDate.format("DD-MM-YYYY")
            )
          ),
          dispatch(
            getEntriesByDateRange(
              startDate.format("DD-MM-YYYY"),
              endDate.format("DD-MM-YYYY")
            )
          ),
          dispatch(
            getRestEntriesByDateRange(
              startDate.format("DD-MM-YYYY"),
              endDate.format("DD-MM-YYYY")
            )
          ),
        ]);
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

  // Prepare - Chart 1 data = Total Sales of GH + Rest + OfficeIn
  const ghSalesTotal = useMemo(
    () => sumValidEntryRates(entries || [], GH_MODE_OF_PAYMENT_OPTIONS),
    [entries]
  );

  const restSalesTotal =
    (restEntries &&
      restEntries?.reduce((total, entry) => total + entry.grandTotal, 0)) ||
    0;

  const officeSalesEntries =
    (officeBook && officeBook?.flatMap((entry) => entry.officeIn || [])) || [];
  const officeSalesTotal =
    (officeSalesEntries &&
      officeSalesEntries
        ?.filter((entry) => entry.categoryName !== "Pending")
        ?.reduce((sum, entry) => sum + entry.amount, 0)) ||
    0;
  const officeBanquetTotal =
    (officeSalesEntries &&
      officeSalesEntries
        ?.filter((entry) => entry.categoryName === "Banquet")
        ?.reduce((sum, entry) => sum + entry.amount, 0)) ||
    0;
  const pieChartTotalMergedSalesData = useMemo(
    () => [
      { name: "GH Sales", value: ghSalesTotal },
      { name: "Rest Sales", value: restSalesTotal },
      { name: "Office Sales", value: officeSalesTotal },
      { name: "Banquet", value: officeBanquetTotal },
    ],
    [ghSalesTotal, restSalesTotal, officeSalesTotal, officeBanquetTotal]
  );
  const totalMergedSalesAmount =
    ghSalesTotal + restSalesTotal + officeSalesTotal + officeBanquetTotal || 0;

  // Prepare - Chart 2 data = Total Expenses
  const restExpensesTotal =
    (restEntries &&
      restEntries
        ?.filter((entry) => entry?.expenses)
        ?.reduce(
          (total, entry) =>
            total +
            entry.expenses.reduce((acc, item) => acc + (item.amount || 0), 0),
          0
        )) ||
    0;

  const officeExpensesTotal =
    (officeBook &&
      officeBook?.reduce(
        (total, entry) =>
          total +
          (entry.officeOut || []).reduce((acc, item) => acc + item.amount, 0),
        0
      )) ||
    0;

  const pieChartTotalExpensesData = useMemo(
    () => [
      { name: "Rest Expenses", value: restExpensesTotal },
      { name: "Office Expenses", value: officeExpensesTotal },
    ],
    [restExpensesTotal, officeExpensesTotal]
  );
  const totalExpensesAmount = restExpensesTotal + officeExpensesTotal || 0;

  // Prepare - Chart 3 data = Aapvana & Levana
  const restAapvanaTotal =
    (restEntries || [])
      .filter((entry) => entry?.pending && entry?.pending.length > 0)
      .reduce(
        (total, entry) =>
          total +
          entry?.pending.reduce((acc, item) => acc + (item.amount || 0), 0),
        0
      ) || 0;

  const restLevanaTotal =
    (restEntries &&
      restEntries
        ?.filter(
          (entry) => entry?.pendingUsers && entry?.pendingUsers.length > 0
        )
        ?.reduce(
          (total, entry) =>
            total +
            entry?.pendingUsers.reduce(
              (acc, item) => acc + (item.amount || 0),
              0
            ),
          0
        )) ||
    0;

  const pieChartTotalAppvanaLevanaData = useMemo(
    () => [
      { name: "Rest Aapvana", value: restAapvanaTotal },
      { name: "Rest Levana", value: restLevanaTotal },
    ],
    [restAapvanaTotal, restLevanaTotal]
  );
  const totalAppvanaLevanaAmount = restAapvanaTotal + restLevanaTotal || 0;

  // Chart 4 - categoryName wise Rest and Office Out

  const restOfficeCategoryExpensesData = useMemo(() => {
    const restExpensesCategoryData =
      restEntries?.flatMap((entry) => entry.expenses || []) || [];
    const officeExpensesCategoryData =
      officeBook?.flatMap((entry) => entry.officeOut || []) || [];

    const mergedData = [
      ...restExpensesCategoryData,
      ...officeExpensesCategoryData,
    ];

    const groupedData = mergedData.reduce((acc, item) => {
      const categoryKey = item.categoryName || "Uncategorized";
      if (!acc[categoryKey]) {
        acc[categoryKey] = [];
      }
      acc[categoryKey].push({
        expenseName: item.expenseName || "Unnamed",
        amount: Number(item.amount) || 0,
        createDate: item.createDate,
      });
      return acc;
    }, {});

    const categoryTotals = Object.entries(groupedData).map(
      ([categoryName, items]) => ({
        categoryName,
        totalAmount: items.reduce((acc, item) => acc + item.amount, 0),
      })
    );

    return categoryTotals
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((item) => ({ name: item.categoryName, value: item.totalAmount }));
  }, [restEntries, officeBook]);

  console.log("restOfficeCategoryExpensesData", restOfficeCategoryExpensesData);

  const pieChartRestOfficeExpenseCategoryWiseData = useMemo(
    () => restOfficeCategoryExpensesData || [],
    [restOfficeCategoryExpensesData]
  );

  const totalRestOfficeExpensesCategoryWiseAmount =
    restOfficeCategoryExpensesData?.reduce(
      (acc, item) => acc + item.value,
      0
    ) || 0;

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
        🏢 Merged Graph
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
      </Stack>

      {ghLoading || restLoading || officeLoading ? (
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
            {/* Pie Chart - Total Sales */}
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
                    Sales - GH+Rest+OfficeIn
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    gutterBottom
                    color="primary"
                  >
                    Total Spent: ₹{totalMergedSalesAmount.toFixed(2)}
                  </Typography>
                </Stack>
                {totalMergedSalesAmount === 0 ? (
                  <Typography>No expense data available</Typography>
                ) : (
                  <PieChartComponent
                    data={pieChartTotalMergedSalesData}
                    isFullScreen={isFullScreen}
                  />
                )}
              </Box>
            </Grid>

            {/* Pie Chart - Total Expenses */}
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
                    Expenses - Rest+OfficeOut
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
                {totalExpensesAmount === 0 ? (
                  <Typography>No expense data available</Typography>
                ) : (
                  <PieChartComponent
                    data={pieChartTotalExpensesData}
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
            {/* Pie Chart - Total Sales */}
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
                    Rest - Aapvana & Levana
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    gutterBottom
                    color="primary"
                  >
                    Total Spent: ₹{totalAppvanaLevanaAmount.toFixed(2)}
                  </Typography>
                </Stack>
                {totalAppvanaLevanaAmount === 0 ? (
                  <Typography>No expense data available</Typography>
                ) : (
                  <PieChartComponent
                    data={pieChartTotalAppvanaLevanaData}
                    isFullScreen={isFullScreen}
                  />
                )}
              </Box>
            </Grid>

            {/* Pie Chart - Total Expenses */}
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
                    Dummy Graph
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    gutterBottom
                    color="primary"
                  >
                    Total Spent: ₹
                    {totalRestOfficeExpensesCategoryWiseAmount.toFixed(2)}
                  </Typography>
                </Stack>
                {totalRestOfficeExpensesCategoryWiseAmount === 0 ? (
                  <Typography>No expense data available</Typography>
                ) : (
                  <PieChartComponent
                    data={pieChartRestOfficeExpenseCategoryWiseData}
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

export default OfficeMergedGraph;
