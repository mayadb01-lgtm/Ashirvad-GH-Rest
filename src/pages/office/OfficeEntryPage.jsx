import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import Grid from "@mui/material/Grid2";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import OfficeBookTable from "../../components/office/OfficeBookTable";
import {
  createOfficeBook,
  deleteOfficeBookByDate,
  getOfficeAllCategories,
  getOfficeBookByDate,
  updateOfficeBookByDate,
} from "../../redux/actions/officeBookAction";
import ModernLoader from "../../utils/util";
import toast from "react-hot-toast";
dayjs.locale("en-gb");

const OfficeEntryPage = () => {
  const dispatch = useAppDispatch();
  const { loading, officeBook, officeCategory } = useAppSelector(
    (state) => state.officeBook
  );
  const { isAdminAuthenticated } = useAppSelector((state) => state.admin);
  const today = dayjs().format("DD-MM-YYYY");

  const makeInitialRows = (date, count = 8) =>
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      amount: 0,
      modeOfPayment: "",
      fullname: "",
      category: "",
      remark: "",
      createDate: date,
      entryCreateDate: dayjs(date).startOf("day").toDate(),
    }));
  const [officeInData, setOfficeInData] = useState(() =>
    makeInitialRows(today)
  );
  const [officeOutData, setOfficeOutData] = useState(() =>
    makeInitialRows(today)
  );
  const [selectedDate, setSelectedDate] = useState(today);

  // Fetch office bookings by date
  useEffect(() => {
    if (selectedDate) {
      dispatch(getOfficeBookByDate(selectedDate));
    }
  }, [dispatch, selectedDate]);

  // Fetch all office categories on mount
  useEffect(() => {
    dispatch(getOfficeAllCategories());
  }, [dispatch]);

  // Memoized category options
  const categoryOptions = useMemo(() => {
    return officeCategory?.map(({ categoryName }) => ({ categoryName })) || [];
  }, [officeCategory]);

  // Disable Edit when In and Out - Amount Total is 0
  const isEditDisabled = useMemo(() => {
    const totalIn = officeInData.reduce((total, row) => total + row.amount, 0);
    const totalOut = officeOutData.reduce(
      (total, row) => total + row.amount,
      0
    );
    return totalIn === 0 && totalOut === 0;
  }, [officeInData, officeOutData]);

  // Handle office booking data
  useEffect(() => {
    if (!officeBook) return;

    const isEmptyIn = !officeBook.officeIn?.length;
    const isEmptyOut = !officeBook.officeOut?.length;

    if (isEmptyIn && isEmptyOut) {
      resetForm();
      return;
    }

    resetForm();
    if (!isEmptyIn) setOfficeInData(officeBook.officeIn);
    if (!isEmptyOut) setOfficeOutData(officeBook.officeOut);
  }, [officeBook, selectedDate]);

  const handleDateChange = (newDate) => {
    if (newDate) {
      const formattedDate = newDate.format("DD-MM-YYYY");
      if (formattedDate !== selectedDate) {
        setSelectedDate(formattedDate);
      }
    }
  };

  const resetForm = () => {
    const rows = makeInitialRows(selectedDate);
    setOfficeInData(rows);
    setOfficeOutData(rows);
  };
  const isRowValid = (row) => {
    return (
      row.amount > 0 &&
      row.fullname?.trim() &&
      row.category?.trim() &&
      row.modeOfPayment?.trim()
    );
  };

  const isFormValid = useMemo(() => {
    const inValid = officeInData.filter(
      (row) => row.amount > 0 && !isRowValid(row)
    );
    const outValid = officeOutData.filter(
      (row) => row.amount > 0 && !isRowValid(row)
    );
    return inValid.length === 0 && outValid.length === 0;
  }, [officeInData, officeOutData]);

  const processOfficeData = (data) => data.filter((row) => isRowValid(row));

  const officeBookData = useMemo(() => {
    const processedOfficeIn = processOfficeData(officeInData);
    const processedOfficeOut = processOfficeData(officeOutData);
    const isEmpty =
      processedOfficeIn.length === 0 && processedOfficeOut.length === 0;
    if (isEmpty) return null;
    return {
      officeIn: JSON.stringify(processedOfficeIn),
      officeOut: JSON.stringify(processedOfficeOut),
      createDate: selectedDate,
      entryCreateDate: dayjs(selectedDate).startOf("day").toDate(),
    };
  }, [officeInData, officeOutData, selectedDate]);

  // Submit Entry
  const handleOfficeSubmit = async () => {
    try {
      if (!isFormValid) {
        toast.error("Please fill in all the required fields.");
        return;
      }
      const confirmSubmit = window.confirm(
        `Are you sure you want to submit office book for ${selectedDate}?`
      );
      if (!confirmSubmit) return;
      dispatch(createOfficeBook(officeBookData));
      setSelectedDate(today);
      resetForm();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ??
          error?.message ??
          "An unknown error occurred."
      );
    }
  };

  // Update Entry
  const handleUpdateOfficeSubmit = async () => {
    try {
      if (!isFormValid) {
        toast.error("Please fill in all the required fields.");
        return;
      }
      const confirmSubmit = window.confirm(
        `Are you sure you want to update office book for ${selectedDate}?`
      );
      if (!confirmSubmit) return;

      await dispatch(updateOfficeBookByDate(selectedDate, officeBookData));
      await dispatch(getOfficeBookByDate(today));
      setSelectedDate(today);
      resetForm();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ??
          error?.message ??
          "An unknown error occurred."
      );
    }
  };

  // Delete Entry
  const handleDeleteOfficeSubmit = async () => {
    try {
      const confirmSubmit = window.confirm(
        `Are you sure you want to delete office book for ${selectedDate}?`
      );
      if (!confirmSubmit) return;
      await dispatch(deleteOfficeBookByDate(selectedDate));
      await dispatch(getOfficeBookByDate(today));
      setSelectedDate(today);
      resetForm();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ??
          error?.message ??
          "An unknown error occurred."
      );
    }
  };

  if (loading) {
    return <ModernLoader />;
  } else {
    return (
      <>
        <Grid
          container
          direction="row"
          display="flex"
          justifyContent="space-between"
          alignItems="start"
          padding={"8px 32px"}
        >
          <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
            <Box style={{ margin: "0", padding: "0" }}>
              {/* Date Picker */}
              <Stack
                direction="row"
                spacing={1}
                style={{ margin: "0", padding: "0", alignItems: "center" }}
              >
                {/* Office Book Entry - Heading */}
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  style={{ margin: 0 }}
                >
                  Office Book Entry
                </Typography>
                <LocalizationProvider
                  dateAdapter={AdapterDayjs}
                  adapterLocale="en-gb"
                >
                  <DatePicker
                    format="DD-MM-YYYY"
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
                    disableFuture={!isAdminAuthenticated}
                    disablePast={!isAdminAuthenticated}
                  />
                </LocalizationProvider>
              </Stack>
            </Box>
          </Grid>
          {/* Office In */}
          <Grid size={{ xs: 12, sm: 12, md: 12, lg: 5.95, xl: 5.95 }}>
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 500,
                    fontSize: "18px",
                    backgroundColor: "#e8e2fd",
                    padding: "4px 16px",
                    borderRadius: "4px",
                    width: "fit-content",
                  }}
                >
                  Office In
                </Typography>
                <OfficeBookTable
                  categoryOptions={categoryOptions}
                  officeData={officeInData}
                  setOfficeData={setOfficeInData}
                />
              </Box>
            </Grid>
          </Grid>
          {/* Office Out */}
          <Grid size={{ xs: 12, sm: 12, md: 12, lg: 5.95, xl: 5.95 }}>
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 500,
                    fontSize: "18px",
                    backgroundColor: "#fee1ff",
                    padding: "4px 16px",
                    borderRadius: "4px",
                    width: "fit-content",
                  }}
                >
                  Office Out
                </Typography>
                <OfficeBookTable
                  categoryOptions={categoryOptions}
                  officeData={officeOutData}
                  setOfficeData={setOfficeOutData}
                />
              </Box>
            </Grid>
          </Grid>
          <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
            <Box
              style={{
                display: "flex",
                justifyContent: "flex-start",
                marginTop: "16px",
              }}
            >
              <Button
                variant="contained"
                color="error"
                sx={{ mx: 1, "&:hover": { backgroundColor: "#e57373" } }}
                onClick={resetForm}
              >
                Reset
              </Button>
              {officeBook && (officeBook.officeIn || officeBook.officeOut) ? (
                <>
                  <Button
                    variant="contained"
                    color="secondary"
                    sx={{
                      mx: 1,
                      "&:hover": { backgroundColor: "secondary" },
                      "&:disabled": { backgroundColor: "secondary" },
                    }}
                    onClick={handleUpdateOfficeSubmit}
                    disabled={isEditDisabled ? true : false}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    sx={{ mx: 1 }}
                    onClick={handleDeleteOfficeSubmit}
                  >
                    Delete
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  sx={{
                    mx: 1,
                    "&:hover": { backgroundColor: "#64b5f6" },
                  }}
                  onClick={handleOfficeSubmit}
                >
                  Submit
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </>
    );
  }
};

export default OfficeEntryPage;
