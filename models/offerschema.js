const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // Offer name (e.g., "Diwali Special 20% Off")
    type: { type: String, enum: ["product", "category", "referral"], required: true }, // Type of offer
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: false }, // If offer is for a specific product
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: false }, // If offer is for a category
    discount: { type: Number, required: true, min: 0, max: 100 }, // Discount percentage
    endDate: { type: Date, required: true }, // Offer end date
    status: { type: String, enum: ["active", "inactive"], default: "active" }, // Enable/disable the offer
  },
  { timestamps: true }
);

const Offer = mongoose.model("Offer", offerSchema);
module.exports = Offer;
