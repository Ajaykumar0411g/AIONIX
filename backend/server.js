const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const RLAgent = require("./rlAgent");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// ================= DATABASE CONNECTION =================

mongoose.connect(
  "mongodb+srv://aionixUser:w%26DXUPwGum1%24@cluster0.dfdfhfi.mongodb.net/aionix?retryWrites=true&w=majority"
)
.then(() => console.log("✅ MongoDB Atlas Connected"))
.catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ================= SCHEMAS =================

const LogSchema = new mongoose.Schema({
  service: String,
  message: String,
  severity: String,
  anomaly: Boolean,
  timestamp: { type: Date, default: Date.now }
});

const HealingSchema = new mongoose.Schema({
  service: String,
  action: String,
  status: String,
  timestamp: { type: Date, default: Date.now }
});

const QTableSchema = new mongoose.Schema({
  state: String,
  actions: Object
});

// ================= MODELS =================

const Log = mongoose.model("Log", LogSchema);
const Healing = mongoose.model("Healing", HealingSchema);
const QTable = mongoose.model("QTable", QTableSchema);


// ================= RL AGENT =================

const rlAgent = new RLAgent(QTable);

// ================= LOGIC =================

function decideHealingAction(log) {
  if (!log.anomaly) return null;
  return rlAgent.chooseAction(log);
}

app.post("/logs", async (req, res) => {
  try {
    const log = await Log.create(req.body);

    io.emit("newLog", log);

    const action = decideHealingAction(log);

    if (action) {
      const healingEvent = await Healing.create({
        service: log.service,
        action,
        status: "EXECUTED"
      });

      const reward = Math.random() > 0.3 ? 1 : -1;

      await rlAgent.updateQValue(log, action, reward);

      // 🔥 Emit updated Q-table live
io.emit("qtableUpdate", rlAgent.qTable);

      io.emit("healingEvent", healingEvent);
    }

    res.json({ success: true });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ================= GET CLEAN Q-TABLE =================

app.get("/qtable", async (req, res) => {
  try {
    const entries = await QTable.find().lean();

    const formatted = entries.map(entry => ({
      state: entry.state,
      actions: entry.actions
    }));

    res.json(formatted);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch Q-table" });
  }
});


// ================= GET ALL LOGS =================

app.get("/logs", async (req, res) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});




// ================= GET ALL HEALING EVENTS =================

app.get("/healing", async (req, res) => {
  try {
    const events = await Healing.find()
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(events);
  } catch (error) {
    console.error("Healing fetch error:", error);
    res.status(500).json({ error: "Failed to fetch healing events" });
  }
});

// ================= SERVER START =================

server.listen(5000, async () => {
  await rlAgent.loadQTable();
  console.log("🚀 Server running on port 5000");
});