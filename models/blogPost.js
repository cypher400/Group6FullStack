const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt"); // Make sure bcrypt is required

const CarDetailsSchema = new Schema({
  make: String,
  model: String,
  year: Number,
  plateNumber: String,
});

const BlogPostSchema = new Schema({
  firstName: String,
  lastName: String,
  licenseNumber: String,
  age: Number,
  dob: Date,
  carDetails: CarDetailsSchema,
});

// Encrypt license number before saving
BlogPostSchema.pre("save", async function (next) {
  if (this.isModified("licenseNumber")) {
    try {
      this.licenseNumber = await bcrypt.hash(this.licenseNumber, 10);
    } catch (err) {
      next(err);
    }
  }
  next();
});

const BlogPost = mongoose.model("BlogPost", BlogPostSchema);
module.exports = BlogPost;
