import React, { useState, useMemo, useEffect, Suspense } from "react";
import {
  Typography,
  Box,
  Stack,
  TextField,
  Switch,
  FormControlLabel,
  FormGroup,
  Button,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import toast, { Toaster } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import {
  createEntry,
  deleteEntryByDate,
  getEntriesByDate,
  getUnPaidEntries,
  updateEntryByDate,
} from "../redux/actions/entryAction";
import "dayjs/locale/en-gb";
import {
  paymentColors,
  processEntriesByPaymentMode,
  modeSummaryColumn,
  finalModeColumns,
  processEntries,
  processUpdateEntries,
  currentDateTime,
  roomCosts,
  roomType,
} from "../utils/utils";
import PendingJamaTable from "../components/PendingJamaTable";
import ModernLoader, { AccordionSection, PaymentSummary } from "../utils/util";
const PendingJamaGrid = React.lazy(
  () => import("../components/PendingJamaGrid")
);
// const ReservationTable = React.lazy(
//   () => import("../components/ReservationTable")
// );
const EntryAccordion = React.lazy(() => import("../components/EntryAccordion"));
dayjs.locale("en-gb");

const EntryPage = () => {
  const { isAdminAuthenticated, loading: adminLoading } = useAppSelector(
    (state) => state.admin
  );
  const { isAuthenticated, loading: userLoading } = useAppSelector(
    (state) => state.user
  );
  const { entries, loading: entryLoading } = useAppSelector(
    (state) => state.entry
  );
  const dispatch = useAppDispatch();
  const [dayData, setDayData] = useState([]);
  const [nightData, setNightData] = useState([]);
  const [extraDayData, setExtraDayData] = useState([]);
  const [extraNightData, setExtraNightData] = useState([]);
  const today = dayjs().format("DD-MM-YYYY");
  const [selectedDate, setSelectedDate] = useState(today);
  const [pendingJamaRows, setPendingJamaRows] = useState([]);
  const [reservationData, setReservationData] = useState([]);
  const [extraToggle, setExtraToggle] = useState(false);

  useEffect(() => {
    const fetchEntries = async () => {
      dispatch(getEntriesByDate(selectedDate));
    };
    fetchEntries();
  }, [dispatch, selectedDate]);

  useEffect(() => {
    dispatch(getUnPaidEntries());
  }, [dispatch]);

  let processedEntries = useMemo(() => {
    // Cash
    const cashDay = processEntriesByPaymentMode(dayData, "Cash");
    const cashNight = processEntriesByPaymentMode(nightData, "Cash");
    const cashExtraDay = processEntriesByPaymentMode(extraDayData, "Cash");
    const cashExtraNight = processEntriesByPaymentMode(extraNightData, "Cash");
    const pendingJamaCash = pendingJamaRows.filter(
      (row) => row.modeOfPayment === "Cash" && row.period === "UnPaid"
    );
    const reservationCash = reservationData.filter(
      (row) => row.modeOfPayment === "Cash" && row.period === "reservation"
    );
    // Card
    const cardDay = processEntriesByPaymentMode(dayData, "Card");
    const cardNight = processEntriesByPaymentMode(nightData, "Card");
    const cardExtraDay = processEntriesByPaymentMode(extraDayData, "Card");
    const cardExtraNight = processEntriesByPaymentMode(extraNightData, "Card");
    const pendingJamaCard = pendingJamaRows.filter(
      (row) => row.modeOfPayment === "Card" && row.period === "UnPaid"
    );
    const reservationCard = reservationData.filter(
      (row) => row.modeOfPayment === "Card" && row.period === "reservation"
    );
    // PPS
    const ppsDay = processEntriesByPaymentMode(dayData, "PPS");
    const ppsNight = processEntriesByPaymentMode(nightData, "PPS");
    const ppsExtraDay = processEntriesByPaymentMode(extraDayData, "PPS");
    const ppsExtraNight = processEntriesByPaymentMode(extraNightData, "PPS");
    const pendingJamaPPS = pendingJamaRows.filter(
      (row) => row.modeOfPayment === "PPS" && row.period === "UnPaid"
    );
    const reservationPPS = reservationData.filter(
      (row) => row.modeOfPayment === "PPS" && row.period === "reservation"
    );
    // PPC
    const ppcDay = processEntriesByPaymentMode(dayData, "PPC");
    const ppcNight = processEntriesByPaymentMode(nightData, "PPC");
    const ppcExtraDay = processEntriesByPaymentMode(extraDayData, "PPC");
    const ppcExtraNight = processEntriesByPaymentMode(extraNightData, "PPC");
    const pendingJamaPPC = pendingJamaRows.filter(
      (row) => row.modeOfPayment === "PPC" && row.period === "UnPaid"
    );
    const reservationPPC = reservationData.filter(
      (row) => row.modeOfPayment === "PPC" && row.period === "reservation"
    );
    // UnPaid
    const unpaidDay = processEntriesByPaymentMode(dayData, "UnPaid");
    const unpaidNight = processEntriesByPaymentMode(nightData, "UnPaid");
    const unpaidExtraDay = processEntriesByPaymentMode(extraDayData, "UnPaid");
    const unpaidExtraNight = processEntriesByPaymentMode(
      extraNightData,
      "UnPaid"
    );
    const reservationUnPaid = reservationData.filter(
      (row) => row.modeOfPayment === "UnPaid" && row.period === "reservation"
    );

    return {
      cash: {
        day: cashDay ? cashDay : [],
        night: cashNight ? cashNight : [],
        extraDay: cashExtraDay ? cashExtraDay : [],
        extraNight: cashExtraNight ? cashExtraNight : [],
        pendingJamaCash: pendingJamaCash ? pendingJamaCash : [],
        reservationCash: reservationCash ? reservationCash : [],
      },
      card: {
        day: cardDay ? cardDay : [],
        night: cardNight ? cardNight : [],
        extraDay: cardExtraDay ? cardExtraDay : [],
        extraNight: cardExtraNight ? cardExtraNight : [],
        pendingJamaCard: pendingJamaCard ? pendingJamaCard : [],
        reservationCard: reservationCard ? reservationCard : [],
      },
      pps: {
        day: ppsDay ? ppsDay : [],
        night: ppsNight ? ppsNight : [],
        extraDay: ppsExtraDay ? ppsExtraDay : [],
        extraNight: ppsExtraNight ? ppsExtraNight : [],
        pendingJamaPPS: pendingJamaPPS ? pendingJamaPPS : [],
        reservationPPS: reservationPPS ? reservationPPS : [],
      },
      ppc: {
        day: ppcDay ? ppcDay : [],
        night: ppcNight ? ppcNight : [],
        extraDay: ppcExtraDay ? ppcExtraDay : [],
        extraNight: ppcExtraNight ? ppcExtraNight : [],
        pendingJamaPPC: pendingJamaPPC ? pendingJamaPPC : [],
        reservationPPC: reservationPPC ? reservationPPC : [],
      },
      unpaid: {
        day: unpaidDay ? unpaidDay : [],
        night: unpaidNight ? unpaidNight : [],
        extraDay: unpaidExtraDay ? unpaidExtraDay : [],
        extraNight: unpaidExtraNight ? unpaidExtraNight : [],
        reservationUnPaid: reservationUnPaid ? reservationUnPaid : [],
      },
    };
  }, [
    dayData,
    nightData,
    extraDayData,
    extraNightData,
    pendingJamaRows,
    reservationData,
  ]);

  const calculateTotal = (entries) =>
    entries
      ? entries.reduce((sum, row) => Number(sum) + Number(row.rate), 0)
      : 0;

  const calculateTotalReservation = (entries) =>
    entries
      ? entries.reduce(
          (sum, row) => Number(sum) + Number(row.advancePayment),
          0
        )
      : 0;

  const modeRows = [
    {
      id: "Cash",
      totals:
        calculateTotal(processedEntries.cash.day) +
        calculateTotal(processedEntries.cash.night) +
        calculateTotal(processedEntries.cash.extraDay) +
        calculateTotal(processedEntries.cash.extraNight) +
        calculateTotal(processedEntries.cash.pendingJamaCash) +
        calculateTotalReservation(processedEntries.cash.reservation),
    },
    {
      id: "Card",
      totals:
        calculateTotal(processedEntries.card.day) +
        calculateTotal(processedEntries.card.night) +
        calculateTotal(processedEntries.card.extraDay) +
        calculateTotal(processedEntries.card.extraNight) +
        calculateTotal(processedEntries.card.pendingJamaCard) +
        calculateTotalReservation(processedEntries.card.reservation),
    },
    {
      id: "PPS",
      totals:
        calculateTotal(processedEntries.pps.day) +
        calculateTotal(processedEntries.pps.night) +
        calculateTotal(processedEntries.pps.extraDay) +
        calculateTotal(processedEntries.pps.extraNight) +
        calculateTotal(processedEntries.pps.pendingJamaPPS) +
        calculateTotalReservation(processedEntries.pps.reservationPPS),
    },
    {
      id: "PPC",
      totals:
        calculateTotal(processedEntries.ppc.day) +
        calculateTotal(processedEntries.ppc.night) +
        calculateTotal(processedEntries.ppc.extraDay) +
        calculateTotal(processedEntries.ppc.extraNight) +
        calculateTotal(processedEntries.ppc.pendingJamaPPC) +
        calculateTotalReservation(processedEntries.ppc.reservationPPC),
    },
    {
      id: "UnPaid",
      totals:
        calculateTotal(processedEntries.unpaid.day) +
        calculateTotal(processedEntries.unpaid.night) +
        calculateTotal(processedEntries.unpaid.extraDay) +
        calculateTotal(processedEntries.unpaid.extraNight) +
        calculateTotalReservation(processedEntries.unpaid.reservationUnPaid),
    },
    { id: "Total", totals: 0 },
  ];

  modeRows[5].totals = modeRows.reduce(
    (sum, row, idx) => (idx < 5 ? Number(sum) + Number(row.totals) : sum),
    0
  );

  const handleDateChange = (newDate) => {
    if (modeRows[5].totals > 0) {
      if (window.confirm("Are you sure you want to change the date?")) {
        setSelectedDate(newDate.format("DD-MM-YYYY"));
        setDayData([]);
        setNightData([]);
        setExtraDayData([]);
        setExtraNightData([]);
        setPendingJamaRows([]);
        setReservationData([]);
      }
    } else {
      setSelectedDate(newDate.format("DD-MM-YYYY"));
      setDayData([]);
      setNightData([]);
      setExtraDayData([]);
      setExtraNightData([]);
      setPendingJamaRows([]);
      setReservationData([]);
    }
  };

  const resetForm = () => {
    setDayData([]);
    setNightData([]);
    setExtraDayData([]);
    setExtraNightData([]);
    setPendingJamaRows([]);
    setSelectedDate(today);
    setReservationData([]);
    dispatch(getUnPaidEntries());
    dispatch(getEntriesByDate(today));
  };

  const handleEntrySubmit = async () => {
    try {
      if (modeRows[5].totals === 0) {
        toast.error("Please enter some data before submitting.");
        console.warn("No data to submit.");
        return;
      }

      const dayEntries = processEntries(
        dayData,
        "day",
        selectedDate,
        currentDateTime
      );
      const nightEntries = processEntries(
        nightData,
        "night",
        selectedDate,
        currentDateTime
      );
      const extraDayEntries = processEntries(
        extraDayData,
        "extraDay",
        selectedDate,
        currentDateTime
      );
      const extraNightEntries = processEntries(
        extraNightData,
        "extraNight",
        selectedDate,
        currentDateTime
      );

      // Handle Pending Jama Entries
      const pendingJamaEntryFilteredRows = pendingJamaRows.filter(
        (row) =>
          row.date !== "" &&
          row.roomNo !== "" &&
          row.fullname !== "" &&
          row.mobileNumber !== "" &&
          row.rate !== 0 &&
          row.modeOfPayment !== ""
      );

      let pendingJamaEntries = [];
      if (pendingJamaEntryFilteredRows.length > 0) {
        pendingJamaEntries = pendingJamaEntryFilteredRows.map((row) => ({
          ...row,
          period: row.period,
          date: row.date,
          createDate: row.createDate,
        }));
      }

      const reservationEntryFilteredRows = reservationData.filter(
        (row) =>
          row.fullname !== "" &&
          row.mobileNumber !== "" &&
          row.modeOfPayment !== "" &&
          row.noOfPeople !== ""
      );

      let reservationEntries = [];
      if (reservationEntryFilteredRows.length > 0) {
        reservationEntries = reservationEntryFilteredRows.map((row) => ({
          ...row,
          period: row.period,
          date: selectedDate,
          createDate: selectedDate,
          roomNo: 0,
        }));
      }

      const combinedEntries = [
        ...dayEntries,
        ...nightEntries,
        ...extraDayEntries,
        ...extraNightEntries,
        ...pendingJamaEntries,
        ...reservationEntries,
      ];

      console.log("Combined Entries", combinedEntries);

      if (combinedEntries.length === 0) {
        toast.error("No valid entries to submit.");
        console.warn("Filtered data resulted in no entries.");
        return;
      }

      const entryObj = {
        entries: JSON.stringify(combinedEntries),
        date: selectedDate,
      };

      const confirmSubmit = window.confirm(
        `Are you sure you want to submit entries for ${selectedDate}?`
      );

      if (!confirmSubmit) return;

      console.log("Submitting Entries", combinedEntries);
      dispatch(createEntry(entryObj));

      resetForm();
    } catch (error) {
      console.error("Error submitting entries:", error);
      toast.error(
        "An error occurred while submitting entries. Please try again."
      );
    }
  };

  const handleEntryEdit = () => {
    try {
      if (modeRows[5].totals === 0) {
        toast.error("Please enter some data before submitting.");
        console.warn("No data to submit.");
        return;
      }

      const dayEntries = processUpdateEntries(dayData, "day", selectedDate);
      const nightEntries = processUpdateEntries(
        nightData,
        "night",
        selectedDate
      );
      const extraDayEntries = processUpdateEntries(
        extraDayData,
        "extraDay",
        selectedDate
      );
      const extraNightEntries = processUpdateEntries(
        extraNightData,
        "extraNight",
        selectedDate
      );

      // Handle Pending Jama Entries
      const pendingJamaEntryFilteredRows = pendingJamaRows.filter(
        (row) =>
          row.date !== "" &&
          row.roomNo !== "" &&
          row.fullname !== "" &&
          row.mobileNumber !== "" &&
          row.rate !== 0 &&
          row.modeOfPayment !== "" &&
          row.createDate !== ""
      );

      let pendingJamaEntries = [];
      if (pendingJamaEntryFilteredRows.length > 0) {
        pendingJamaEntries = pendingJamaEntryFilteredRows.map((row) => ({
          ...row,
          period: row.period,
          date: row.date,
        }));

        console.log("Pending Jama Entries", pendingJamaEntries);
      }

      const reservationEntryFilteredRows = reservationData.filter(
        (row) =>
          row.fullname !== "" &&
          row.mobileNumber !== "" &&
          row.modeOfPayment !== "" &&
          row.noOfPeople !== ""
      );

      let reservationEntries = [];
      if (reservationEntryFilteredRows.length > 0) {
        reservationEntries = reservationEntryFilteredRows.map((row) => ({
          ...row,
          period: row.period,
          date: selectedDate,
        }));
      }

      const combinedEntries = [
        ...dayEntries,
        ...nightEntries,
        ...extraDayEntries,
        ...extraNightEntries,
        ...pendingJamaEntries,
        ...reservationEntries,
      ];

      if (combinedEntries.length === 0) {
        toast.error("No valid entries to submit.");
        console.warn("Filtered data resulted in no entries.");
        return;
      }

      const entryObj = {
        entries: JSON.stringify(combinedEntries),
        date: selectedDate,
      };

      if (isAdminAuthenticated) {
        const confirmEdit = window.confirm(
          `Are you sure you want to edit entries for ${selectedDate}?`
        );

        if (!confirmEdit) return;

        console.log("Editing Entries", combinedEntries);
        dispatch(updateEntryByDate(selectedDate, entryObj));

        resetForm();
      }
    } catch (error) {
      console.error("Error submitting entries:", error);
      toast.error(
        "An error occurred while submitting entries. Please try again."
      );
    }
  };

  const handleCancelClick = () => {
    if (modeRows[5].totals > 0) {
      if (window.confirm("Are you sure you want to cancel?")) {
        resetForm();
      }
    } else {
      resetForm();
    }
  };

  const handleEntryDelete = async () => {
    try {
      const confirmDelete = window.confirm(
        `Are you sure you want to delete entries for ${selectedDate}?`
      );

      if (!confirmDelete) return;

      dispatch(deleteEntryByDate(selectedDate));
      resetForm();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "An error occurred while deleting the entry."
      );
    }
  };

  if (adminLoading || userLoading || entryLoading) {
    return <ModernLoader adminLoading userLoading entryLoading />;
  }

  return (
    <>
      <Grid
        container
        direction="row"
        display="flex"
        justifyContent="center"
        alignItems="start"
        sx={{
          backgroundColor: "#f4f6f5",
        }}
      >
        <Grid size={{ xs: 12, sm: 12, md: 12, lg: 7, xl: 7 }}>
          <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
            <Box style={{ margin: "0", padding: "0" }}>
              {/* Date Picker */}
              <Stack
                direction="row"
                spacing={1}
                style={{ margin: "0", padding: "0", alignItems: "center" }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={500}
                  style={{ margin: "12px" }}
                >
                  Select Date
                </Typography>
                <LocalizationProvider
                  dateAdapter={AdapterDayjs}
                  adapterLocale="en-gb"
                >
                  <DatePicker
                    views={["year", "month", "day"]}
                    value={
                      selectedDate
                        ? dayjs(selectedDate, "DD-MM-YYYY")
                        : dayjs(today, "DD-MM-YYYY")
                    }
                    onChange={(newDate) => handleDateChange(newDate)}
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
                      "& .MuiInputBase-input": {
                        padding: 1,
                      },
                    }}
                    disableFuture={isAdminAuthenticated ? false : true}
                    disablePast={isAdminAuthenticated ? false : true}
                  />
                </LocalizationProvider>
              </Stack>
            </Box>
          </Grid>
          <Box>
            <Suspense fallback={<div>Loading...</div>}>
              <EntryAccordion
                title="Day Entries"
                period="Day"
                roomCosts={roomCosts}
                roomType={roomType}
                onSubmit={setDayData}
                bgColor="#FAC172"
              />
              <EntryAccordion
                title="Night Entries"
                period="Night"
                roomCosts={roomCosts}
                roomType={roomType}
                onSubmit={setNightData}
                bgColor="#89D5C9"
              />
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={extraToggle}
                      onChange={
                        extraToggle
                          ? () => setExtraToggle(false)
                          : () => setExtraToggle(true)
                      }
                    />
                  }
                  label="Show Extra Entry"
                />
              </FormGroup>
              {extraToggle && (
                <>
                  <EntryAccordion
                    title="Extra Day Entries"
                    period="extraDay"
                    roomCosts={roomCosts}
                    roomType={roomType}
                    onSubmit={setExtraDayData}
                    bgColor="#FAC172"
                  />
                  <EntryAccordion
                    title="Extra Night Entries"
                    period="extraNight"
                    roomCosts={roomCosts}
                    roomType={roomType}
                    onSubmit={setExtraNightData}
                    bgColor="#89D5C9"
                  />
                </>
              )}
              <AccordionSection bgColor="#ADC865" title="Pending Jama Entries">
                <PendingJamaTable
                  pendingJamaRows={pendingJamaRows}
                  setPendingJamaRows={setPendingJamaRows}
                />
              </AccordionSection>

              <AccordionSection
                bgColor="#d2d2d2"
                title="View UnPaid Entries Till Date"
              >
                <PendingJamaGrid />
              </AccordionSection>
              {/* Reservations   */}
              {/* <AccordionSection bgColor="#b4d8ff" title="Reservations Entry">
                <ReservationTable
                  reservationData={reservationData}
                  setReservationData={setReservationData}
                />
              </AccordionSection> */}
            </Suspense>
          </Box>
        </Grid>
        {/* Right Side: Filters Table */}
        <Grid size={{ xs: 12, sm: 12, md: 12, lg: 5, xl: 5 }}>
          <PaymentSummary
            processedEntries={processedEntries}
            columns={modeSummaryColumn}
            paymentColors={paymentColors}
            modeRows={modeRows}
            modeColumns={finalModeColumns}
            handleEntrySubmit={handleEntrySubmit}
            handleEntryEdit={handleEntryEdit}
            handleCancelClick={handleCancelClick}
          />
          <Grid item xs={12}>
            <Box
              sx={{ px: 2 }}
              flexDirection="row"
              display="flex"
              alignItems="center"
              gap={2}
            >
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Submit Entries
              </Typography>
              <Stack direction="row" spacing={1}>
                {(entries?.length > 0 && isAdminAuthenticated) ||
                (entries?.length > 0 &&
                  selectedDate === today &&
                  isAuthenticated) ? (
                  <Button
                    onClick={handleEntryEdit}
                    variant="contained"
                    color="secondary"
                    sx={{
                      px: 3,
                      "&:hover": { backgroundColor: "secondary" },
                    }}
                  >
                    Edit
                  </Button>
                ) : (
                  <Button
                    onClick={handleEntrySubmit}
                    variant="contained"
                    color="success"
                    sx={{ px: 3, "&:hover": { backgroundColor: "#81c784" } }}
                  >
                    Submit
                  </Button>
                )}
                <Button
                  onClick={handleCancelClick}
                  variant="contained"
                  color="warning"
                  sx={{ px: 3, "&:hover": { backgroundColor: "#e57373" } }}
                >
                  Reset
                </Button>
                {entries?.length > 0 && isAdminAuthenticated && (
                  <Button
                    onClick={handleEntryDelete}
                    variant="contained"
                    color="error"
                    sx={{ px: 3, "&:hover": { backgroundColor: "#e57373" } }}
                  >
                    Delete
                  </Button>
                )}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Grid>
      <Toaster position="top-center" reverseOrder={true} />
    </>
  );
};

export default EntryPage;
