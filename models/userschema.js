const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
      unique: true,
      sparse:true,
      default:null

    },
    googleId:{
      type:String,
      unique:true,
      sparse:true
    },

    isBlocked: {
      type: Boolean,
      default: false, // True means user is active, false means blocked by admin
    },
    isAdmin: {
      type: Boolean,
      default: false, // False means normal user, true means admin user
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
