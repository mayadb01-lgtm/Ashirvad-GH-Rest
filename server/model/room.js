import { Schema, model } from "mongoose";

const roomSchema = new Schema({
  roomNumber: { type: Number, required: true, unique: true },
  roomType: { type: String, required: true },
  roomCost: { type: Number, required: true },
});

const Room = model("Room", roomSchema);

// ✅ Auto-initialize only if collection is empty
const initRooms = async () => {
  const count = await Room.estimatedDocumentCount();

  if (count === 0) {
    const roomCost = {
      1: 1200,
      2: 1500,
      3: 1500,
      4: 1500,
      5: 1500,
      6: 1200,
      7: 1200,
      8: 1200,
      9: 1400,
      10: 1400,
      11: 1400,
      12: 1400,
      13: 1200,
      14: 1200,
      15: 1200,
      16: 1200,
    };

    const roomType = {
      1: "2 Bed",
      2: "3 Bed",
      3: "3 Bed",
      4: "Deluxe",
      5: "Deluxe",
      6: "2 Bed",
      7: "2 Bed",
      8: "2 Bed",
      9: "3 Bed",
      10: "3 Bed",
      11: "3 Bed",
      12: "3 Bed",
      13: "2 Bed",
      14: "2 Bed",
      15: "2 Bed",
      16: "2 Bed",
    };

    const roomNumber = {
      1: 101,
      2: 102,
      3: 103,
      4: 104,
      5: 105,
      6: 106,
      7: 107,
      8: 108,
      9: 201,
      10: 202,
      11: 203,
      12: 204,
      13: 205,
      14: 206,
      15: 207,
      16: 208,
    };

    const rooms = Object.keys(roomNumber).map((key) => ({
      roomNumber: roomNumber[key],
      roomType: roomType[key],
      roomCost: roomCost[key],
    }));

    await Room.insertMany(rooms);
    console.log("✅ Default rooms initialized");
  }
};

// Immediately run initialization logic
initRooms().catch((err) => console.error("❌ Init failed:", err));

export default model("Room", roomSchema);
