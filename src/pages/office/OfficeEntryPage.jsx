import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import Grid from "@mui/material/Grid2";
import { Box, Button, TextField, Typography } from "@mui/material";
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
import { getRestCategory } from "../../redux/actions/restCategoryAction";
import { getRestStaff } from "../../redux/actions/restStaffAction";
dayjs.locale("en-gb");
const OfficeEntryPage = () => {
  const dispatch = useAppDispatch();
  const { loading, officeBook } = useAppSelector((state) => state.officeBook);
  const { isAdminAuthenticated } = useAppSelector((state) => state.admin);
  const today = dayjs().format("DD-MM-YYYY");
  const [selectedDate, setSelectedDate] = useState(today);

  const makeInitialRows = (date, count = 8) =>
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      amount: 0,
      modeOfPayment: "",
      categoryName: "",
      expenseName: "",
      fullname: "",
      remark: "",
      createDate: date,
      fullname_id: "",
      entryCreateDate: "",
    }));
  const [officeInData, setOfficeInData] = useState(() =>
    makeInitialRows(selectedDate)
  );
  const [officeOutData, setOfficeOutData] = useState(() =>
    makeInitialRows(selectedDate)
  );
  const [entryCreateDate, setEntryCreateDate] = useState(today);

  // ✅ Load session data on mount
  useEffect(() => {
    if (window.location.pathname.includes("/office")) {
      const savedDate = sessionStorage.getItem("officeEntryDate");
      const savedIn = sessionStorage.getItem("officeInData");
      const savedOut = sessionStorage.getItem("officeOutData");
      const savedCreateDate = sessionStorage.getItem("entryCreateDate");

      if (savedDate) setSelectedDate(savedDate);
      if (savedIn) setOfficeInData(JSON.parse(savedIn));
      if (savedOut) setOfficeOutData(JSON.parse(savedOut));
      if (savedCreateDate) setEntryCreateDate(savedCreateDate);
    }
  }, []);

  // ✅ Save session data whenever data changes
  useEffect(() => {
    if (window.location.pathname.includes("/office")) {
      sessionStorage.setItem("officeEntryDate", selectedDate);
      sessionStorage.setItem("officeInData", JSON.stringify(officeInData));
      sessionStorage.setItem("officeOutData", JSON.stringify(officeOutData));
      sessionStorage.setItem("entryCreateDate", entryCreateDate);
    }
  }, [selectedDate, officeInData, officeOutData, entryCreateDate]);

  // Fetch office bookings by date
  useEffect(() => {
    if (selectedDate) {
      dispatch(getOfficeBookByDate(selectedDate));
    }
  }, [dispatch, selectedDate]);

  // Fetch all office categories on mount
  useEffect(() => {
    dispatch(getRestCategory());
    dispatch(getOfficeAllCategories());
    dispatch(getRestStaff());
  }, [dispatch]);

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
    const hasEntryCreateDate = officeBook.entryCreateDate;

    if (isEmptyIn && isEmptyOut) {
      resetForm();
      return;
    }

    resetForm();
    if (!isEmptyIn) setOfficeInData(officeBook.officeIn);
    if (!isEmptyOut) setOfficeOutData(officeBook.officeOut);
    if (hasEntryCreateDate) {
      setEntryCreateDate(officeBook.entryCreateDate);
    }
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

  const resetSession = () => {
    sessionStorage.removeItem("officeEntryDate");
    sessionStorage.removeItem("officeInData");
    sessionStorage.removeItem("officeOutData");
  };

  const isRowValid = (row) => {
    return (
      row.amount > 0 &&
      row.categoryName?.trim() &&
      row.expenseName?.trim() &&
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
      entryCreateDate: entryCreateDate,
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
      console.log("Submit - Office Book", officeBookData);
      await dispatch(createOfficeBook(officeBookData));
      await dispatch(getOfficeBookByDate(today));
      setSelectedDate(today);
      resetForm();
      resetSession();
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
      console.log("Update - Office Book", selectedDate, officeBookData);
      await dispatch(updateOfficeBookByDate(selectedDate, officeBookData));
      await dispatch(getOfficeBookByDate(today));
      setSelectedDate(today);
      resetForm();
      resetSession();
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
      console.log("Delete - Office Book", selectedDate);
      await dispatch(deleteOfficeBookByDate(selectedDate));
      await dispatch(getOfficeBookByDate(today));
      setSelectedDate(today);
      resetForm();
      resetSession();
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
          spacing={1}
          justifyContent="space-between"
          alignItems="flex-start"
          padding="8px 32px"
          sx={{ width: "100%" }}
        >
          {/* Right Column: Date Picker + Buttons */}
          <Grid item xs={12} md={6}>
            <Grid container spacing={3}>
              {/* Date Picker Section */}
              <Grid item xs={12}>
                <Grid
                  container
                  spacing={2}
                  alignItems="center"
                  sx={{ flexWrap: "wrap", gap: 1 }}
                >
                  <Grid item>
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      sx={{ minWidth: "160px" }}
                    >
                      Office Book Entry
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm="auto">
                    <LocalizationProvider
                      dateAdapter={AdapterDayjs}
                      adapterLocale="en-gb"
                    >
                      <DatePicker
                        disabled={!isAdminAuthenticated}
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
                              fullWidth
                            />
                          ),
                        }}
                        sx={{
                          "& .MuiInputBase-input": {
                            padding: "8.5px 14px", // better vertical alignment
                          },
                        }}
                        disableFuture={!isAdminAuthenticated}
                        disablePast={!isAdminAuthenticated}
                      />
                    </LocalizationProvider>
                  </Grid>
                </Grid>
              </Grid>

              {/* Action Buttons Section */}
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  <Grid item>
                    <Button
                      variant="contained"
                      color="error"
                      sx={{ "&:hover": { backgroundColor: "#e57373" } }}
                      onClick={() => {
                        resetForm();
                        resetSession();
                      }}
                    >
                      Reset
                    </Button>
                  </Grid>

                  {officeBook &&
                  (officeBook.officeIn || officeBook.officeOut) ? (
                    <>
                      <Grid item>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={handleUpdateOfficeSubmit}
                          disabled={isEditDisabled}
                          sx={{
                            "&:hover": { backgroundColor: "#ab47bc" }, // Better hover color
                            "&:disabled": { backgroundColor: "#b39ddb" },
                          }}
                        >
                          Edit
                        </Button>
                      </Grid>
                      <Grid item>
                        <Button
                          variant="contained"
                          color="error"
                          onClick={handleDeleteOfficeSubmit}
                        >
                          Delete
                        </Button>
                      </Grid>
                    </>
                  ) : (
                    <Grid item>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleOfficeSubmit}
                        sx={{ "&:hover": { backgroundColor: "#64b5f6" } }}
                      >
                        Submit
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          {/* Left Column: Office In & Out */}
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              {/* Office In */}
              <Grid item xs={12} width={"100%"}>
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
                    selectedDate={selectedDate}
                    officeData={officeInData}
                    setOfficeData={setOfficeInData}
                    isOfficeIn
                  />
                </Box>
              </Grid>

              {/* Office Out */}
              <Grid item xs={12} width={"100%"}>
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
                    selectedDate={selectedDate}
                    officeData={officeOutData}
                    setOfficeData={setOfficeOutData}
                    isOfficeOut
                  />
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </>
    );
  }
};

export default OfficeEntryPage;
