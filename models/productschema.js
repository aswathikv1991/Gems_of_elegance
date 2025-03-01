const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
      productId: { type: String, required: true, unique: true, trim: true },
      name: { type: String, required: true, trim: true },
      material: { type: String, required: true, trim: true },
      color: { type: String, required: true, trim: true },
      description: { type: String, required: true, trim: true },
      price: { type: Number, required: true, min: 0 },
      sku: { type: String, required: true, unique: true, trim: true },
      image: [{ type: String, required: true, trim: true }], // Array of image URLs
      quantity: { type: Number, required: true, min: 0 },
      categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
      isFeatured: { type: Boolean, default: false },
      stockStatus: { type: String, enum: ["In Stock", "Out of Stock"], default: "In Stock" },
      reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
      status: { type: String, enum: ["Listed", "Unlisted", "Blocked"], default: "Listed" },

    },
    { timestamps: true }
  );
  
  const Product = mongoose.model("Product", productSchema);
  module.exports = Product;
  