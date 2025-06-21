export const paymentColors = {
  Card: "rgb(75, 144, 127)",
  PPC: "rgb(199, 133, 189)",
  PPS: "rgb(134, 165, 55)",
  Cash: "rgb(44, 190, 132)",
  UnPaid: "rgb(234,138,122)",
  Summary: "rgb(31, 123, 0)",
  Select: "transparent",
};

export const typeColors = {
  Select: "transparent",
  Single: "rgb(44, 190, 132)",
  Couple: "rgb(75, 144, 127)",
  Family: "rgb(199, 133, 189)",
  Employee: "rgb(134, 165, 55)",
  NRI: "rgb(234,138,122)",
  Foreigner: "rgb(230, 100, 100)",
  Group: "rgb(100, 150, 200)",
  Other: "rgb(255, 170, 50)",
};

// modeSummaryColumn for DataGrid SummaryTable
export const modeSummaryColumn = [
  { field: "id", headerName: "Day/Night", width: 90 },
  { field: "rate", headerName: "Rate", width: 40 },
  { field: "fullname", headerName: "Full Name", width: 100 },
  { field: "noOfPeople", headerName: "People", width: 67 },
];

export const finalModeColumns = [
  { field: "id", headerName: "Revenue", width: "160" },
  { field: "totals", headerName: "Total", width: "160" },
];

export const processEntries = (data, period, selectedDate, currentDateTime) => {
  return data
    .filter(
      (row) =>
        row.rate !== 0 &&
        row.noOfPeople !== 0 &&
        row.type !== "" &&
        row.modeOfPayment !== ""
    )
    .map((row) => ({
      ...row,
      period,
      date: selectedDate,
      createDate: selectedDate,
      updatedDateTime: currentDateTime,
    }))
    .sort((a, b) => a.roomNo - b.roomNo);
};

export const processUpdateEntries = (data, period, selectedDate) => {
  return data
    .filter(
      (row) =>
        row.rate !== 0 &&
        row.noOfPeople !== 0 &&
        row.type !== "" &&
        row.modeOfPayment !== ""
    )
    .map((row) => ({
      ...row,
      period,
      date: selectedDate,
      updatedDateTime: currentDateTime,
      createDate: row.createDate,
    }))
    .sort((a, b) => a.roomNo - b.roomNo);
};

// Table Component

export const currentDateTime = new Date().toString();

export const fullNameOptions = [
  { title: "John Doe" },
  { title: "Jane Doe" },
  { title: "John Smith" },
  { title: "Jane Smith" },
];

export const mobileNumberOptions = [
  { title: 1234567890 },
  { title: 9876543210 },
  { title: 1111111111 },
  { title: 2222222222 },
];

export const categories = [
  { title: "Category 1" },
  { title: "Category 2" },
  { title: "Category 3" },
  { title: "Category 4" },
];

// const restUpadInitialData = Array.from({ length: 10 }, (_, i) => ({
//   id: i + 1,
//   fullname: fullNameOptions[0].title,
//   mobileNumber: mobileNumberOptions[0].title,
//   amount: Math.floor(Math.random() * (1000 - 100 + 1) + 100),
//   createDate: selectedDate,
// }));

// const restPendingInitialData = Array.from({ length: 10 }, (_, i) => ({
//   id: i + 1,
//   fullname: fullNameOptions[1].title,
//   mobileNumber: mobileNumberOptions[1].title,
//   amount: Math.floor(Math.random() * (1000 - 100 + 1) + 100),
//   createDate: selectedDate,
// }));

// const restExpensesInitialData = Array.from({ length: 10 }, (_, i) => ({
//   id: i + 1,
//   amount: Math.floor(Math.random() * (1000 - 100 + 1) + 100),
//   fullname: fullNameOptions[3].title,
//   mobileNumber: mobileNumberOptions[2].title,
//   category: categories[3].title,
//   createDate: selectedDate,
// }));

export const initializeReservationData = () => {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    reservationId: Date.now() + i,
    fullname: "",
    mobileNumber: 0,
    noOfPeople: 0,
    checkInTime: "",
    checkOutTime: "",
    advancePayment: 0,
    advancePaymentDate: "",
    rate: 0,
    modeOfPayment: "",
    period: "reservation",
    discount: 0,
  }));
};

export const MODE_OF_PAYMENT_OPTIONS = [
  "Cash",
  "Card",
  "PP",
  "PPS",
  "PPC",
  "UnPaid",
];

export const GH_MODE_OF_PAYMENT_OPTIONS = [
  "Cash",
  "Card",
  "PPC",
  "PPS",
  "UnPaid",
];

export const DATE_FORMAT = "DD-MM-YYYY";
