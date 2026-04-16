if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require("mongoose");

const { cloudinary, upload } = require("./CloudConfig");



mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Connected to DB");
    })
    .catch((err) => {
        console.log(err)
    });

const User = require("./models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "/public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const authMiddleware = require("./middleware/auth");




const Messages = require("./models/messages");

let currUser;
let receiverId;
let allFriendsOfCurrUser;


// home route

app.get("/", (req, res) => {
    res.redirect("/chats");
});

// Index Route

let statusCheckArray = [];

app.get("/chats", authMiddleware.verify, async (req, res) => {
    currUser = req.user.id;

    let friendsArray = [];
    let currUserDoc = await User.findById(currUser);

    allFriendsOfCurrUser = currUserDoc.friends;
    for (let friends of allFriendsOfCurrUser) {
        let friend = await User.findById(friends);
        friendsArray.push(friend);
    }
    statusCheckArray = friendsArray;

    res.render("index.ejs", { currUserDoc, currUser, friendsArray });
});


// upload image route

app.post("/chats", authMiddleware.verify, upload.single("image"), async (req, res) => {
    try {
        // console.log("route hit");
        if (!req.file) {
            return res.status(400).send(`Error: No File`);
        }
        const stream = cloudinary.uploader.upload_stream(
            { folder: "chat-app" },
            async (error, result) => {
                try {
                    if (error) {
                        return res.status(500).send(`Error: ${error.message}`);
                    }
                    if (!currUser) {
                        return res.status(401).send("Unauthorized");
                    }
                    const currUserDoc = await User.findById(currUser);
                    currUserDoc.imageUrl = result.secure_url;
                    await currUserDoc.save();

                    return res.json({
                        success: true,
                        imageUrl: result.secure_url
                    });
                } catch (err) {
                    return res.status(500).send(`Error: ${err.message}`);
                }

            }
        );
        stream.end(req.file.buffer);
    } catch (err) {
        res.status(500).send(`Error: ${err.message}`);
    }
});


let chatRoomName;

//  Show Chat History Route

app.get("/chats/:id", async (req, res) => {
    try {
        receiverId = req.params;
        const clickedUserId = receiverId.id;
        const allMsg = await Messages.find({ roomId: chatRoomName });
        const clickedUserInfo = await User.findById(clickedUserId);
        res.send({ allMsg, clickedUserInfo });
    } catch (err) {
        res.send(`Error: ${err.message}`);
    }
});


// Show users based on search query

app.get("/chats/find/:name", authMiddleware.verify, async (req, res) => {
    try {
        const name = req.params;
        let searchedName = name.name;
        searchedName = searchedName.trim().toUpperCase();
        const userInfo = await User.find({ username: searchedName });
        const CurrUserDoc = await User.findById(currUser);
        const friendsOfCurrUser = CurrUserDoc.friends;
        res.send({ userInfo, friendsOfCurrUser });
    } catch (err) {
        res.send(`Error: ${err.message}`);
    }
});



// render login form

app.get("/login", (req, res) => {
    res.render("login.ejs");
})


// Post login route

app.post("/login", authMiddleware.login);


// Render sign-up form

app.get("/signup", (req, res) => {
    res.render("login.ejs");
})


// post sign-up route

app.post("/signup", authMiddleware.signup);


// Logout route

app.get("/logout", authMiddleware.logout);




// socket.id = connected client's id

let OnlineUsersArray = [];
let OfflineUsersArray = [];

io.on('connection', (socket) => {
    console.log("A user connected");

    socket.emit("friends-list-of-current-user", { friendsCollection: statusCheckArray })

    try {

        if (currUser) {
            const onlineUserToken = socket.handshake.headers.cookie.slice(6);
            const decoded = jwt.verify(onlineUserToken, process.env.JWT_SECRET);
            socket.join(decoded.id);

            OnlineUsersArray.push(decoded.id);
            io.emit("user-status-change", {
                userId: decoded.id,
                status: "Online",
                onlineUsers: OnlineUsersArray
            });

            for (let i = 0; i < OfflineUsersArray.length; i++) {
                if (OfflineUsersArray[i] == decoded.id) {
                    OfflineUsersArray.splice(i, 1);
                }
            }

            socket.on("disconnect", () => {
                // console.log(`User ${decoded.id} disconnected`);
                for (let i = 0; i < OnlineUsersArray.length; i++) {
                    if (OnlineUsersArray[i] == decoded.id) {
                        OnlineUsersArray.splice(i, 1);
                    }
                }
                OfflineUsersArray.push(decoded.id);
                io.emit("user-status-change", {
                    userId: decoded.id,
                    status: "Offline",
                    offlineUsers: OfflineUsersArray
                });
            });
        }
    } catch (err) {
        console.log("wrong token");
        console.log(err);
    }



    socket.on("join-room", async ({ roomId }) => {
        chatRoomName = roomId;
        socket.join(roomId);
        console.log(`Socket: ${socket.id} connected to ${roomId}`);
    });

    socket.on("send-message", async ({ msg, roomId, cardId, currUserId }) => {

        const newMsg = await Messages.create({
            roomId: roomId,
            whoSent: currUserId,
            whoReceived: cardId,
            msg: msg
        });
        // console.log(newMsg);
        socket.to(roomId).emit("receive-message", (msg));
    });

    socket.on("connection-request", async ({ requestedCardId, currUserId }) => {
        const requestedUser = await User.findById(requestedCardId);
        requestedUser.notifications.push(currUserId);
        const requestedUserId = requestedUser._id.toString();

        await requestedUser.save();
        io.to(requestedUserId).emit("show-ball");
    });



    socket.on("pull-connection-request-notification", async ({ requestedCardId }) => {
        const requestedUser = await User.findById(requestedCardId);
        const indexOfIdToRemove = (requestedUser.notifications.length) - 1;
        requestedUser.notifications.splice(indexOfIdToRemove, 1);
        await requestedUser.save();
    });

    socket.on("update-friend-list", async ({ requestedUserId, currUserId }) => {
        const getRequestedUserDoc = await User.findById(requestedUserId);
        getRequestedUserDoc.friends.push(currUserId);
        const getCurrUserDoc = await User.findById(currUserId);
        getCurrUserDoc.friends.push(requestedUserId);
        await getRequestedUserDoc.save();
        await getCurrUserDoc.save();
        const friendsId = getCurrUserDoc.friends;

        const secondUserFriendsId = getRequestedUserDoc.friends;
        const secondUserfriendInfoArray = [];
        for (let friend of secondUserFriendsId) {
            const getFriendInfo = await User.findById(friend);
            secondUserfriendInfoArray.push(getFriendInfo);
        }

        const friendInfoArray = [];
        for (let friend of friendsId) {
            const getFriendInfo = await User.findById(friend);
            friendInfoArray.push(getFriendInfo);
        }
        // console.log(friendInfoArray);
        io.to(requestedUserId).emit("friend-request-accepted", ({ secondUserfriendInfoArray, requestedUserId }));
        socket.emit("update-DOM-of-friend-list", ({ friendInfoArray }));
    });

    socket.on("get-notifications", async ({ currUserId }) => {
        const getCurrUserDoc = await User.findById(currUserId);
        const getNotificationIds = getCurrUserDoc.notifications;

        let notificationArray = [];
        for (let notificationId of getNotificationIds) {
            let newNotification = await User.findById(notificationId);
            notificationArray.push(newNotification);
        }
        socket.emit("print-notifications", ({ notificationArray }));
    });

    socket.on("remove-notifications", async ({ currUserId, requestedUserId }) => {
        const getCurrUserDoc = await User.findById(currUserId);
        const getNotificationIds = getCurrUserDoc.notifications;
        const getIndexOfIdToRemove = getNotificationIds.indexOf(requestedUserId);
        getNotificationIds.splice(getIndexOfIdToRemove, 1);
        await getCurrUserDoc.save();
    });
});


const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});
