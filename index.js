const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      // 'https://assignment-champs-ashiq.web.app',
      // 'https://assignment-champs-ashiq.firebaseapp.com',
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.igno3bw.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middleware for JWT
const verifyToken = async (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log('this token from middleware =', token);
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'forbidden access' });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // Our Collections
    const assignmentCollection = client
      .db('assignments')
      .collection('published');
    const submitAssignmentCollection = client
      .db('assignments')
      .collection('submitted');

    // auth related api
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h',
      });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        })
        .send({ success: true });
    });

    app.post('/logout', (req, res) => {
      const user = req.body;
      console.log(user);
      res
        .clearCookie('token', { maxAge: 0, secure: true, sameSite: 'none' })
        .send({ success: true });
    });

    // all assignment get apis
    app.get('/assignments', async (req, res) => {
      const page = Number(req.query.page);
      const limit = Number(req.query.limit);

      let difficultyQueryObj = {};

      const difficulty = req.query.difficulty;

      if (difficulty) {
        difficultyQueryObj.difficulty = difficulty;
      }

      const cursor = assignmentCollection
        .find(difficultyQueryObj)
        .skip(page * limit)
        .limit(limit);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/assignmentCount', async (req, res) => {
      const total = await assignmentCollection.estimatedDocumentCount();
      res.send({ total });
    });

    //to get single assignment by id api
    app.get('/assignments/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assignmentCollection.findOne(query);
      res.send(result);
    });

    //submitted assignment get apis
    app.get('/submitAssignment', verifyToken, async (req, res) => {
      let statusQueryObj = {};
      const status = req.query.status;
      if (status) {
        statusQueryObj.status = status;
      }

      let submitByQueryObj = {};
      const submitBy = req.query.submitBy;
      if (submitBy) {
        submitByQueryObj.submitBy = submitBy;
      }

      if (submitBy && req.user.email !== submitBy) {
        return res.status(403).send({ message: 'forbidden' });
      }

      const cursor = submitAssignmentCollection.find({
        ...statusQueryObj,
        ...submitByQueryObj,
      });
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
    // submit assignment for mark update api
    app.patch('/submitAssignment/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateMark = req.body;
      const submitMarkAssignment = {
        $set: {
          givenMark: updateMark.givenMark,
          feedback: updateMark.feedback,
          markBy: updateMark.markBy,
          status: updateMark.status,
        },
      };
      const result = await submitAssignmentCollection.updateOne(
        filter,
        submitMarkAssignment,
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
