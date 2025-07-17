const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { initializeDatabase } = require("./db.connect");
const { Lead, LEAD_ENUMS } = require("./models/LeadModel");
const SalesAgent = require("./models/SalesAgentModel");

const app = express();
app.use(express.json());

app.use(cors({ origin: "*", credentials: true, optionSuccessStatus: 200 }));

initializeDatabase();

// --- Helper Functions ---

async function createLead(newLead) {
  const lead = new Lead(newLead);
  return await lead.save();
}

async function createSalesAgent(newAgent) {
  const agent = new SalesAgent(newAgent);
  return await agent.save();
}

async function readAllAgents() {
  return await SalesAgent.find();
}

// --- Routes ---

// Create Lead
app.post("/leads", async (req, res) => {
  try {
    const { name, source, salesAgent, status, tags, timeToClose, priority } = req.body;


    if (typeof name !== "string") {
      return res.status(400).json({ error: "Invalid input: 'name' must be a string" });
    }

    if (!mongoose.Types.ObjectId.isValid(salesAgent)) {
      return res.status(400).json({ error: "Invalid input: 'salesAgent' must be a valid ObjectId" });
    }

    if (!Number.isInteger(timeToClose) || timeToClose <= 0) {
      return res.status(400).json({ error: "Invalid input: 'timeToClose' must be a positive integer" });
    }

    
    const agentExists = await SalesAgent.findById(salesAgent);
    if (!agentExists) {
      return res.status(404).json({ error: `Sales agent with ID '${salesAgent}' not found.` });
    }

    const leadData = { name, source, salesAgent, status, tags, timeToClose, priority };
    const newLead = await createLead(leadData);
    const populatedLead = await newLead.populate("salesAgent", "id name");
    res.status(201).json(populatedLead);

  } catch (err) {
    console.error("Caught Error:", err);

    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: "Invalid input", details: messages });
    }

    if (err.name === "CastError" && err.kind === "ObjectId") {
      return res.status(400).json({ error: `Invalid input: '${err.path}' must be a valid ObjectId` });
    }

    res.status(500).json({ error: "Server error" });
  }
});

// Get Leads with optional filters
app.get("/leads", async (req, res) => {
  try {
    const { salesAgent, status, tags, source } = req.query;
    const query = {};

    if (salesAgent) {
      if (!mongoose.Types.ObjectId.isValid(salesAgent)) {
        return res.status(400).json({ error: "Invalid salesAgent ID" });
      }
      query.salesAgent = salesAgent;
    }

    if (status && !LEAD_ENUMS.STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid input: 'status' must be one of ${JSON.stringify(LEAD_ENUMS.STATUSES)}`,
      });
    }
    if (status) query.status = status;

    if (source && !LEAD_ENUMS.SOURCES.includes(source)) {
      return res.status(400).json({
        error: `Invalid input: 'source' must be one of ${JSON.stringify(LEAD_ENUMS.SOURCES)}`,
      });
    }
    if (source) query.source = source;

    if (tags) {
      const tagArray = tags.split(",").map((tag) => tag.trim());
      query.tags = { $in: tagArray };
    }

    const leads = await Lead.find(query)
      .populate("salesAgent", "id name")
      .sort({ createdAt: -1 });

    res.status(200).json(leads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// Create Sales Agent
app.post("/agents", async (req, res) => {
  try {
    const newAgent = await createSalesAgent(req.body);
    res.status(201).json({ message: "Sales Agent added to database.", agent: newAgent });
  } catch (error) {
    res.status(500).json({ error: "Failed to add Sales Agent." });
  }
});

// Get All Agents
app.get("/agents", async (req, res) => {
  try {
    const agents = await readAllAgents();
    res.status(200).json({ agents });
  } catch (error) {
    console.error("Error fetching agents:", error);
    res.status(500).json({ error: "Failed to fetch agents." });
  }
});

// --- Server Start ---
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
