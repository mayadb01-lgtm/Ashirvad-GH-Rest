import { Router } from "express";
import RestStaff from "../model/restStaff.js";
import Entry from "../model/entry.js";
import dayjs from "dayjs";

const router = Router();

// Get guest full name from entries from the last 7 days
router.get("/get-pending-rest", async (req, res) => {
  try {
    const startDate = dayjs().subtract(7, "day").format("DD-MM-YYYY");
    const endDate = dayjs().format("DD-MM-YYYY");

    console.log("Start Date:", startDate);
    console.log("End Date:", endDate);

    // Fetch RestStaff and Entries concurrently for better performance
    const [staff, entries] = await Promise.all([
      RestStaff.find(
        {},
        {
          fullname: 1,
          mobileNumber: 1,
          _id: 1,
          business: "Restaurant",
        }
      ).lean(),
      Entry.find(
        { date: { $gte: startDate, $lte: endDate } },
        { entry: 1, date: 1, _id: 0 }
      ).lean(),
    ]);

    console.log("Fetched Staff:", JSON.stringify(staff, null, 2));
    console.log("Fetched Entries:", JSON.stringify(entries, null, 2));

    // Flatten entry arrays and merge into one list
    const ghUsers = entries.flatMap((doc) =>
      doc.entry.map((e) => ({
        _id: e._id,
        fullname: e.fullname,
        mobileNumber: e.mobileNumber,
        business: "Guest House - Last 7 Days",
      }))
    );

    console.log("Merged Entries:", JSON.stringify(ghUsers, null, 2));

    res.status(200).json({
      success: true,
      data: [...staff, ...ghUsers],
    });
  } catch (error) {
    console.error("Error fetching pending rest data:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

export default router;
