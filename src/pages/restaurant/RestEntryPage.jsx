import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import RestUpadTable from "../../components/restaurant/RestUpadTable";
import RestExpensesTable from "../../components/restaurant/RestExpensesTable";
import RestPendingTable from "../../components/restaurant/RestPendingTable";
import toast from "react-hot-toast";
import {
  createRestEntry,
  getRestEntryByDate,
  getRestStaffGHLastSevenDays,
  updateRestEntryByDate,
} from "../../redux/actions/restEntryAction";
import { getRestStaff } from "../../redux/actions/restStaffAction";
import {
  getRestCategory,
  getRestCategoryName,
  getRestExpenseName,
} from "../../redux/actions/restCategoryAction";
import ModernLoader from "../../utils/util";
import { getPendingUser } from "../../redux/actions/restPendingAction";
import RestPendingUsersTable from "../../components/restaurant/RestPendingUsersTable";
dayjs.locale("en-gb");

const RestEntryPage = () => {
  const dispatch = useAppDispatch();
  const { loading, restEntries } = useAppSelector((state) => state.restEntry);
  const { restStaff } = useAppSelector((state) => state.restStaff);
  const { isAdminAuthenticated } = useAppSelector((state) => state.admin);
  const today = dayjs().format("DD-MM-YYYY");
  const [selectedDate, setSelectedDate] = useState(today);

  // Create Full Name options
  const fieldOptions = restStaff
    ? restStaff?.map((staff) => ({
        _id: staff._id,
        fullname: staff.fullname,
        mobileNumber: staff.mobileNumber,
      }))
    : [];

  // Upad
  const restUpadInitialData = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    _id: "",
    amount: 0,
    fullname: "",
    mobileNumber: 0,
    createDate: selectedDate,
  }));
  const [restUpadData, setRestUpadData] = useState(restUpadInitialData);

  // Pending
  const restPendingInitialData = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    _id: "",
    fullname: "",
    mobileNumber: 0,
    amount: 0,
    createDate: selectedDate,
  }));
  const [restPendingData, setRestPendingData] = useState(
    restPendingInitialData
  );
  // Expenses
  const restExpensesInitialData = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    _id: "",
    amount: 0,
    categoryName: "",
    expenseName: "",
    createDate: selectedDate,
  }));
  const [restExpensesData, setRestExpensesData] = useState(
    restExpensesInitialData
  );
  const restPendingUsersInitialData = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    _id: "",
    fullname: "",
    mobileNumber: 0,
    amount: 0,
    createDate: selectedDate,
  }));
  const [restPendingUsersData, setRestPendingUsersData] = useState(
    restPendingUsersInitialData
  );
  const [totalUpad, setTotalUpad] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalCard, setTotalCard] = useState(0);
  const [totalPP, setTotalPP] = useState(0);
  const [totalCash, setTotalCash] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [computerAmount, setComputerAmount] = useState(0);
  const [extraAmount, setExtraAmount] = useState(0);
  useMemo(() => {
    const total = restUpadData.reduce((acc, row) => {
      return acc + Number(row.amount);
    }, 0);
    setTotalUpad(total);
  }, [restUpadData]);

  useMemo(() => {
    const total = restPendingData.reduce((acc, row) => {
      return acc + Number(row.amount);
    }, 0);
    setTotalPending(total);
  }, [restPendingData]);

  useMemo(() => {
    const total = restExpensesData.reduce((acc, row) => {
      return acc + Number(row.amount);
    }, 0);
    setTotalExpenses(total);
  }, [restExpensesData]);

  useMemo(() => {
    const total =
      totalUpad +
      totalPending +
      totalExpenses +
      totalCard +
      totalPP +
      totalCash;
    setGrandTotal(total);
  }, [totalUpad, totalPending, totalExpenses, totalCard, totalPP, totalCash]);

  useMemo(() => {
    const total = grandTotal - computerAmount;
    setExtraAmount(total);
  }, [grandTotal, computerAmount]);

  useEffect(() => {
    if (selectedDate) {
      dispatch(getRestEntryByDate(selectedDate));
    }
  }, [dispatch, selectedDate]);

  useEffect(() => {
    dispatch(getRestStaff());
    dispatch(getRestCategory());
    dispatch(getRestCategoryName());
    dispatch(getRestExpenseName());
    dispatch(getRestStaffGHLastSevenDays());
    dispatch(getPendingUser());
  }, []);

  useEffect(() => {
    if (restEntries && restEntries.length === 0) {
      resetForm();
    }
    if (selectedDate && restEntries && restEntries.grandTotal > 0) {
      resetForm();
      // setRestUpadData((prev) => {
      //   return prev.map((row, i) => {
      //     const upad = restEntries.upad[i];
      //     return upad
      //       ? {
      //           ...row,
      //           _id: upad._id,
      //           amount: upad.amount,
      //           fullname: upad.fullname,
      //           mobileNumber: upad.mobileNumber,
      //           createDate: upad.createDate,
      //         }
      //       : row;
      //   });
      // });
      // setRestPendingData((prev) => {
      //   return prev.map((row, i) => {
      //     const pending = restEntries.pending[i];
      //     return pending
      //       ? {
      //           ...row,
      //           _id: pending._id,
      //           amount: pending.amount,
      //           fullname: pending.fullname,
      //           mobileNumber: pending.mobileNumber,
      //           createDate: pending.createDate,
      //         }
      //       : row;
      //   });
      // });
      // setRestExpensesData((prev) => {
      //   return prev.map((row, i) => {
      //     const expenses = restEntries.expenses[i];

      //     return expenses
      //       ? {
      //           ...row,
      //           _id: expenses._id,
      //           amount: expenses.amount,
      //           categoryName: expenses.categoryName,
      //           expenseName: expenses.expenseName,
      //           createDate: expenses.createDate,
      //         }
      //       : row;
      //   });
      // });
      setRestUpadData(restEntries.upad);
      setRestPendingData(restEntries.pending);
      restEntries.pendingUsers &&
        setRestPendingUsersData(restEntries.pendingUsers);
      setRestExpensesData(restEntries.expenses);
      setRestPendingUsersData(restEntries.pendingUsers);
      setExtraAmount(restEntries.extraAmount);
      setTotalUpad(restEntries.totalUpad);
      setTotalPending(restEntries.totalPending);
      setTotalExpenses(restEntries.totalExpenses);
      setTotalCard(restEntries.totalCard);
      setTotalPP(restEntries.totalPP);
      setTotalCash(restEntries.totalCash);
      setGrandTotal(restEntries.grandTotal);
      setComputerAmount(restEntries.computerAmount);
    }
  }, [selectedDate, restEntries]);

  const handleDateChange = (newDate) => {
    if (newDate) {
      const formattedDate = newDate.format("DD-MM-YYYY");
      if (formattedDate !== selectedDate) {
        setSelectedDate(formattedDate);
      }
    }
  };

  const processRestUpadData = (data) => {
    return data.filter((row) => {
      return row.amount > 0 && row.fullname;
    });
  };
  const processRestPendingData = (data) => {
    return data.filter((row) => {
      return row.amount > 0 && row.fullname;
    });
  };
  const processRestExpensesData = (data) => {
    return data.filter((row) => {
      return row.amount > 0 && row.expenseName;
    });
  };

  const processRestPendingUsersData = (data) => {
    return data.filter((row) => {
      return row.amount > 0 && row.fullname;
    });
  };

  const restEntryData = useMemo(() => {
    const processedUpadData = processRestUpadData(restUpadData);
    const processedPendingData = processRestPendingData(restPendingData);
    const processedExpensesData = processRestExpensesData(restExpensesData);
    const processedPendingUsersData =
      processRestPendingUsersData(restPendingUsersData);
    return {
      createDate: selectedDate,
      date: selectedDate,
      upad: JSON.stringify(processedUpadData),
      pending: JSON.stringify(processedPendingData),
      expenses: JSON.stringify(processedExpensesData),
      pendingUsers: JSON.stringify(processedPendingUsersData),
      extraAmount: extraAmount,
      totalUpad: totalUpad,
      totalPending: totalPending,
      totalExpenses: totalExpenses,
      totalCard: totalCard,
      totalPP: totalPP,
      totalCash: totalCash,
      grandTotal: grandTotal,
    };
  }, [
    selectedDate,
    restUpadData,
    restPendingData,
    restPendingUsersData,
    restExpensesData,
    extraAmount,
    totalUpad,
    totalPending,
    totalExpenses,
    totalCard,
    totalPP,
    totalCash,
    grandTotal,
  ]);

  const resetForm = () => {
    setRestUpadData(restUpadInitialData);
    setRestPendingData(restPendingInitialData);
    setRestExpensesData(restExpensesInitialData);
    setRestPendingUsersData(restPendingUsersInitialData);
    setExtraAmount(0);
    setTotalUpad(0);
    setTotalPending(0);
    setTotalExpenses(0);
    setTotalCard(0);
    setTotalPP(0);
    setTotalCash(0);
    setGrandTotal(0);
    setComputerAmount(0);
  };

  const handleCreateRestEntry = async () => {
    try {
      if (grandTotal === 0) {
        toast.error("Please enter some data before submitting.");
        return;
      }
      if (extraAmount < 0) {
        toast.error(
          "Extra amount cannot be negative, please check the entries."
        );
        return;
      }
      const confirmSubmit = window.confirm(
        `Are you sure you want to submit entries for ${selectedDate}?`
      );
      if (!confirmSubmit) return;
      dispatch(createRestEntry(restEntryData));
      setSelectedDate(today);
      resetForm();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "An error occurred while creating the entry."
      );
    }
  };

  const handleEditRestEntry = async () => {
    try {
      if (restEntries.grandTotal === 0) {
        toast.error("Please enter some data before submitting.");
        return;
      }
      if (grandTotal === 0) {
        toast.error("Please enter some data before submitting.");
        return;
      }
      if (extraAmount < 0) {
        toast.error(
          "Extra amount cannot be negative, please check the entries."
        );
        return;
      }
      const confirmSubmit = window.confirm(
        `Are you sure you want to update entries for ${selectedDate}?`
      );
      if (!confirmSubmit) return;
      dispatch(updateRestEntryByDate(selectedDate, restEntryData));
      setSelectedDate(today);
      resetForm();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "An error occurred while updating the entry."
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
          <Grid size={{ xs: 12, sm: 12, md: 12, lg: 4.8, xl: 4.8 }}>
            {/* Select Date */}
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
            {/* Upad */}
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
                  Upaad
                </Typography>
                <RestUpadTable
                  fieldOptions={fieldOptions}
                  restUpadData={restUpadData}
                  setRestUpadData={setRestUpadData}
                  selectedDate={selectedDate}
                />
              </Box>
            </Grid>
            {/* Pending */}
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 500,
                    fontSize: "18px",
                    backgroundColor: "#e5ffe0",
                    margin: "16px 0",
                    padding: "4px 16px",
                    borderRadius: "4px",
                    width: "fit-content",
                  }}
                >
                  Levana Baki
                </Typography>
                {restPendingData && restPendingData.length === 0 ? (
                  <CircularProgress sx={{ mt: 2 }} />
                ) : (
                  <RestPendingTable
                    restPendingData={restPendingData}
                    setRestPendingData={setRestPendingData}
                    selectedDate={selectedDate}
                  />
                )}
              </Box>
            </Grid>
            {/* Pending Users */}
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 500,
                    fontSize: "18px",
                    backgroundColor: "#e5ffe0",
                    margin: "16px 0",
                    padding: "4px 16px",
                    borderRadius: "4px",
                    width: "fit-content",
                  }}
                >
                  Aapvana Baki
                </Typography>
                {restPendingData && restPendingData.length === 0 ? (
                  <CircularProgress sx={{ mt: 2 }} />
                ) : (
                  <RestPendingUsersTable
                    restPendingData={restPendingUsersData}
                    setRestPendingData={setRestPendingUsersData}
                    selectedDate={selectedDate}
                  />
                )}
              </Box>
            </Grid>
          </Grid>
          <Grid size={{ xs: 12, sm: 12, md: 12, lg: 7, xl: 7 }}>
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 500,
                    fontSize: "18px",
                    backgroundColor: "#ffe1f2",
                    padding: "4px 16px",
                    borderRadius: "4px",
                    width: "fit-content",
                  }}
                >
                  Expenses
                </Typography>
                <RestExpensesTable
                  restExpensesData={restExpensesData}
                  setRestExpensesData={setRestExpensesData}
                  selectedDate={selectedDate}
                  totalExpenses={totalExpenses}
                  totalUpad={totalUpad}
                  totalPending={totalPending}
                  totalCard={totalCard}
                  setTotalCard={setTotalCard}
                  totalPP={totalPP}
                  setTotalPP={setTotalPP}
                  totalCash={totalCash}
                  setTotalCash={setTotalCash}
                  grandTotal={grandTotal}
                  computerAmount={computerAmount}
                  setComputerAmount={setComputerAmount}
                  extraAmount={extraAmount}
                />
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
                  {restEntries && restEntries.grandTotal > 0 ? (
                    <Button
                      variant="contained"
                      color="secondary"
                      sx={{
                        mx: 1,
                        "&:hover": { backgroundColor: "secondary" },
                      }}
                      onClick={handleEditRestEntry}
                    >
                      Edit
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      sx={{ mx: 1, "&:hover": { backgroundColor: "#64b5f6" } }}
                      onClick={handleCreateRestEntry}
                    >
                      Submit
                    </Button>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </>
    );
  }
};

export default RestEntryPage;
