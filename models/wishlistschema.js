const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    }, // Reference to User schema

    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Product", 
      required: true 
    }, // Reference to Product schema
  },
  { timestamps: true } // Automatically adds createdAt & updatedAt
);

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
module.exports = Wishlist;
