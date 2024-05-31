const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.djweinm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const districtCollection = client.db("bloodDonationDB").collection("district");
    const upazilaCollection = client.db("bloodDonationDB").collection("upazila");

    // Get all the district
    app.get('/districts', async (req, res) => {
      try {
          const result = await districtCollection.find().sort({ name: 1 }).toArray();
          res.send(result);
      } catch (error) {
          console.error("Error fetching districts:", error);
          res.status(500).send("Internal Server Error");
      }
  });

    // Get all the upazila
    app.get('/upazilas', async (req, res) => {
      try {
          const result = await upazilaCollection.find().sort({ name: 1 }).toArray();
          res.send(result);
      } catch (error) {
          console.error("Error fetching districts:", error);
          res.status(500).send("Internal Server Error");
      }
  });
    
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
   
  }
}
run().catch(console.dir);



app.get("/", async (req, res) => {
  res.send("Testing Server");
});
app.listen(port, () => {
  console.log("Blood Donation running at ", port);
});
