const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const client = new MongoClient(process.env.DB_URI)
const db = client.db("ExerciseTracker")
const users = db.collection("users")

app.use(cors())
app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  // console.log(req.body)
  newUsername = req.body.username
  const insertedDocument = await users.insertOne({
    username: newUsername,
    count: 0,
    log: []
  });
  // console.log("THE INSERTED DOCUEMNT IS...", insertedDocument.insertedId.toString()) 
  res.json({
    username: newUsername,
    _id: insertedDocument.insertedId.toString()
  })
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  // console.log(req.body)
  // console.log(req.params)
  let requestBody = req.body;
  requestBody.duration = +requestBody.duration
  delete requestBody[':_id']
  requestBody['_id'] = req.params._id
  if (!requestBody.date) {
    requestBody.date = new Date().toDateString();
  } else if (requestBody.date) {
    requestBody.date = new Date(requestBody.date).toDateString()
  }
  // console.log("UPDATED request body date:", requestBody)
  const newObjectToInsert = { ...requestBody }
  delete newObjectToInsert['_id']

  const nid = new ObjectId(req.params._id)
  const filter = { _id: nid };
  const updateDoc = {
    $inc: { count: 1 },
    $push: {
      log: newObjectToInsert
    }
  }
  const addExerciseToDB = await users.updateOne(filter, updateDoc);
  // console.log(addExerciseToDB);

  const userJustUpdated = await users.findOne({ _id: nid }, { username: 1 })
  // console.log(userJustUpdated)

  const informationToReturnToUser = {
    username: userJustUpdated.username,
    ...requestBody
  }

  res.json(informationToReturnToUser)
})

app.get('/api/users/:_id/logs', async (req, res) => {
  // console.log(req.params)
  console.log(req.query)

  const nid = new ObjectId(req.params._id)
  const userFound = await users.findOne({ _id: nid })
  userFound._id = userFound._id.toString()
  console.log("LOOK HERE", userFound)

  if(req.query.from) {
    const fromTimeStamp = Date.parse(req.query.from)
    userFound.log = userFound.log.filter(item => {
      if(Date.parse(item.date) >= fromTimeStamp) {
        return item
      }
    })    
  } else if(req.query.to) {
    const toTimeStamp = Date.parse(req.query.to)
    userFound.log = userFound.log.filter(item => {
      if(Date.parse(item.date) <= toTimeStamp) {
        return item
      }
    })    
  } else if(req.query.limit) {
    const limitNum = req.query.limit
    userFound.log = userFound.log.filter((item, index) => {
      if(index < limitNum) {
        return item
      }
    })
  }

  res.json(userFound)
})

app.get('/api/users', async (req, res) => {
  const arrayOfAllUsersInDB = await users.find({}).project({ username: 1, _id: 1 }).map(({ _id, ...d }) => ({ _id: _id.toString(), ...d })).toArray();
  // console.log(arrayOfAllUsersInDB)
  res.json(arrayOfAllUsersInDB)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
