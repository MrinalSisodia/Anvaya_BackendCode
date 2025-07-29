const mongoose = require("mongoose");

const LEAD_ENUMS = {
  SOURCES: ["Website", "Referral", "Advertisement", "Cold Call", 'Email', 'Other'],
  STATUSES: ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Closed'],
  PRIORITIES: ["Low", "Medium", "High"],
};

const validateLeadInput = (req, res, next) => {
  const {
    name,
    source,
    salesAgent,
    status,
    tags,
    timeToClose,
    priority
  } = req.body;


  const requiredFields = [name, source, salesAgent, status, tags, timeToClose, priority];
  if (requiredFields.some(field => field === undefined || field === null)) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (typeof name !== "string") {
    return res.status(400).json({ error: "Invalid input: 'name' must be a string" });
  }

  if (!LEAD_ENUMS.SOURCES.includes(source)) {
    return res.status(400).json({
      error: `Invalid input: 'source' must be one of ${JSON.stringify(LEAD_ENUMS.SOURCES)}`
    });
  }

  if (!LEAD_ENUMS.STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid input: 'status' must be one of ${JSON.stringify(LEAD_ENUMS.STATUSES)}`
    });
  }

  if (!LEAD_ENUMS.PRIORITIES.includes(priority)) {
    return res.status(400).json({
      error: `Invalid input: 'priority' must be one of ${JSON.stringify(LEAD_ENUMS.PRIORITIES)}`
    });
  }

  if (!Array.isArray(tags) || tags.some(tag => typeof tag !== "string")) {
    return res.status(400).json({ error: "Invalid input: 'tags' must be an array of strings" });
  }

  if (!Number.isInteger(timeToClose) || timeToClose <= 0) {
    return res.status(400).json({ error: "Invalid input: 'timeToClose' must be a positive integer" });
  }

if (
  !Array.isArray(salesAgent) ||
  salesAgent.length === 0 ||
  salesAgent.some(id => !mongoose.Types.ObjectId.isValid(id))
) {
  return res.status(400).json({
    error: "Invalid input: 'salesAgent' must be a non-empty array of valid ObjectIds"
  });
}

  next();
};

module.exports = validateLeadInput;
