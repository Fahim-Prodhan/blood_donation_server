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
  },
});

async function run() {
  try {
    const districtCollection = client
      .db("bloodDonationDB")
      .collection("district");
    const upazilaCollection = client
      .db("bloodDonationDB")
      .collection("upazila");
    const usersCollection = client.db("bloodDonationDB").collection("users");
    const donationRequestCollection = client
      .db("bloodDonationDB")
      .collection("donationRequests");
    const blogCollection = client.db("bloodDonationDB").collection("blogs");

    // Get all the district
    app.get("/districts", async (req, res) => {
      try {
        const result = await districtCollection
          .find()
          .sort({ name: 1 })
          .toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching districts:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // Get all the upazila
    app.get("/upazilas", async (req, res) => {
      try {
        const result = await upazilaCollection
          .find()
          .sort({ name: 1 })
          .toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching districts:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // create new user
    app.post("/users", async (req, res) => {
      const userDate = req.body;
      const result = await usersCollection.insertOne(userDate);
      res.send(result);
    });

    // Get users with pagination and filtering
    app.get("/users", async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 0;
        const size = parseInt(req.query.size) || 10;
        const status = req.query.status;
        const query = status ? { IsActive: status } : {};

        const result = await usersCollection
          .find(query)
          .skip(page * size)
          .limit(size)
          .sort({ _id: -1 })
          .toArray();

        const totalCount = await usersCollection.countDocuments(query);

        res.send({
          users: result,
          totalCount,
        });
      } catch (error) {
        res
          .status(500)
          .send({ error: "An error occurred while fetching the users" });
      }
    });

    // get user with email
    app.get("/currentUsers", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      // console.log(email);
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // update user
    app.patch("/users/:email", async (req, res) => {
      const data = req.body;
      const email = req.params.email;
      const query = { email: email };
      // console.log(data);
      const updateDoc = {
        $set: data,
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // update user status
    app.patch("/users/updateStatus/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const data = req.body;

      const updateDoc = {
        $set: data,
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // create donation request
    app.post("/create-donation-request", async (req, res) => {
      const data = req.body;
      const result = await donationRequestCollection.insertOne(data);
      res.send(result);
    });

    // get current user donation request
    app.get("/my-donation-request", async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 0;
        const size = parseInt(req.query.size) || 10;
        const email = req.query.email;
        const query = { email: email };

        const result = await donationRequestCollection
          .find(query)
          .skip(page * size)
          .limit(size)
          .sort({ _id: -1 })
          .toArray();

        const totalCount = await donationRequestCollection.countDocuments(query);

        res.send({
          donationsReq: result,
          totalCount,
        });
      } catch (error) {
        res
          .status(500)
          .send({ error: "An error occurred while fetching the users" });
      }
    });

    // get all donation req
    app.get("/all-blood-donation-request", async (req, res) => {
      const result = await donationRequestCollection
        .find()
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    // get donation req with id
    app.get("/my-donation-request/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationRequestCollection.findOne(query);
      res.send(result);
    });

    // update donation req
    app.patch("/update-donation-request/:id", async (req, res) => {
      const updateData = req.body;
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updateData,
      };
      const result = await donationRequestCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

    // update donation req after donate done
    app.patch("/update-donation-request-done/:id", async (req, res) => {
      const updateData = req.body.formData;
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          donorName: updateData.donorName,
          donorEmail: updateData.donorEmail,
          status: "inprogress",
        },
      };

      const options = { upsert: false };

      try {
        const result = await donationRequestCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to update donation request", error });
      }
    });


    // after inprogress update status
    app.patch('/my-donation-request/updateStatus/:id', async(req,res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const data = req.body

      const updateDoc = {
        $set: data
      }
      const result = await donationRequestCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    // delete donation req
    app.delete("/my-donation-request/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationRequestCollection.deleteOne(query);
      res.send(result);
    });

    //post blog
    app.post("/posts", async (req, res) => {
      const postData = req.body;
      const result = await blogCollection.insertOne(postData);
      res.send(result);
    });

    //get blog
    app.get("/posts", async (req, res) => {
      const status = req.query.status;
      const query = status ? {status: status} : {}
      const result = await blogCollection.find(query).sort({ _id: -1 }).toArray();
      res.send(result);
    });

    // delete blog
    app.delete("/posts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.deleteOne(query);
      res.send(result);
    });

    // get blog with id
    app.get("/posts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.findOne(query);
      res.send(result);
    });

    // update blog
    app.patch("/update-blog/:id", async (req, res) => {
      const updateData = req.body;
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updateData,
      };
      const result = await blogCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // update user status
    app.patch("/blogs/updateStatus/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const data = req.body;

      const updateDoc = {
        $set: data,
      };
      const result = await blogCollection.updateOne(query, updateDoc);
      res.send(result);
    });





    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
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
