const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("Testing Server");
});
app.listen(port, () => {
  console.log("Blood Donation running at ", port);
});
