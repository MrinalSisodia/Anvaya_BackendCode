const express = require("express")

const app = express()
const {initializeDatabase} = require("./db.connect")

app.use(express.json())
const cors = require("cors");

const corsOptions = {
  origin: "*",
  credentials: true, 
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
initializeDatabase()

const Lead = require("./models/LeadModel")
const SalesAgent = require("./models/SalesAgentModel")

async function createLead(newLead){
    try {
        const lead = new Lead(newLead)
        const saveLead = await lead.save()
        return saveLead
    } catch (error) {
        throw error
    }
}

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

    const agentExists = await SalesAgent.findById(salesAgent);
    if (!agentExists) {
      return res.status(404).json({ error: `Sales agent with ID '${salesAgent}' not found.` });
    }

    const leadData = { name, source, salesAgent, status, tags, timeToClose, priority };
    const newLead = await createLead(leadData);

    const populatedLead = await newLead.populate('salesAgent', 'id name');

    res.status(201).json(populatedLead);

  } catch (err) {
    if (err.name === 'ValidationError') {
     const messages = Object.values(err.errors).map(e => e.message);
return res.status(400).json({ error: `Invalid input`, details: messages });
    }

    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

async function createSalesAgent(newAgent){
    try {
        const agent = new SalesAgent(newAgent)
        const saveAgent = await agent.save()
        return saveAgent
    } catch (error) {
        throw error
    }
}

app.post("/agents", async (req,res) => {
    try {
       const newAgent = await createSalesAgent(req.body)
        res.status(201).json({message: "Sales Agent added to database.", agent: newAgent})
    } catch (error) {
        res.status(500).json({error: "Failed to add Sales Agent."})
    }
})


async function readAllAgents(){
   try{
const allAgents = await SalesAgent.find()
    return allAgents;
    } catch (error){
        throw error
    }
}
app.get("/agents", async (req, res) =>{
    try {
          const agents = await readAllAgents()
          res.status(200).json({agents})
    } catch (error) {
        res.status(500).json({error: "Failed to fetch agents."})
        console.log(error)
    }

})

  const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});