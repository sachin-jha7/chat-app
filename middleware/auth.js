const jwt = require("jsonwebtoken");
const User = require("../models/user");
const bcrypt = require("bcryptjs");

module.exports.verify = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).redirect("/login");
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        next();
    } catch (err) {
        res.status(401).redirect('/login');
    }
}


module.exports.signup = async (req, res, next) => {
    let { fullName, email, password } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        return res.status(400).json({ message: "User already eists!" });
    }

    if (!fullName || !password) {
        return res.status(400).send("Invalid Data!");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const username = fullName.trim().toUpperCase();

    const user = await User.create({
        fullName,
        username,
        email,
        password: hashedPassword
    });


    const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000
    })
        .status(201)
        .redirect("/chats");

}


module.exports.login = async (req, res, next) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).send("Invalid email or password!");
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).send("Invalid email or password!");
    }
    const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000
    })
        .status(201)
        .redirect("/chats");

}


module.exports.logout = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "None"
    }).redirect("/login");
}
