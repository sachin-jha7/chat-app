const socket = io();



const form = document.querySelector(".form");
const input = document.querySelector(".input");

const allCards = document.querySelectorAll(".card-container .card");
// console.log(allCards);

let roomId;
let cardId;


// Showing chat history on selection of a chat

// console.log(allCards)
for (let card of allCards) {
    card.addEventListener("click", () => {
        // console.log("clicked")
        manageChatSelection(card);
    });
}

function joinRoom() {
    socket.emit("join-room", ({ roomId }));

}


// // Login page navigations 

// const openSignupFormBtn = document.querySelector("")

// console.log(currUserId);

// Side Bar navigations



const closeChatBtn = document.querySelector(".go-back-to-friends-btn");
closeChatBtn.addEventListener("click", () => {
    document.querySelector(".chat-section").style.top = "100%";
})

const showProfileBtn = document.querySelector(".show-profile-btn");
showProfileBtn.addEventListener("click", () => {
    document.querySelector(".profile-section").style.top = "0";
})

const closeProfileBtn = document.querySelector(".profile-section .go-back-to-friends-btn");
closeProfileBtn.addEventListener("click", () => {
    document.querySelector(".profile-section").style.top = "100%";
})



const findPeopleBtn = document.querySelector(".find-people-btn");
const findPeopleCrossBtn = document.querySelector(".find-people-cross-btn");
const peopleSearchContainer = document.querySelector(".people-search-bar");

findPeopleBtn.addEventListener("click", () => {
    peopleSearchContainer.style.top = "0";
});

findPeopleCrossBtn.addEventListener("click", () => {
    peopleSearchContainer.style.top = "100%";
});


const getNotificationBtn = document.querySelector(".notifi-btn");
const notificationBar = document.querySelector(".notification-bar");
const notificationCloseBtn = document.querySelector(".notification-cross-btn");

getNotificationBtn.addEventListener("click", async () => {
    socket.emit("get-notifications", ({ currUserId }));
    notificationBar.style.top = "0";
    // notificationIcon.style.color = "gainsboro";
});
notificationCloseBtn.addEventListener("click", () => {
    notificationBar.style.top = "100%";
});


// Managing printing notifications

const notificationContainer = document.querySelector(".notification-container");
socket.on("print-notifications", ({ notificationArray }) => {
    notificationContainer.innerHTML = "";
    // document.querySelector(".fa-circle").style.display = "inline-block";
    for (let notification of notificationArray) {
        let div = document.createElement("div");
        div.classList.add("notification-card");
        let img = document.createElement("img");
        img.src = notification.imageUrl;
        div.appendChild(img);
        let p = document.createElement("p");
        p.innerHTML = `<b>${notification.fullName}</b> has sent you connection request.`;
        div.appendChild(p);
        let btnDiv = document.createElement("div");
        btnDiv.classList.add("btns");

        let btn1 = document.createElement("button");
        btn1.setAttribute("id", `${notification._id}`);
        btn1.classList.add("accept-req-btn");
        btn1.innerHTML = "&#10004;Accept";
        btnDiv.appendChild(btn1);
        btn1.addEventListener("click", function () {
            const requestedUserId = btn1.id;

            btn1.innerText = "Accepted";
            btn1.nextElementSibling.style.display = "none";
            setTimeout(() => {
                notificationContainer.removeChild(div);
            }, 2000);
            // const acceptedUserId = notification._id;
            socket.emit("remove-notifications", ({ currUserId, requestedUserId }));
            socket.emit("update-friend-list", ({ requestedUserId, currUserId }));
        });

        let btn2 = document.createElement("button");
        btn2.classList.add("reject-req-btn");
        btn2.innerHTML = "&#10005; Deny";
        btn2.setAttribute("id", `${notification._id}`);
        btnDiv.appendChild(btn2);
        btn2.addEventListener("click", () => {
            const requestedUserId = btn2.id;

            btn2.innerText = "Denied";

            btn2.previousElementSibling.style.display = "none";
            setTimeout(() => {
                notificationContainer.removeChild(div);
            }, 2000);
            // const acceptedUserId = notification._id;
            socket.emit("remove-notifications", ({ currUserId, requestedUserId }));

        })
        div.appendChild(btnDiv);
        notificationContainer.appendChild(div);
    }
})


// Search people

const peopleSearchForm = document.querySelector(".people-search-bar form");
const peopleSearchInput = document.querySelector(".people-search-bar form input");
const userCardContainer = document.querySelector(".user-container");
peopleSearchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (event.submitter.innerText == "Search") {
        // console.log(peopleSearchInput.value);
        const name = peopleSearchInput.value;
        const res = await fetch(`/chats/find/${name}`);
        peopleSearchInput.value = "";
        const jsonRes = await res.json();   // Array of searched user
        // console.log(jsonRes);
        for (let doc of jsonRes) {
            if(doc._id == currUserId) {
                continue;
            }
            const userCard = document.createElement("div");
            userCard.classList.add("user-card");
            const img = document.createElement("img");
            img.src = doc.imageUrl;
            userCard.appendChild(img);
            const p = document.createElement("p");
            p.innerText = doc.fullName;
            userCard.appendChild(p);
            userCard.setAttribute("id", `${doc._id}`);
            const btn = document.createElement("button");
            btn.innerHTML = "&plus; Connect";
            btn.classList.add("connect-btn");

            btn.addEventListener("click", function () {
                // console.log(this.parentElement.id)
                const requestedCardId = this.parentElement.id;
                this.innerHTML = "&#10004;Request Sent";
                this.style.border = "2px solid limegreen";
                this.disabled = true;

                let withDrawBtn = document.createElement("button");
                withDrawBtn.innerHTML = "&#10005; Withdraw";
                withDrawBtn.style.border = "2px solid #ef4444";
                userCard.appendChild(withDrawBtn);
                withDrawBtn.addEventListener("click", () => {
                    btn.innerHTML = "&plus; Connect";
                    btn.style.border = "2px solid #0084ff";
                    btn.disabled = false;
                    userCard.removeChild(withDrawBtn);
                    notificationIcon.style.color = "gainsboro";
                    socket.emit("pull-connection-request-notification", ({ requestedCardId }));
                    socket.emit("get-notifications", ({ currUserId }));

                });
                socket.emit("connection-request", ({ requestedCardId, currUserId }));
            });


            userCard.appendChild(btn);
            userCardContainer.appendChild(userCard);

        }
    }
});






const manageChatSelection = async (card) => {
    cardId = card.id;
    // console.log(cardId);
    roomId = [cardId, currUserId].sort().join("_");

    joinRoom();
    const msg = await fetch(`/chats/${cardId}`);
    const jsonRes = await msg.json();

    const chatNavCard = document.querySelector(".nav-card");
    const img = chatNavCard.querySelector("img");
    img.src = jsonRes.clickedUserInfo.imageUrl;
    const p = chatNavCard.querySelector("p");
    p.innerText = jsonRes.clickedUserInfo.fullName;

    const noChatText = document.querySelector(".no-chat");
    const chatWrapper = document.querySelector(".chat-wrapper");
    noChatText.style.display = "none";
    document.querySelector(".temp-nav").style.display = "none";
    chatWrapper.style.display = "flex";

    if (window.innerWidth < 430) {

        document.querySelector(".chat-section").style.top = "0";
    }

    const chatContainer = document.querySelector(".chat-container");

    if (jsonRes.allMsg.length == 0) {
        chatContainer.innerHTML = '';
    }

    chatContainer.innerHTML = '';
    for (let doc of (jsonRes.allMsg)) {

        if (doc.roomId == roomId) {


            if (doc.whoSent == currUserId) {
                const item1 = document.createElement("p");
                item1.innerText = doc.msg;
                const div1 = document.createElement("div");
                div1.setAttribute("id", "sent-msg");
                div1.appendChild(item1);
                chatContainer.appendChild(div1);
            } else if (doc.whoSent == cardId) {
                const item2 = document.createElement("p");
                item2.innerText = doc.msg;
                const div2 = document.createElement("div");
                div2.setAttribute("id", "received-msg");
                div2.appendChild(item2);
                chatContainer.appendChild(div2);
            }
            else if (doc.whoReceived == cardId) {
                const item2 = document.createElement("p");
                item2.innerText = doc.msg;
                const div2 = document.createElement("div");
                div2.setAttribute("id", "received-msg");
                div2.appendChild(item2);
                chatContainer.appendChild(div2);
            } else if (doc.whoReceived == currUserId) {
                const item2 = document.createElement("p");
                item2.innerText = doc.msg;
                const div2 = document.createElement("div");
                div2.setAttribute("id", "received-msg");
                div2.appendChild(item2);
                chatContainer.appendChild(div2);
            }
        }

    }
}


const friendCardContainer = document.querySelector(".card-container");
socket.on("update-DOM-of-friend-list", ({ friendInfoArray }) => {
    // const currUserFriends = getCurrUserDoc.friends;
    friendCardContainer.innerHTML = "";
    for (let friend of friendInfoArray) {
        let div = document.createElement("div");
        div.classList.add("card");
        div.setAttribute("id", `${friend._id}`);
        let img = document.createElement("img");
        img.src = friend.imageUrl;
        div.appendChild(img);
        
        let p = document.createElement("p");
        p.classList.add("name");
        p.innerText = `${friend.fullName}`;
        div.appendChild(p);
        div.addEventListener("click", () => {
            manageChatSelection(div);
        });
        friendCardContainer.appendChild(div);
    }
});


// Update sender's DOM

socket.on("friend-request-accepted", ({ secondUserfriendInfoArray, requestedUserId }) => {
    // console.log("Your request was accepted by:", data.newFriendId);
    friendCardContainer.innerHTML = "";
    //  console.log(secondUserfriendInfoArray)
    for (let friend of secondUserfriendInfoArray) {
        let div = document.createElement("div");
        div.classList.add("card");
        div.setAttribute("id", `${friend._id}`);
        let img = document.createElement("img");
        img.src = friend.imageUrl;
        div.appendChild(img);
        let p = document.createElement("p");
        p.classList.add("name");
        p.innerText = `${friend.fullName}`;
        div.appendChild(p);
        div.addEventListener("click", () => {
            manageChatSelection(div);
        });
        friendCardContainer.appendChild(div);
        // console.log(userCardContainer.childNodes[1].id);
    }
    // console.log(userCardContainer.childNodes[1].id);
    // const childNodes = userCardContainer.childNodes;
    // for (let i = 1; i < childNodes.length; i++) {
    //     if(childNodes[i].id == requestedUserId) {
    //         userCardContainer.removeChild(childNodes[i]);
    //     }
    // }
});


const notificationIcon = document.querySelector(".notifi-btn i");
socket.on("show-ball", () => {

    notificationIcon.style.color = "#ff1493";
});



// const statusIcon = document.querySelector(".status");
// console.log(statusIcon);

socket.on("user-status-change", (data) => {
    const { userId, status, friendList } = data;
    console.log(`User ${userId} is now ${status}`);

});


// Socket.IO Things

form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value) {
        const msg = input.value;
        socket.emit("send-message", ({ msg, roomId, cardId, currUserId }));
        input.value = "";
        const item = document.createElement("p");
        item.innerText = msg;
        const div = document.createElement("div");
        div.setAttribute("id", "sent-msg");
        div.appendChild(item);
        document.querySelector(".chat-container").appendChild(div);
    }
});

socket.on("receive-message", (msg) => {
    const item = document.createElement("p");
    item.innerText = msg;
    const div = document.createElement("div");
    div.setAttribute("id", "received-msg");
    div.appendChild(item);
    document.querySelector(".chat-container").appendChild(div);
});