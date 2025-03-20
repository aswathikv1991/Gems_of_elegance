const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    }, // Unique coupon code

    discountType: { 
      type: String, 
      enum: ["percentage", "fixed"], 
      required: true 
    }, // Type of discount (percentage or fixed amount)

    discountValue: { 
      type: Number, 
      required: true, 
      min: 0 
    }, // Discount amount (percentage or fixed)

    appliesTo: { 
      type: String, 
      enum: ["cart", "category", "referral"], 
      required: true 
    }, // Whether the discount applies to the whole cart or a category

    category: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Category",
      required: function() { return this.appliesTo === "category"; } 
    }, // Reference to Category (only required if appliesTo is 'category')

    minPurchase: { 
      type: Number, 
      default: 0 
    }, // Minimum order value required to apply the coupon

    maxDiscount: { 
      type: Number, 
      default: null 
    }, // Maximum discount amount (useful for percentage-based discounts)

    expiryDate: { 
      type: Date, 
      required: true 
    }, // Expiration date of the coupon

    usageLimit: { 
      type: Number, 
      default: null 
    }, // Maximum number of times this coupon can be used

    usedCount: { 
      type: Number, 
      default: 0 
    }, // Tracks how many times the coupon has been used

    isActive: { 
      type: Boolean, 
      default: true 
    }, // Whether the coupon is currently active
  },
  { timestamps: true } // Automatically adds createdAt & updatedAt timestamps
);

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
