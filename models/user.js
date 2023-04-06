const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minLength: 6,
  },
  image: {
    type: String,
    required: true,
  },
  places: [
    {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Place",
    },
  ],
});

// userSchema.path("email").validate(async (email) => {
//   const emailCheck = await User.findOne({ email: email });
//   return !emailCheck;
// }, "This email already exist");

const User = mongoose.model("User", userSchema);

module.exports = User;
