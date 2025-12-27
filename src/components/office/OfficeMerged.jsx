import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Stack,
  FormControlLabel,
  Switch,
  Button,
  TextField,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { getEntriesByDateRange } from "../../redux/actions/entryAction";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { getRestEntriesByDateRange } from "../../redux/actions/restEntryAction";
import { getOfficeBookByDateRange } from "../../redux/actions/officeBookAction";
import PieChartComponent from "../charts/PieChartComponent";
import { formatChartData } from "../charts/chartUtils";

dayjs.locale("en-gb");

// Utility: Format date

const OfficeMerged = () => {
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
  const formatDate = (date) =>
    dayjs(date, ["DD-MM-YYYY", "YYYY-MM-DD", "MM-DD-YYYY"]).format(
      "DD-MM-YYYY"
    );

  const getStoredBool = (key, defaultVal = false) =>
    localStorage.getItem(key) !== null
      ? JSON.parse(localStorage.getItem(key))
      : defaultVal;

  const getStoredDate = (key, fallback) => {
    const stored = localStorage.getItem(key);
    return stored ? dayjs(stored) : fallback;
  };

  const [startDate, setStartDate] = useState(() =>
    getStoredDate("startDate", dayjs().startOf("month"))
  );
  const [endDate, setEndDate] = useState(() =>
    getStoredDate("endDate", dayjs())
  );

  const [showCashDetails, setShowCashDetails] = useState(() =>
    getStoredBool("showCashDetails")
  );
  const [showCardDetails, setShowCardDetails] = useState(() =>
    getStoredBool("showCardDetails")
  );
  const [showPPDetails, setShowPPDetails] = useState(() =>
    getStoredBool("showPPDetails")
  );
  const [showPPCDetails, setShowPPCDetails] = useState(() =>
    getStoredBool("showPPCDetails")
  );
  const [showPPSDetails, setShowPPSDetails] = useState(() =>
    getStoredBool("showPPSDetails")
  );
  const [isFullScreen, setIsFullScreen] = useState(() =>
    getStoredBool("isFullScreen")
  );
  const [isOpeningBalanceEnabled, setIsOpeningBalanceEnabled] = useState(() =>
    getStoredBool("openingBalanceEnabled")
  );

  const getInitialOpeningBalances = () => {
    const stored = localStorage.getItem("openingBalances");
    return stored
      ? JSON.parse(stored)
      : [
          { label: "Cash", value: 0 },
          { label: "PP", value: 0 },
          { label: "PPC", value: 0 },
          { label: "PPS", value: 0 },
        ];
  };

  const [openingBalances, setOpeningBalances] = useState(
    getInitialOpeningBalances
  );
  const fileNameRef = useRef(null);

  // Avoid overwriting on first render
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) return;

    localStorage.setItem("startDate", startDate.toISOString());
    localStorage.setItem("endDate", endDate.toISOString());
    localStorage.setItem("showCashDetails", JSON.stringify(showCashDetails));
    localStorage.setItem("showCardDetails", JSON.stringify(showCardDetails));
    localStorage.setItem("showPPDetails", JSON.stringify(showPPDetails));
    localStorage.setItem("showPPCDetails", JSON.stringify(showPPCDetails));
    localStorage.setItem("showPPSDetails", JSON.stringify(showPPSDetails));
    localStorage.setItem("isFullScreen", JSON.stringify(isFullScreen));
    localStorage.setItem(
      "openingBalanceEnabled",
      JSON.stringify(isOpeningBalanceEnabled)
    );
    localStorage.setItem("openingBalances", JSON.stringify(openingBalances));
  }, [
    startDate,
    endDate,
    showCashDetails,
    showCardDetails,
    showPPDetails,
    showPPCDetails,
    showPPSDetails,
    isFullScreen,
    isOpeningBalanceEnabled,
    openingBalances,
  ]);

  useEffect(() => {
    hasInitialized.current = true;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await dispatch(
          getOfficeBookByDateRange(
            startDate.format("DD-MM-YYYY"),
            endDate.format("DD-MM-YYYY")
          )
        );
        await dispatch(
          getEntriesByDateRange(
            startDate.format("DD-MM-YYYY"),
            endDate.format("DD-MM-YYYY")
          )
        );
        await dispatch(
          getRestEntriesByDateRange(
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

  const handleStartDateChange = useCallback((newDate) => {
    if (newDate) setStartDate(newDate);
  }, []);

  const handleEndDateChange = useCallback((newDate) => {
    if (newDate) setEndDate(newDate);
  }, []);

  const handleBalanceChange = (index, newValue) => {
    setOpeningBalances((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, value: Number(newValue) } : item
      )
    );
  };

  const visibleColumns = useMemo(() => {
    const idDate = [
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
        width: 100,
        headerAlign: "center",
        align: "center",
      },
    ];

    const base = [
      {
        field: "cash",
        headerName: "Cash",
        width: 100,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "card",
        headerName: "Card",
        width: 100,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "pp",
        headerName: "PP",
        width: 100,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "ppc",
        headerName: "PPC",
        width: 100,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "pps",
        headerName: "PPS",
        width: 100,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "total",
        headerName: "Total",
        width: 100,
        headerAlign: "center",
        align: "center",
        cellClassName: "entry-bold",
      },
    ];

    const cash = showCashDetails
      ? [
          {
            field: "ghCashIn",
            headerName: "GHCashIn",
            width: 125,
            cellClassName: "entry-in",
            headerAlign: "center",
            align: "center",
          },
          {
            field: "restCashIn",
            headerName: "RestCashIn",
            width: 125,
            cellClassName: "entry-in",
            headerAlign: "center",
            align: "center",
          },
          {
            field: "officeCashIn",
            headerName: "OfficeCashIn",
            width: 125,
            cellClassName: "entry-in",
            headerAlign: "center",
            align: "center",
          },
          {
            field: "officeCashOut",
            headerName: "OfficeCashOut",
            width: 125,
            cellClassName: "entry-out",
            headerAlign: "center",
            align: "center",
          },
          {
            field: "cash",
            headerName: "Cash",
            width: 100,
            cellClassName: "entry-bold",
            headerAlign: "center",
            align: "center",
          },
        ]
      : [];

    const card = showCardDetails
      ? [
          {
            field: "ghCardIn",
            headerName: "GHCardIn",
            width: 125,
            cellClassName: "entry-in",
            headerAlign: "center",
            align: "center",
          },
          {
            field: "restCardIn",
            headerName: "RestCardIn",
            width: 125,
            cellClassName: "entry-in",
            headerAlign: "center",
            align: "center",
          },
          {
            field: "officeCardIn",
            headerName: "OfficeCardIn",
            width: 125,
            cellClassName: "entry-in",
            headerAlign: "center",
            align: "center",
          },
          {
            field: "card",
            headerName: "Card",
            width: 100,
            cellClassName: "entry-bold",
            headerAlign: "center",
            align: "center",
          },
        ]
      : [];

    const pp = showPPDetails
      ? [
          {
            field: "restPPIn",
            headerName: "RestPPIn",
            width: 125,
            cellClassName: "entry-in",
            headerAlign: "center",
            align: "center",
          },
          {
            field: "officePPIn",
            headerName: "OfficePPIn",
            width: 125,
            cellClassName: "entry-in",
            headerAlign: "center",
            align: "center",
          },
          {
            field: "OfficePPOut",
            headerName: "OfficePPOut",
            width: 125,
            cellClassName: "entry-out",
            headerAlign: "center",
            align: "center",
          },
          {
            field: "pp",
            headerName: "PP",
            width: 100,
            cellClassName: "entry-bold",
            headerAlign: "center",
            align: "center",
          },
        ]
      : [];

    const ppc = showPPCDetails
      ? [
          {
            field: "ghPPCIn",
            headerName: "GHPPCIn",
            width: 125,
            cellClassName: "entry-in",
            headerAlign: "center",
            align: "center",
          },
          {
            field: "officePPCIn",
            headerName: "OfficePPCIn",
            width: 125,
            cellClassName: "entry-in",
            headerAlign: "center",
            align: "center",
          },
          {
            field: "officePPCOut",
            headerName: "OfficePPCOut",
            width: 125,
            cellClassName: "entry-out",
            headerAlign: "center",
            align: "center",
          },
          {
            field: "ppc",
            headerName: "PPC",
            width: 100,
            cellClassName: "entry-bold",
            headerAlign: "center",
            align: "center",
          },
        ]
      : [];

    const pps = showPPSDetails
      ? [
          {
            field: "ghPPSIn",
            headerName: "GHPPSIn",
            width: 125,
            cellClassName: "entry-in",
            headerAlign: "center",
            align: "center",
          },
          {
            field: "officePPSIn",
            headerName: "OfficePPSIn",
            width: 125,
            cellClassName: "entry-in",
            headerAlign: "center",
            align: "center",
          },
          {
            field: "officePPSOut",
            headerName: "OfficePPSOut",
            width: 125,
            cellClassName: "entry-out",
            headerAlign: "center",
            align: "center",
          },
          {
            field: "pps",
            headerName: "PPS",
            width: 100,
            cellClassName: "entry-bold",
            headerAlign: "center",
            align: "center",
          },
        ]
      : [];

    if (
      showCashDetails ||
      showCardDetails ||
      showPPDetails ||
      showPPCDetails ||
      showPPSDetails
    ) {
      return [...idDate, ...cash, ...card, ...pp, ...ppc, ...pps];
    } else {
      return [...idDate, ...base];
    }
  }, [
    showCashDetails,
    showCardDetails,
    showPPDetails,
    showPPCDetails,
    showPPSDetails,
  ]);

  const switchConfigs = [
    {
      label: "Detailed Cash Info",
      checked: showCashDetails,
      onChange: () => setShowCashDetails((prev) => !prev),
    },
    {
      label: "Detailed Card Info",
      checked: showCardDetails,
      onChange: () => setShowCardDetails((prev) => !prev),
    },
    {
      label: "Detailed PP Info",
      checked: showPPDetails,
      onChange: () => setShowPPDetails((prev) => !prev),
    },
    {
      label: "Detailed PPC Info",
      checked: showPPCDetails,
      onChange: () => setShowPPCDetails((prev) => !prev),
    },
    {
      label: "Detailed PPS Info",
      checked: showPPSDetails,
      onChange: () => setShowPPSDetails((prev) => !prev),
    },
  ];

  const totalsConfig = [
    { label: "Cash", key: "cash", color: "#2196f3" },
    { label: "Card", key: "card", color: "#4caf50" },
    { label: "PP", key: "pp", color: "#ff9800" },
    { label: "PPC", key: "ppc", color: "#9c27b0" },
    { label: "PPS", key: "pps", color: "#f44336" },
    { label: "Total", key: "total", color: "#999999" },
  ];

  // Get all unique dates from all sources
  const uniqueDates = useMemo(() => {
    const ghDates = entries?.map((entry) => formatDate(entry.date)) || [];
    const restDates =
      restEntries?.map((entry) => formatDate(entry.createDate)) || [];

    const officeDates =
      officeBook && Array.isArray(officeBook)
        ? officeBook.map((entry) => formatDate(entry.createDate))
        : [];

    return [...new Set([...ghDates, ...restDates, ...officeDates])].sort(
      (a, b) =>
        dayjs(a, "DD-MM-YYYY").isAfter(dayjs(b, "DD-MM-YYYY")) ? 1 : -1
    );
  }, [entries, restEntries, officeBook]);

  const openingBalanceMap = useMemo(() => {
    return openingBalances.reduce((acc, bal) => {
      acc[bal.label] = Number(bal.value) || 0;
      return acc;
    }, {});
  }, [openingBalances]);

  const preparedRows = useMemo(() => {
    return uniqueDates.map((dateStr, idx) => {
      // TODO:CASH
      // GH Cash
      const ghCashIn =
        entries
          ?.filter((entry) => formatDate(entry.date) === dateStr)
          ?.flatMap((entry) =>
            entry.entry?.filter(
              (item) => item.isPaid && item.modeOfPayment === "Cash"
            )
          )
          ?.reduce((sum, item) => sum + item.rate, 0) || 0;

      // Rest Cash
      const restCashIn =
        restEntries
          ?.filter((entry) => formatDate(entry.createDate) === dateStr)
          ?.reduce((sum, entry) => sum + (entry.totalCash || 0), 0) || 0;

      // Office In
      const officeCashIn =
        officeBook
          ?.filter((entry) => formatDate(entry.createDate) === dateStr)
          ?.flatMap((entry) => entry.officeIn || [])
          ?.filter((item) => item.categoryName !== "Pending")
          ?.reduce(
            (sum, item) =>
              sum + (item.modeOfPayment === "Cash" ? item.amount : 0),
            0
          ) || 0;

      // Office Out
      const officeCashOut =
        officeBook
          ?.filter((entry) => formatDate(entry.createDate) === dateStr)
          ?.flatMap((entry) => entry?.officeOut ?? [])
          ?.reduce(
            (sum, item) =>
              sum + (item.modeOfPayment === "Cash" ? item.amount : 0),
            0
          ) || 0;

      const cash = ghCashIn + restCashIn + officeCashIn - officeCashOut;

      // TODO:CARD
      const ghCardIn =
        entries
          ?.filter((entry) => formatDate(entry.date) === dateStr)
          ?.flatMap((entry) =>
            entry.entry?.filter(
              (item) => item.isPaid && item.modeOfPayment === "Card"
            )
          )
          ?.reduce((sum, item) => sum + item.rate, 0) || 0;

      const restCardIn =
        restEntries
          ?.filter((entry) => formatDate(entry.createDate) === dateStr)
          ?.reduce((sum, entry) => sum + (entry.totalCard || 0), 0) || 0;

      const OfficeCardIn =
        officeBook
          ?.filter((entry) => formatDate(entry.createDate) === dateStr)
          ?.flatMap((entry) => entry.officeIn || [])
          ?.filter((item) => item.categoryName !== "Pending")
          ?.reduce(
            (sum, item) =>
              sum + (item.modeOfPayment === "Card" ? item.amount : 0),
            0
          ) || 0;

      const card = ghCardIn + restCardIn + OfficeCardIn;

      // TODO: PP
      const restPPIn =
        restEntries
          ?.filter((entry) => formatDate(entry.createDate) === dateStr)
          ?.reduce((sum, entry) => sum + (entry.totalPP || 0), 0) || 0;

      const OfficePPIn =
        officeBook
          ?.filter((entry) => formatDate(entry.createDate) === dateStr)
          ?.flatMap((entry) => entry.officeIn || [])
          ?.filter((item) => item.categoryName !== "Pending")
          ?.reduce(
            (sum, item) =>
              sum + (item.modeOfPayment === "PP" ? item.amount : 0),
            0
          ) || 0;

      const OfficePPOut =
        officeBook
          ?.filter((entry) => formatDate(entry.createDate) === dateStr)
          ?.flatMap((entry) => entry?.officeOut ?? [])
          ?.reduce(
            (sum, item) =>
              sum + (item.modeOfPayment === "PP" ? item.amount : 0),
            0
          ) || 0;

      const pp = restPPIn + OfficePPIn - OfficePPOut;

      // TODO: PPC
      const ghPPCIn =
        entries
          ?.filter((entry) => formatDate(entry.date) === dateStr)
          ?.flatMap((entry) =>
            entry.entry?.filter(
              (item) => item.isPaid && item.modeOfPayment === "PPC"
            )
          )
          ?.reduce((sum, item) => sum + item.rate, 0) || 0;

      const officePPCIn =
        officeBook
          ?.filter((entry) => formatDate(entry.createDate) === dateStr)
          ?.flatMap((entry) => entry.officeIn || [])
          ?.filter((item) => item.categoryName !== "Pending")
          ?.reduce(
            (sum, item) =>
              sum + (item.modeOfPayment === "PPC" ? item.amount : 0),
            0
          ) || 0;

      const officePPCOut =
        officeBook
          ?.filter((entry) => formatDate(entry.createDate) === dateStr)
          ?.flatMap((entry) => entry?.officeOut ?? [])
          ?.reduce(
            (sum, item) =>
              sum + (item.modeOfPayment === "PPC" ? item.amount : 0),
            0
          ) || 0;

      const ppc = ghPPCIn + officePPCIn - officePPCOut;

      // TODO: PPS
      const ghPPSIn =
        entries
          ?.filter((entry) => formatDate(entry.date) === dateStr)
          ?.flatMap((entry) =>
            entry.entry?.filter(
              (item) => item.isPaid && item.modeOfPayment === "PPS"
            )
          )
          ?.reduce((sum, item) => sum + item.rate, 0) || 0;

      const officePPSIn =
        officeBook
          ?.filter((entry) => formatDate(entry.createDate) === dateStr)
          ?.flatMap((entry) => entry.officeIn || [])
          ?.filter((item) => item.categoryName !== "Pending")
          ?.reduce(
            (sum, item) =>
              sum + (item.modeOfPayment === "PPS" ? item.amount : 0),
            0
          ) || 0;

      const officePPSOut =
        officeBook
          ?.filter((entry) => formatDate(entry.createDate) === dateStr)
          ?.flatMap((entry) => entry?.officeOut ?? [])
          ?.reduce(
            (sum, item) =>
              sum + (item.modeOfPayment === "PPS" ? item.amount : 0),
            0
          ) || 0;

      const pps = ghPPSIn + officePPSIn - officePPSOut;

      const total = cash + card + pp + ppc + pps;

      return {
        id: idx + 1,
        date: dateStr,
        ghCashIn,
        restCashIn,
        officeCashIn,
        officeCashOut,
        cash,
        ghCardIn,
        restCardIn,
        OfficeCardIn,
        card: card,
        restPPIn,
        OfficePPIn,
        OfficePPOut,
        pp: pp,
        ghPPCIn,
        officePPCIn,
        officePPCOut,
        ppc: ppc,
        ghPPSIn,
        officePPSIn,
        officePPSOut,
        pps: pps,
        total: total,
      };
    });
  }, [uniqueDates, entries, restEntries, officeBook]);

  const preparedRowsWithOpeningBalance = useMemo(() => {
    let dataRows = preparedRows;

    if (isOpeningBalanceEnabled) {
      const openingRow = {
        id: "OpeningBalanceRow",
        date: "Opening Balance",
        ghCashIn: 0,
        restCashIn: 0,
        officeCashIn: 0,
        officeCashOut: 0,
        cash: openingBalanceMap.Cash || 0,
        ghCardIn: 0,
        restCardIn: 0,
        OfficeCardIn: 0,
        card: openingBalanceMap.Card || 0,
        restPPIn: 0,
        OfficePPIn: 0,
        OfficePPOut: 0,
        pp: openingBalanceMap.PP || 0,
        ghPPCIn: 0,
        officePPCIn: 0,
        officePPCOut: 0,
        ppc: openingBalanceMap.PPC || 0,
        ghPPSIn: 0,
        officePPSIn: 0,
        officePPSOut: 0,
        pps: openingBalanceMap.PPS || 0,
        total:
          (openingBalanceMap.Cash || 0) +
          (openingBalanceMap.Card || 0) +
          (openingBalanceMap.PP || 0) +
          (openingBalanceMap.PPC || 0) +
          (openingBalanceMap.PPS || 0),
      };
      dataRows = [openingRow, ...dataRows];
    }

    return dataRows;
  }, [preparedRows, openingBalanceMap, isOpeningBalanceEnabled]);

  const keys = [
    "ghCashIn",
    "restCashIn",
    "officeCashIn",
    "officeCashOut",
    "cash",
    "ghCardIn",
    "restCardIn",
    "OfficeCardIn",
    "card",
    "restPPIn",
    "OfficePPIn",
    "OfficePPOut",
    "pp",
    "ghPPCIn",
    "officePPCIn",
    "officePPCOut",
    "ppc",
    "ghPPSIn",
    "officePPSIn",
    "officePPSOut",
    "pps",
    "total",
  ];

  const totalsRow = useMemo(() => {
    const totals = keys.reduce((acc, key) => {
      acc[key] = preparedRows.reduce((sum, row) => sum + (row[key] || 0), 0);
      return acc;
    }, {});

    if (isOpeningBalanceEnabled) {
      totals.cash += openingBalanceMap.Cash || 0;
      totals.pp += openingBalanceMap.PP || 0;
      totals.ppc += openingBalanceMap.PPC || 0;
      totals.pps += openingBalanceMap.PPS || 0;
      totals.total +=
        (openingBalanceMap.Cash || 0) +
        (openingBalanceMap.Card || 0) +
        (openingBalanceMap.PP || 0) +
        (openingBalanceMap.PPC || 0) +
        (openingBalanceMap.PPS || 0);
    }

    return { id: "Total", date: "Total", ...totals };
  }, [preparedRows, openingBalanceMap, isOpeningBalanceEnabled]);

  // Pie Chart Data
  const pieChartData = useMemo(
    () =>
      preparedRowsWithOpeningBalance.length
        ? formatChartData(preparedRowsWithOpeningBalance, "mergedPaymentMode")
        : [],
    [preparedRowsWithOpeningBalance]
  );

  const headerMap = [
    "id",
    "date",
    "ghCashIn",
    "restCashIn",
    "officeCashIn",
    "officeCashOut",
    "cash",
    "ghCardIn",
    "restCardIn",
    "OfficeCardIn",
    "card",
    "restPPIn",
    "OfficePPIn",
    "OfficePPOut",
    "pp",
    "ghPPCIn",
    "officePPCIn",
    "officePPCOut",
  ];

  const handleExportToExcel = () => {
    if (!Array.isArray(preparedRows) || preparedRows.length === 0) {
      toast.error("No data available to export for selected date range.");
      return;
    }
    const headingText = fileNameRef.current?.innerText || "";
    let prefix = "Export";
    if (headingText.includes("Guest House")) prefix = "GH";
    else if (headingText.includes("Restaurant")) prefix = "R";
    else if (headingText.includes("Office")) prefix = "OB";

    const fileName = `${prefix} Merged Report - ${startDate.format(
      "DD-MM-YYYY"
    )} to ${endDate.format("DD-MM-YYYY")}.xlsx`;

    const exportData = preparedRows
      .filter((row) => row.type !== "group" && row.id !== "Total")
      .map(({ ...item }) => {
        const transformed = {};
        Object.keys(headerMap).forEach((key) => {
          transformed[headerMap[key]] = item[key];
        });
        return transformed;
      });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Merged Report");

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
          pb: 1,
        }}
      >
        <Typography
          ref={fileNameRef}
          variant="h5"
          fontWeight={600}
          color="text.primary"
        >
          Merged Report
        </Typography>
      </Box>
      <Stack direction="row" spacing={2} alignItems="center" mt={1}>
        <Typography variant="subtitle2" fontWeight={500} color="text.secondary">
          Select Date Range
        </Typography>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <DatePicker
            value={startDate}
            onChange={handleStartDateChange}
            format="DD-MM-YYYY"
            slotProps={{
              textField: {
                size: "small",
              },
            }}
            views={["year", "month", "day"]}
          />
          <Typography>-</Typography>
          <DatePicker
            value={endDate}
            onChange={handleEndDateChange}
            format="DD-MM-YYYY"
            slotProps={{
              textField: {
                size: "small",
              },
            }}
            views={["year", "month", "day"]}
          />
        </LocalizationProvider>
        <Button
          variant="outlined"
          color="primary"
          sx={{ mt: 2 }}
          onClick={handleExportToExcel}
        >
          Export to Excel
        </Button>
        <FormControlLabel
          control={
            <Switch
              checked={isOpeningBalanceEnabled}
              onChange={(e) => setIsOpeningBalanceEnabled(e.target.checked)}
            />
          }
          label="Opening Balance"
          sx={{
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            paddingInlineEnd: "8px",
          }}
        />
      </Stack>
      {isOpeningBalanceEnabled && (
        <Stack direction="row" spacing={2} alignItems="center" mt={2}>
          <Typography
            variant="subtitle2"
            fontWeight={500}
            color="text.secondary"
          >
            Set Opening Balance
          </Typography>
          {openingBalances.map((item, idx) => (
            <TextField
              key={idx}
              size="small"
              variant="outlined"
              label={item.label || ""}
              type="number"
              value={item.value || 0}
              onChange={(e) => handleBalanceChange(idx, e.target.value)}
            />
          ))}
        </Stack>
      )}
      <Stack direction="row" spacing={1} mt={2}>
        {switchConfigs.map((config, idx) => (
          <FormControlLabel
            key={idx}
            control={
              <Switch checked={config.checked} onChange={config.onChange} />
            }
            label={config.label}
            sx={{
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              paddingInlineEnd: "8px",
            }}
          />
        ))}
      </Stack>
      {ghLoading || restLoading || officeLoading ? (
        <CircularProgress sx={{ mt: 2 }} />
      ) : (
        <Box sx={{ width: "100%", height: "100%" }}>
          <Box
            width={{ xs: "100%", md: "100%", lg: "100%" }}
            sx={{ mt: 2, marginInline: "auto" }}
          >
            {pieChartData.length === 0 ? (
              <Typography variant="h5" fontWeight={600} color="text.primary">
                No Data Available
              </Typography>
            ) : (
              <Box width="100%" height="100%" mt={2}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={4}
                  alignItems="flex-start"
                  justifyContent="center"
                  flexWrap="nowrap"
                >
                  <Stack
                    direction="column"
                    spacing={2}
                    sx={{
                      backgroundColor: "#fafafa",
                      borderRadius: 3,
                      px: 2,
                      py: 2,
                      boxShadow: 2,
                      minWidth: isFullScreen ? "400px" : "300px",
                    }}
                    width={{
                      xs: "100%",
                      md: "100%",
                      lg: "60%",
                    }}
                  >
                    <PieChartComponent
                      data={pieChartData}
                      isFullScreen={isFullScreen}
                    />
                  </Stack>
                  <Stack
                    direction="column"
                    spacing={2}
                    sx={{
                      backgroundColor: "#fafafa",
                      borderRadius: 3,
                      px: 2,
                      py: 2,
                      boxShadow: 2,
                      minWidth: isFullScreen ? "400px" : "300px",
                    }}
                  >
                    <Typography
                      variant="h6"
                      fontWeight={700}
                      color="text.primary"
                    >
                      Payment Breakdown
                    </Typography>
                    {totalsConfig.map(({ label, key, color }) => (
                      <Box
                        key={key}
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                          borderLeft: `6px solid ${color || "#ccc"}`,
                          pl: 2,
                          pr: 1,
                          py: 1,
                          backgroundColor: "#fff",
                          borderRadius: 2,
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            backgroundColor: "#f1f1f1",
                          },
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              backgroundColor: color || "#999",
                              boxShadow: "0 0 2px rgba(0,0,0,0.2)",
                            }}
                          />
                          <Typography
                            variant="subtitle2"
                            fontWeight={500}
                            color="text.secondary"
                          >
                            {label}
                          </Typography>
                        </Box>
                        <Typography
                          variant="subtitle1"
                          fontWeight={600}
                          color="text.primary"
                        >
                          ₹{totalsRow[key]?.toLocaleString("en-IN") || 0}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </Box>
            )}
          </Box>
          <Box sx={{ overflowX: "auto" }}>
            <DataGrid
              rows={[...preparedRows, totalsRow]}
              columns={visibleColumns}
              pageSize={5}
              showCellVerticalBorder
              showColumnVerticalBorder
              sx={{
                mt: 2,
                flexGrow: 1,
                height: "100%",
                width: "100%",
                alignItems:
                  showCardDetails ||
                  showCashDetails ||
                  showPPDetails ||
                  showPPCDetails ||
                  showPPSDetails
                    ? "flex-start"
                    : "center",
                overflow: "auto",
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: "bold",
                },
                "& .entry-in": {
                  color: "green",
                },
                "& .entry-out": {
                  color: "red",
                },
                "& .entry-bold": {
                  fontWeight: "bold",
                },
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default OfficeMerged;
