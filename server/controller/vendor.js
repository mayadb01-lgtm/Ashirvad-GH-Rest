import { Router } from "express";
import dayjs from "dayjs";
import RestEntry from "../model/restEntry.js";
import OfficeBook from "../model/officeBook.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const DATE_FORMAT = "DD-MM-YYYY";

/**
 * Credit sources: Restaurant "Aapvana Baki" (pendingUsers) + Office In
 * Debit sources:  Restaurant Expenses (expenses)           + Office Out
 *
 * Returns all rows for the given date range along with the distinct
 * `expenseName` options. The `expenseName` filter is applied on the
 * frontend, not here.
 */
router.get("/get-vendor-entries/:startDate/:endDate", async (req, res) => {
  try {
    const start = dayjs(req.params.startDate, DATE_FORMAT, true);
    const end = dayjs(req.params.endDate, DATE_FORMAT, true);

    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        success: false,
        message: `Invalid date(s). Expected format ${DATE_FORMAT}.`,
      });
    }

    const dateRange = {
      entryCreateDate: {
        $gte: start.startOf("day").toDate(),
        $lte: end.endOf("day").toDate(),
      },
    };
    console.log("dateRange", dateRange);

    // Fetch both sources in parallel instead of sequentially.
    const [restEntries, officeBooks] = await Promise.all([
      RestEntry.find(dateRange, { pendingUsers: 1, expenses: 1 })
        .sort({ entryCreateDate: 1 })
        .lean(),
      OfficeBook.find(dateRange, { officeIn: 1, officeOut: 1 })
        .sort({ entryCreateDate: 1 })
        .lean(),
    ]);

    const restAapvanaEntries = restEntries.flatMap((e) => {
      return e.pendingUsers;
    });

    console.log("restAapvanaEntries", restAapvanaEntries);
    const restExpensesEntries = restEntries.flatMap((e) => {
      const expense = e.expenses || [];
      return expense.map((exp) => {
        if (exp?.isVendor) {
          return exp;
        }
        return [];
      });
    });
    const officeInEntries = officeBooks.flatMap((e) => {
      const officeIn = e.officeIn || [];
      return officeIn.map((officeIn) => {
        if (officeIn?.isVendor) {
          return officeIn;
        }
        return [];
      });
    });
    const officeOutEntries = officeBooks.flatMap((e) => {
      const officeOut = e.officeOut || [];
      return officeOut.map((officeOut) => {
        if (officeOut?.isVendor) {
          return officeOut;
        }
        return [];
      });
    });

    // Unique Return Schema
    // Columns: id, date, fullname, expenseName, modeOfPayment, credit, debit, balance, source
    const buildRow = (entry, { isCredit, defaultMode, source }) => {
      // console.log("entry", entry);
      return {
        // NOTE: with .lean() docs are plain objects, so the Mongoose virtual
        // `.id` getter no longer exists — use `_id` directly instead.
        id: uuidv4(),
        sourceId: entry?.sourceId?.toString() || entry?.id || "",
        createDate: entry?.createDate,
        entryCreateDate: entry?.entryCreateDate,
        fullname: entry?.fullname || "NA",
        expenseName: entry?.expenseName || null,
        modeOfPayment: entry?.modeOfPayment || defaultMode,
        credit: isCredit ? entry?.amount || 0 : 0,
        debit: isCredit ? 0 : entry?.amount || 0,
        source,
      };
    };

    const finalRows = [
      ...restAapvanaEntries.map((e) =>
        buildRow(e, {
          isCredit: true,
          defaultMode: "Rest Aapvana",
          source: "restAapvana",
        })
      ),
      ...restExpensesEntries.map((e) =>
        buildRow(e, {
          isCredit: false,
          defaultMode: "Rest Expense",
          source: "restExpense",
        })
      ),
      ...officeInEntries.map((e) =>
        buildRow(e, {
          isCredit: true,
          defaultMode: "Office In",
          source: "officeIn",
        })
      ),
      ...officeOutEntries.map((e) =>
        buildRow(e, {
          isCredit: false,
          defaultMode: "Office Out",
          source: "officeOut",
        })
      ),
    ];

    console.log("finalRows", finalRows);

    // Sort by the actual entryCreateDate (real Date value), falling back
    // to parsing createDate with an explicit format if it's ever missing.
    finalRows.sort((a, b) => {
      const aTime = a.entryCreateDate
        ? new Date(a.entryCreateDate).getTime()
        : dayjs(a.createDate, DATE_FORMAT).valueOf();
      const bTime = b.entryCreateDate
        ? new Date(b.entryCreateDate).getTime()
        : dayjs(b.createDate, DATE_FORMAT).valueOf();
      return aTime - bTime;
    });

    // Distinct list of product/expense names, for the dropdown that lets
    // the user drill into a single product's credit/debit/balance.
    const expenseNameOptions = [
      ...new Set(finalRows.map((r) => r.expenseName).filter(Boolean)),
    ].sort();

    console.log("expenseNameOptions", expenseNameOptions);

    const rows = finalRows;

    // let runningBalance = 0;
    // rows.forEach((entry) => {
    //   runningBalance += entry.credit - entry.debit;
    //   entry.balance = runningBalance;
    // });

    // Group rows by expenseName -> date, so every row sharing the same
    // (date, expenseName) gets the exact same balance value.
    const dateKeyOf = (entry) =>
      entry.entryCreateDate
        ? dayjs(entry.entryCreateDate).format(DATE_FORMAT)
        : entry.createDate || "NA";

    // expenseName -> Map(dateKey -> { credit, debit, rows[] })
    const groupedByExpense = new Map();

    rows.forEach((entry) => {
      const expenseKey = entry.expenseName || "NA";
      const dateKey = dateKeyOf(entry);

      if (!groupedByExpense.has(expenseKey)) {
        groupedByExpense.set(expenseKey, new Map());
      }
      const dateMap = groupedByExpense.get(expenseKey);

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { credit: 0, debit: 0, rows: [] });
      }
      const bucket = dateMap.get(dateKey);
      bucket.credit += entry.credit;
      bucket.debit += entry.debit;
      bucket.rows.push(entry);
    });

    // Walk each expenseName's dates chronologically, accumulate a running
    // balance PER expenseName, and stamp it onto every row in that bucket.
    groupedByExpense.forEach((dateMap) => {
      const sortedDateKeys = [...dateMap.keys()].sort(
        (a, b) =>
          dayjs(a, DATE_FORMAT).valueOf() - dayjs(b, DATE_FORMAT).valueOf()
      );

      let expenseRunningBalance = 0;
      sortedDateKeys.forEach((dateKey) => {
        const bucket = dateMap.get(dateKey);
        expenseRunningBalance += bucket.credit - bucket.debit;
        bucket.rows.forEach((row) => {
          row.balance = expenseRunningBalance;
        });
      });
    });

    const creditAmountTotal = rows.reduce(
      (sum, entry) => sum + entry.credit,
      0
    );
    const debitAmountTotal = rows.reduce((sum, entry) => sum + entry.debit, 0);
    const totalBalance = creditAmountTotal - debitAmountTotal;

    rows.push({
      id: "Total",
      createDate: "",
      entryCreateDate: null,
      fullname: "",
      expenseName: null,
      modeOfPayment: "",
      credit: creditAmountTotal,
      debit: debitAmountTotal,
      balance: totalBalance,
    });

    return res.status(200).json({
      success: true,
      data: {
        finalRows: rows,
        expenseNameOptions,
        creditAmountTotal,
        debitAmountTotal,
        totalBalance,
      },
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

export default router;
