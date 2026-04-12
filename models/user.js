const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
    fullName: String,
    username: String,
    email: {
        type: String,
        unique: true
    },
    password: String,
    imageUrl: {
        type: String,
        default: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTq2k2sI1nZyFTtoaKSXxeVzmAwIPchF4tjwg&s",
        set: (v) => v === "" ? "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTq2k2sI1nZyFTtoaKSXxeVzmAwIPchF4tjwg&s" : v
    },
    friends: [
        {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    notifications: [
        {
            type: String
        }
    ],
});

const User = mongoose.model("User", userSchema);

module.exports = User;