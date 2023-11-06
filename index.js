const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.igno3bw.mongodb.net/?retryWrites=true&w=majority`;

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
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const assignmentCollection = client
      .db('assignments')
      .collection('published');
    const submitAssignmentCollection = client
      .db('assignments')
      .collection('submitted');

    // all assignment get apis
    app.get('/assignments', async (req, res) => {
      const cursor = assignmentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    //to get single assignment by id api
    app.get('/assignments/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assignmentCollection.findOne(query);
      res.send(result);
    });

    //submitted assignment get apis
    app.get('/submitAssignment', async (req, res) => {
      const cursor = submitAssignmentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // single assignment post apis
    app.post('/assignment', async (req, res) => {
      const singleAssignment = req.body;
      const result = await assignmentCollection.insertOne(singleAssignment);
      res.send(result);
    });

    app.post('/submitAssignment', async (req, res) => {
      const submit = req.body;
      const result = await submitAssignmentCollection.insertOne(submit);
      res.send(result);
    });

    // to update assignment api
    app.put('/assignments/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateAssignment = req.body;
      const assignment = {
        $set: {
          assignment_title: updateAssignment.assignment_title,
          description: updateAssignment.description,
          marks: updateAssignment.marks,
          difficulty: updateAssignment.difficulty,
          dueDate: updateAssignment.updateDueDate,
          thumbnail: updateAssignment.thumbnail,
        },
      };
      const result = await assignmentCollection.updateOne(
        filter,
        assignment,
        options
      );
      res.send(result);
    });

    //to delete assignment api
    app.delete('/assignment/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);

      const query = { _id: new ObjectId(id) };
      const result = await assignmentCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Assignment Champs are ready to study together');
});

app.listen(port, () => {
  console.log(`Assignment Champs server is running on port: ${port}`);
});
