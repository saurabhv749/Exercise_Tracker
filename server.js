const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended:false}))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

////// setting up connection
mongoose.connect(process.env.URI,{useUnifiedTopology:true,
useCreateIndex: true,
useNewUrlParser: true,
useFindAndModify:true},(err)=>{
  if(err)
    console.log(err)
  else
   console.log('connected to database')
})


//// schema for user 
const userSchema = new mongoose.Schema({
  username: String,
  count: {type: Number, default: 0},
  log : [{
  description:{ type:String , default: ""},
  duration: {type: Number, default: 0},
  date :Date,
}]
})
////// user model
const User = mongoose.model('user',userSchema);

//  adding new user to database
app.post("/api/users",function(req,res){
  let usrs = User.findOne({username:req.body.username},{username:1})
      if(!usrs.username)           /// username not taken
      {let x = new User({
      username: req.body.username
      })

      x.save(function(err,doc){
        if(err)
        console.log(err)
        else{
          const {username,_id} = doc
          res.json({_id,username})
        }
      })}
    else
     res.send("Username already taken")

})
// //////  to get all the users registered to the database
app.get('/api/users',function(req,res){

  User.find({},{username:1,id:1},(err,data)=>{
    if(!err)
      res.json(data)
  })
})
// ////// adding exercise fields to database of existing users
app.post('/api/users/:_id/exercises',function(req,res){
  let {description,duration,date} = req.body

  date = (date== undefined) ? new Date().toDateString() : new Date(date).toDateString()

  let ex = {
    description,
    duration: +duration,
    date,
  }

  User.updateOne({_id: req.params._id},
  {
   $push : {log : ex },
   $inc : {count: 1 }
  },
  function(err,doc){
    if(err)
    res.send('no such user exists. (Id Incorrect)')
    else{
        User.findOne({_id : req.params._id},function(err,data){  //only for username
          if(err)
           res.send('There is no such user log.')
          else{
            const {username} = data
            res.json({_id:req.params._id,username,...ex})
          }
        })
    }
   }
 )

})

///// get request to get all the info 

app.get('/api/users/:_id/logs',function(req,res){
  
let {to,from,limit} = req.query

User.findOne({_id:req.params._id},{__v:0,"log._id":0},function(err,doc){
  if(err)
  console.log(err)
 else if(doc === null)
   res.send('No Such User')
  else           ///// we found the user ///
   {  console.log(doc)
      let filtered =[]

      if(from!== undefined && to!== undefined)
       {
         doc.log.map(d=>{
           if(d.date>= new Date(from) && d.date<= new Date(to) )
            filtered.push(d)
         })
       }
       else
         filtered = doc.log
       

      if(limit!== undefined)
       filtered.splice(0,Number(limit))

    const {_id,username} = doc

    if(from!== undefined && to!== undefined)  
       { res.json({
          _id,
          username,
          from:new Date(from).toDateString(),
          to:new Date(to).toDateString(),
          count:filtered.length,
          log:filtered
        })}
   else
      res.json({
          _id,
          username,
          count:filtered.length,
          log:filtered
        })    
   }

  })
} ) 

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
