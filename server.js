const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid')
const cors = require('cors')
var user = require('./model/user.js')


var now = new Date().toUTCString().slice(0,16)
const mongoose = require('mongoose')


mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track', 
                 {
                  useNewUrlParser: true,
                  useUnifiedTopology: true
                 }).then(() => {
    console.log('Connected to database!');
  })
.catch(error => {
    console.log('Connection failed!');
    console.log(error);
  });

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware
// app.use((req, res, next) => {
//   return next({status: 404, message: 'not found'})
// })

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

app.post("/api/exercise/new-user", (req, res)=> {
  var username = req.body.username;
  if(username === "") {
    return res.json('Path `username` is required.')
  } else {
    CreateUser(username, function(userId) {
      
      res.json({username: username, _id: userId})
    })    
  }
})


app.post("/api/exercise/add", (req, res) =>{
  var userId = req.body.userId;
  var description = req.body.description;
  var duration = req.body.duration;
  var date = req.body.date;
  if(userId==""){
    res.send("unknown_id")
  } else if(description == ""){
    res.send("Path \`duration\` is required.")
  } else if(duration == ""){
    res.send("Path \`duration\` is required.")
  } else if(isNaN(duration)) {
    res.send('Cast to Number failed for value \"' + duration + '\" at path \"duration\"')
  } else if(date === "") {
    date = new Date().toUTCString().slice(0,16);
    CreateExersize(userId, description, duration, date, function(user){
      res.json({description:description,duration:duration,date:user.log[user.log.length-1][2]})
    })
  } else if(!isNaN(new Date(date))) {
    date = new Date(date).toUTCString().slice(0,16);
    CreateExersize(userId, description, duration, date, function(user){
      res.json({description:description,duration:duration,date:user.log[user.log.length-1][2]})
    })
  } else {
    res.send('Cast to Date failed for value \"'+ date + '\" at path \"date\"')
  }
})

app.get("/api/exercise/users", (req, res)=> {
     user.find({}, function (err, users) {
       if(err){
         console.log(err.code)
         res.send(err.code)
       }
       else {
         var arr = [];
       users.forEach((user, index, users)=>{
         arr[index] = {_id:user._id, username:user.username}
       })
        res.send(arr);
       }
       
    });
}) 


app.get("/api/exercise/log", (req,res)=>{
  var userId=req.query.userId;
  var from = req.query.from;
  var to = req.query.to;
  var limit=req.query.limit;
  user.findById({_id:userId}, (err, data)=>{
                if(!data){
                  res.json("unknown_id")
                } else {
                  //sorting logs by date
                var logs = data.log.sort((a,b)=>new Date(a[2])-new Date(b[2]));
                var logs2;
                if(from && to){
                  // console.log('from: ' + from + ' to: ' + to)
                  logs2 = logs.filter((onelog)=>{
                       return (new Date(onelog[2])>new Date(from) 
                               && new Date(onelog[2])<new Date(to));
                   })
                console.log('logs: ' + logs2)
                }  
                else if(from && limit) {
                  // console.log('from: ' + from + ' limit: ' + limit)
                  logs2 = logs.filter((onelog)=>{
                       return new Date(onelog[2])>new Date(from);
                   }).slice(0,Number(limit))
                  // console.log('logs: ' + logs2)
                } else {
                  logs2 = logs;
                }
                res.json({userId:userId, username:data.username, count:logs2.length,
                log:logs2.map((onelog)=>{
                return {description:onelog[0],
                           duration:onelog[1], 
                               date:onelog[2]}
                  })
                  })
                }
  })
})

// app.get("/api/exercise/log", (req,res)=>{
//   var userId=req.query.userId;
//     user.findById({_id:userId}, (err, data)=>{
//                 if(err){
//                   res.json("unknown_id")
//                 } else {
//                   res.json({userId:userId, username:data.username, count:data.__v,
//                       log:data.log.map((onelog)=>{
//                               return {description:onelog[0],
//                                       duration:onelog[1], date:onelog[2]}
//                             })
//                            })
//                 }
//                 })
//     })



function CreateUser(username, callback) {
  console.log(username);
  user.findOne({username:username}, function(err, data) {
    console.log("searching one")
    if(data !== null){
      callback(data._id)
    } else {
      var userId = shortid.generate();
      console.log("generated id: " + userId)
      var data = new user({
        _id: userId,
        username: username,
        log: []
      })
    }
    data.save();
    callback(data._id)
  })
}

function CreateExersize (userId, description, duration, date, callback) {
  var newExercise = [description, duration, date];
  user.findById({_id:userId}, (err, data)=>{
    if(data == null || userId == "") {
      callback('unknown _id')
    } else {
      data.log.push(newExercise);
      data.save();
      callback(data);
    }
  })
}


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})


module.exports = app;
