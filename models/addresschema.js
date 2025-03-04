const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
    {
        houseNumber: { type: String, required: true, trim: true },
        street: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        pincode: { type: String, required: true, trim: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to User Schema
        isDefault: { type: Boolean, default: false } // Flag to mark the default address
    },
    { timestamps: true }
);

const Address = mongoose.model("Address", addressSchema);
module.exports = Address;
