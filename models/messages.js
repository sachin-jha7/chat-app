const mongoose = require("mongoose");
const { Schema } = mongoose;

const msgSchema = new Schema({
    roomId: String,
    whoSent: String,
    whoReceived: String,
    msg: String,
    createdAt: {
        type: Date,
        value: Date.now()
    }
});


const Messages = mongoose.model("Messages", msgSchema);

module.exports = Messages;