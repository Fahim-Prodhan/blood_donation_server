const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
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
    const paymentCollection = client.db("bloodDonationDB").collection("payments");

    // jwt
    app.post('/jwt',async(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_KEY,{expiresIn:'1h'})
      res.send({token:token})
    })

    // middlewares
    const verifyToken = (req,res,next)=>{
      if(!req.headers.authorization){
        return res.status(401).send({message: 'unauthorize access'})
      }
      const token = req.headers.authorization.split(' ')[1];
      // console.log(token);
      jwt.verify(token,process.env.SECRET_KEY, (err, decoded)=>{
        if(err){
          return res.status(401).send({message: 'unauthorize access'})
        }
        req.decoded = decoded
        next()
      })
    }

    const verifyAdmin = async(req,res,next)=>{
      const email = req.decoded.email;
      const query = {email:email}
      const user = await usersCollection.findOne(query)

      const isAdmin = user?.role === 'admin'
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'})
      }
      next();
    }

    const verifyAdminOrVolunteer = async (req, res, next) => {
      try {
        const email = req.decoded.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
    
        const allowedRoles = ['admin', 'volunteer'];
        if (!user || !allowedRoles.includes(user.role)) {
          return res.status(403).send({ message: 'forbidden access' });
        }
    
        next();
      } catch (error) {
        return res.status(500).send({ message: 'Internal Server Error' });
      }
    };

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
    app.get("/users",verifyToken, verifyAdmin, async (req, res) => {
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
    app.get("/currentUsers", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      // console.log(email);
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // update user
    app.patch("/users/:email", verifyToken, async (req, res) => {
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
    app.patch("/users/updateStatus/:id",verifyToken, verifyAdmin, async (req, res) => {
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
    app.post("/create-donation-request", verifyToken, async (req, res) => {
      const data = req.body;
      const result = await donationRequestCollection.insertOne(data);
      res.send(result);
    });

    // get current user donation request
    app.get("/my-donation-request",verifyToken, async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 0;
        const size = parseInt(req.query.size) || 10;
        const email = req.query.email;
        const status = req.query.status;
        const query = {};

        if (email) query.email = email;
        if (status) query.status = status;

        const result = await donationRequestCollection
          .find(query)
          .skip(page * size)
          .limit(size)
          .sort({ _id: -1 })
          .toArray();

        const totalCount = await donationRequestCollection.countDocuments(
          query
        );

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
    app.get("/all-blood-donation-request",verifyToken, verifyAdminOrVolunteer, async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 0;
        const size = parseInt(req.query.size) || 10;
        const status = req.query.status;
        const query = {};

        if (status) query.status = status;

        const result = await donationRequestCollection
          .find(query)
          .skip(page * size)
          .limit(size)
          .sort({ _id: -1 })
          .toArray();

        const totalCount = await donationRequestCollection.countDocuments(
          query
        );

        res.send({
          allDonations: result,
          totalCount,
        });
      } catch (error) {
        res
          .status(500)
          .send({ error: "An error occurred while fetching the users" });
      }
    });

    // get all donation req for public
    app.get("/all-donation-request-public", async (req, res) => {
      const query = { status: "pending" };
      const result = await donationRequestCollection.find(query).toArray();
      res.send(result);
    });

    // get donation req with id
    app.get("/my-donation-request/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationRequestCollection.findOne(query);
      res.send(result);
    });

    // update donation req
    app.patch("/update-donation-request/:id", verifyToken, async (req, res) => {
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
    app.patch("/update-donation-request-done/:id", verifyToken, async (req, res) => {
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
    app.patch("/my-donation-request/updateStatus/:id",verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const data = req.body;

      const updateDoc = {
        $set: data,
      };
      const result = await donationRequestCollection.updateOne(
        query,
        updateDoc
      );
      res.send(result);
    });

    // update donation status admin and volunteer status
    app.patch("/donation-request/updateStatus/:id",verifyToken, verifyAdminOrVolunteer, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const data = req.body;

      const updateDoc = {
        $set: data,
      };
      const result = await donationRequestCollection.updateOne(
        query,
        updateDoc
      );
      res.send(result);
    });

  

    // delete donation req
    app.delete("/my-donation-request/:id",verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationRequestCollection.deleteOne(query);
      res.send(result);
    });

    // Search Donation Req
    app.get("/search", async (req, res) => {
      const { bloodGroup, district, upazila } = req.query;

      const query = {
        bloodGroup,
        district,
        upazila,
        role: "donor",
      };

      console.log(query);

      try {
        const result = await usersCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching donor:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    //post blog
    app.post("/posts", verifyToken, verifyAdminOrVolunteer, async (req, res) => {
      const postData = req.body;
      const result = await blogCollection.insertOne(postData);
      res.send(result);
    });

    //get blog
    app.get("/posts", verifyToken , verifyAdminOrVolunteer, async (req, res) => {
      const status = req.query.status;
      const query = status ? { status: status } : {};
      const result = await blogCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    // delete blog
    app.delete("/posts/:id", verifyToken, verifyAdmin, async (req, res) => {
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

    // get all public blogs
    app.get("/public-blogs", async (req, res) => {
      const query = { status: "published" };
      const result = await blogCollection.find(query).toArray();
      res.send(result);
    });

    // update blog
    app.patch("/update-blog/:id", verifyToken, verifyAdminOrVolunteer, async (req, res) => {
      const updateData = req.body;
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updateData,
      };
      const result = await blogCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // update blogs status
    app.patch("/blogs/updateStatus/:id", verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const data = req.body;

      const updateDoc = {
        $set: data,
      };
      const result = await blogCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: [
          "card"
        ],
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });


    app.post('/payment', async(req, res)=>{
      const payment = req.body
      const result = await paymentCollection.insertOne(payment)
      res.send(result)
    })

    app.get('/allFunding', verifyToken, async(req, res)=>{
      try {
        const page = parseInt(req.query.page) || 0;
        const size = parseInt(req.query.size) || 10;

        const result = await paymentCollection
          .find()
          .skip(page * size)
          .limit(size)
          .sort({ _id: -1 })
          .toArray();

        const totalCount = await paymentCollection.countDocuments();

        res.send({
          allFunds: result,
          totalCount,
        });
      } catch (error) {
        res
          .status(500)
          .send({ error: "An error occurred while fetching the users" });
      }
    })

    app.get('/total-users', async (req, res) => {
      try {
        const result = await usersCollection.countDocuments();
        res.send({ totalUsers: result });
      } catch (error) {
        console.error('Error counting documents:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    app.get('/total-donation-req', async (req, res) => {
      try {
        const result = await donationRequestCollection.countDocuments();
        res.send({ total: result });
      } catch (error) {
        console.error('Error counting documents:', error);
        res.status(500).send('Internal Server Error');
      }
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
