const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/kmit-club";

const eventSchema = new mongoose.Schema({
  title: String,
  isCompleted: Boolean,
  eventImages: [String]
});
const Event = mongoose.model("Event", eventSchema);

async function inspect() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");
    const completedEvents = await Event.find({ isCompleted: true });
    console.log("Completed Events:");
    completedEvents.forEach(e => {
      console.log(`- Event: "${e.title}"`);
      console.log(`  Images:`, e.eventImages);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error("Error inspecting DB:", err);
  }
}

inspect();
