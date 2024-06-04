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
    const usersCollection = client.db("bloodDonationDB").collection("users");
    const donationRequestCollection = client.db("bloodDonationDB").collection("donationRequests");

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

  // create new user
  app.post('/users', async(req, res)=>{
    const userDate = req.body
    const result = await usersCollection.insertOne(userDate)
    res.send(result)
  })

  // get user with email
  app.get('/users', async(req,res)=>{
    const email = req.query.email;
    const query = {email: email}
    // console.log(email);
    const result = await usersCollection.findOne(query)
    res.send(result)
  })

  // update user
  app.patch('/users/:email', async(req, res)=>{
    const data = req.body
    const email = req.params.email
    const query = {email: email}
    console.log(data);
    const updateDoc = {
      $set:data
    }
    const result = await usersCollection.updateOne(query, updateDoc);
    res.send(result)
  })

  // create donation request
  app.post('/create-donation-request',async(req,res)=>{
    const data = req.body;
    const result = await donationRequestCollection.insertOne(data)
    res.send(result)
  })
    
  // get current user donation request
  app.get('/my-donation-request',async(req,res)=>{
    const email = req.query.email
    const query = {email:email}
    const result = await donationRequestCollection.find(query).sort({_id: -1}).toArray()
    res.send(result)
  })
    
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
