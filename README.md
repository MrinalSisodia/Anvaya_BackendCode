# API ROUTES

## CREATE LEAD
### Helper function
```jsx
async function createLead(newLead) {
  const lead = new Lead(newLead);
  return await lead.save();
}
```

### Route
```jsx
app.post('/leads', async (req, res) => {
  try {
    const {
      name,
      source,
      salesAgent,
      status,
      tags,
      timeToClose,
      priority
    } = req.body;

    //Custom Validation checks

    if (typeof name !== 'string') {
      return res.status(400).json({ error: "Invalid input: 'name' must be a string" });
    }

      //checks whether the value is a valid MongoDB ObjectId format — a 24-character hexadecimal string.
    if (!mongoose.Types.ObjectId.isValid(salesAgent)) {
      return res.status(400).json({ error: "Invalid input: 'salesAgent' must be a valid ObjectId" });
    }

    if (!Number.isInteger(timeToClose) || timeToClose <= 0) {
      return res.status(400).json({ error: "Invalid input: 'timeToClose' must be a positive integer" });
    }

     // Ensure agent exists
    const agentExists = await SalesAgent.findById(salesAgent);
    if (!agentExists) {
      return res.status(404).json({ error: `Sales agent with ID '${salesAgent}' not found.` });
    }


//Creating the lead in DB from input values
    const leadData = { name, source, salesAgent, status, tags, timeToClose, priority };
    const newLead = await createLead(leadData);
    const populatedLead = await newLead.populate('salesAgent', 'id name');
    res.status(201).json(populatedLead);

  } catch (err) {
    console.error('Caught Error:', err); // Helps Debugging

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: 'Invalid input', details: messages });
    }

catch casting errors(Catch invalid ObjectId formats (not parseable by Mongo))
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      return res.status(400).json({ error: `Invalid input: '${err.path}' must be a valid ObjectId` });
    }

    res.status(500).json({ error: 'Server error' });
  }
});
```