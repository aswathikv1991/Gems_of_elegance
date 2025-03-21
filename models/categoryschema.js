const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Listed", "Unlisted", "Blocked"], default: "Listed" },
  },
  { timestamps: true } // Automatically adds createdAt & updatedAt
);

const Category = mongoose.model("Category", categorySchema);
module.exports = Category;
