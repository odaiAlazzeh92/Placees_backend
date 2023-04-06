const fs = require("fs")
const path = require("path")
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const placesRouter = require("./routes/places-route");
const usersRouter = require("./routes/users-route");
const HttpError = require("./models/http-error");

const app = express();

app.use(bodyParser.json());

app.use("/uploads/images", express.static(path.join(__dirname,'uploads',"images")))

app.use((req,res,next) => {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, x-requested-with, Content-Type, Accept, Authorization")
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE")
  next()
})

// Origin, X-Requested-With, Accept

app.use("/api/places", placesRouter);
app.use("/api/users", usersRouter);

app.use((req, res, next) => {
  const error = new HttpError("Could not find this route", 404);
  throw error;
});

app.use((error, req, res, next) => {
  console.log('ERROR RESPONSE:', error);
  if (req.file){     //multer adds the file property to the request data
    fs.unlink(req.file.path, (err) => {
      console.log(err)
    })
  }
  if (res.headersSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occurred" });
});

mongoose
  .connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.yhyld6w.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`)
  //"mongodb://127.0.0.1:27017/<db_name>"    use this str to connect with local db
  //"mongodb+srv://odaialazzeh:odaialazzeh@cluster0.yhyld6w.mongodb.net/<db_name>?retryWrites=true&w=majority"   use this str to connect with atlas
  .then(() => {
    app.listen(5000, () => {
      console.log("Serving on port 5000");
    });
  })
  .catch((err) => {
    console.log(err);
  });
// use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
