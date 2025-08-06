const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { initializeDatabase } = require("./db.connect");
const Lead = require("./models/LeadModel");
const Comment = require("./models/CommentModel");
const SalesAgent = require("./models/SalesAgentModel");
const validateLeadInput = require("./validateLeadInput");
const Tag = require("./models/TagModel");

initializeDatabase();
const app = express();
app.use(express.json());
app.use(cors());

app.get("/tags", async (req, res) => {
  try {
    const tags = await Tag.find({}, "name"); 
    res.json(tags.map((tag) => tag.name));  
  } catch (err) {
    console.error("Error fetching tags:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Create Lead ---
app.post("/leads", validateLeadInput, async (req, res) => {
  try {
    const newLead = new Lead(req.body);
    const savedLead = await newLead.save();

    const populatedLead = await savedLead.populate("salesAgent", "_id name");
    res.status(201).json(populatedLead);
  } catch (err) {
    console.error("Error creating lead:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Get Leads with Query Filters ---
app.get("/leads", async (req, res) => {
  try {
    const { salesAgent, status, tags, source } = req.query;
    const query = {};

    if (salesAgent) {
  const agentArray = Array.isArray(salesAgent)
    ? salesAgent
    : typeof salesAgent === "string"
    ? salesAgent.split(",")
    : [];

  const invalidAgentId = agentArray.find(id => !mongoose.Types.ObjectId.isValid(id));
  if (invalidAgentId) {
    return res.status(400).json({
      error: "Invalid input: All 'salesAgent' values must be valid ObjectIds",
    });
  }

  query.salesAgent = { $in: agentArray };
}


    if (status) {
      query.status = status;
    }

    if (source) {
      query.source = source;
    }

    if (tags) {
      const tagsArray = Array.isArray(tags)
        ? tags
        : typeof tags === "string"
        ? tags.split(",")
        : [];
      query.tags = { $all: tagsArray };
    }

    const leads = await Lead.find(query).populate("salesAgent", "_id name");
    res.status(200).json(leads);
  } catch (err) {
    console.error("Error fetching leads:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Update Lead ---
app.put("/leads/:id", validateLeadInput, async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ error: "'id' must be a valid Lead Id" });
  }

  try {
    const leadBeforeUpdate = await Lead.findById(id);
    if (!leadBeforeUpdate) {
      return res
        .status(404)
        .json({ error: `Lead with ID '${id}' not found.` });
    }

    const wasClosedBefore = leadBeforeUpdate.status === "Closed";
    const willBeClosedNow = req.body.status === "Closed";

    const updateData = {
      ...req.body,
      // Only set closedAt if lead is *becoming* Closed (and wasn't before)
      ...(willBeClosedNow && !wasClosedBefore && { closedAt: new Date() }),
    };

    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("salesAgent", "_id name");

    res.status(200).json(updatedLead);
  } catch (err) {
    console.error("Error updating lead:", err);
    res.status(500).json({ error: "Failed to update lead." });
  }
});


// --- Delete Lead ---
app.delete("/leads/:id", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ error: "'id' must be a valid Lead Id" });
  }

  try {
    const deletedLead = await Lead.findByIdAndDelete(id);

    if (!deletedLead) {
      return res.status(404).json({
        error: `Lead with ID '${id}' not found.`,
      });
    }

    res.status(200).json({ message: "Lead deleted successfully." });
  } catch (err) {
    console.error("Error deleting lead:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Create Sales Agent ---
const createSalesAgent = async (data) => {
  const newAgent = new SalesAgent(data);
  return await newAgent.save();
};

app.post("/sales-agents", async (req, res) => {
  try {
    if (!req.body.name || !req.body.email) {
  return res.status(400).json({ error: "Name and Email are required." });
}
    const newAgent = await createSalesAgent(req.body);
    res.status(201).json({
      message: "Sales Agent added to database.",
      agent: newAgent,
    });
  } catch (error) {
    console.error("Error creating agent:", error);
    res.status(500).json({ error: "Failed to add Sales Agent." });
  }
});

// DELETE /sales-agents/:id
app.delete("/sales-agents/:id", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "'id' must be a valid Sales Agent Id" });
  }

  try {
    const deletedAgent = await SalesAgent.findByIdAndDelete(id);

    if (!deletedAgent) {
      return res.status(404).json({ error: `Sales Agent with ID '${id}' not found.` });
    }

    res.status(200).json({ message: "Sales Agent deleted successfully." });
  } catch (err) {
    console.error("Error deleting sales agent:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// --- Get All Sales Agents ---
app.get("/sales-agents", async (req, res) => {
  try {
    const agents = await SalesAgent.find({}, "_id name email");
    res.status(200).json(agents);
  } catch (err) {
    console.error("Error fetching sales agents:", err);
    res.status(500).json({ error: "Server error" });
  }
});


//Add comment to lead 
app.post("/leads/:id/comments", async (req, res) => {
  const { id: leadId } = req.params;
  const { commentText, agentId } = req.body;

  // Validate input
  if (!commentText || typeof commentText !== "string") {
    return res.status(400).json({
      error: "Invalid input: 'commentText' is required and must be a string.",
    });
  }

  if (!agentId || !mongoose.Types.ObjectId.isValid(agentId)) {
    return res.status(400).json({
      error: "Invalid input: 'agentId' is required and must be a valid ObjectId.",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(leadId)) {
    return res.status(400).json({ error: "'id' must be a valid Lead Id" });
  }

  try {
    const lead = await Lead.findById(leadId).populate("salesAgent", "name");
    if (!lead) {
      return res.status(404).json({ error: `Lead with ID '${leadId}' not found.` });
    }

    // Check if agentId is actually assigned to the lead
    const isAssigned = lead.salesAgent.some((agent) => agent._id.equals(agentId));
    if (!isAssigned) {
      return res.status(403).json({
        error: "This agent is not assigned to this lead.",
      });
    }

    // Create new comment with selected agent as author
    const newComment = new Comment({
      lead: leadId,
      author: agentId,
      commentText,
    });

    const savedComment = await newComment.save();
    await savedComment.populate("author", "name");

    // 🔁 Fetch and return all updated comments
    const allComments = await Comment.find({ lead: leadId })
      .populate("author", "name")
      .sort({ createdAt: 1 });

    const formattedComments = allComments.map((comment) => ({
      id: comment._id,
      commentText: comment.commentText,
      author: comment.author?.name || "Unknown",
      createdAt: comment.createdAt,
    }));

    res.status(200).json(formattedComments);
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Server error" });
  }
});




app.get("/leads/:id/comments", async (req, res) => {
  const { id: leadId } = req.params;

  // Validate lead ID
  if (!mongoose.Types.ObjectId.isValid(leadId)) {
    return res.status(400).json({ error: "'id' must be a valid Lead Id" });
  }

  try {
    const leadExists = await Lead.findById(leadId);
    if (!leadExists) {
      return res.status(404).json({
        error: `Lead with ID '${leadId}' not found.`,
      });
    }

    const comments = await Comment.find({ lead: leadId })
      .populate("author", "name")
      .sort({ createdAt: 1 });


    const formattedComments = comments.map((comment) => ({
      id: comment._id,
      commentText: comment.commentText,
      author: comment.author?.name || "Unknown",
      createdAt: comment.createdAt,
    }));

    res.status(200).json(formattedComments);
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ error: "Server error" });
  }
});



app.get("/report/summary", async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const closedLastWeek = await Lead.countDocuments({
      status: "Closed",
      closedAt: { $gte: oneWeekAgo },
    });

    const pipelineLeads = await Lead.countDocuments({
      status: { $ne: "Closed" },
    });

    res.status(200).json({
      closedLastWeek,
      pipelineLeads,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch report summary" });
  }
});

app.get("/report/by-agent", async (req, res) => {
  try {
    const data = await Lead.aggregate([
      { $match: { status: "Closed" } },
      { $unwind: "$salesAgent" }, // Flatten salesAgent array
      {
        $group: {
          _id: "$salesAgent",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "salesagents",
          localField: "_id",
          foreignField: "_id",
          as: "agentDetails",
        },
      },
      { $unwind: "$agentDetails" },
      {
        $project: {
          salesAgent: "$agentDetails.name",
          count: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leads by agent" });
  }
});


app.get("/report/status-distribution", async (req, res) => {
  try {
    const data = await Lead.aggregate([
      {
        $match: {
          status: { $ne: "Closed" },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch status distribution" });
  }
});




app.get("/", (req, res) => {
  res.send("Lead Management API is running");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
