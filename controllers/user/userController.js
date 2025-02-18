const User = require("../../models/userschema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");

const loadHomepage = async (req, res) => {
    try {
        let user = null;
        if (req.session.user) {
            user = await User.findById(req.session.user);
        }
        res.render("user/home", { user }); // Pass user data to the view
    } catch (error) {
        console.log("Home page not found", error);
        res.status(500).send("Server error");
    }
};

/*const loadSignup = async (req, res) => {
    try {
        if (req.session.user) {
            return res.redirect("/"); // If the user is already logged in, redirect to homepage
        }
        return res.render("user/signup", { user: req.session.user, message: "" });
    } catch (error) {
        console.log("Signup page not loading", error);
        res.status(500).send("Server error");
    }
};*/
const loadSignup = async (req, res) => {
    try {
        if (req.session.user) {
            // Fetch the full user object from the database
            const user = await User.findById(req.session.user);
            return res.redirect("/"); // If the user is already logged in, redirect to homepage
        }
        return res.render("user/signup", { user: null, message: "" }); // Pass user as null for non-logged-in users
    } catch (error) {
        console.log("Signup page not loading", error);
        res.status(500).send("Server error");
    }
};

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });
        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,
        });
        console.log("Email sent", info.response);
        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
}



/*const signup = async (req, res) => {
    try {
        const { name, email, password, confirmPassword, phone } = req.body;
        
        if (password !== confirmPassword) {
            return res.render("user/signup", { message: "Password do not match", name, email, phone });
        }

        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("user/signup", { message: "User with this email id already exists", name, email, phone });
        }

        const otp = generateOtp();
        console.log("OTP sent", otp);

        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json("email.error");
        }

        req.session.userOtp = otp;
        req.session.user = { name, email, password, phone };

        res.render("user/verifyotp", { user: req.session.user }); // Use req.session.user here
        console.log("OTP stored in session", req.session.userOtp);
    } catch (error) {
        console.error("Signup error", error);
        res.redirect("/pageNotFound");
    }
};*/
const signup = async (req, res) => {
    try {
        const { name, email, password, confirmPassword, phone } = req.body;

        if (password !== confirmPassword) {
            return res.render("user/signup", { 
                message: "Password do not match", 
                name, 
                email, 
                phone, 
                user: null // Pass user as null for non-logged-in users
            });
        }

        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("user/signup", { 
                message: "User with this email id already exists", 
                name, 
                email, 
                phone, 
                user: null // Pass user as null for non-logged-in users
            });
        }
        const findUserByPhone = await User.findOne({ phone });
        if (findUserByPhone) {
            return res.render("user/signup", {
                message: "User with this phone number already exists",
                name,
                email,
                phone,
                user: null,
            });
        }
        const otp = generateOtp();
        console.log("OTP sent", otp);

        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json("email.error");
        }

        req.session.userOtp = otp;
        req.session.user = { name, email, password, phone };

        res.render("user/verifyotp", { user: null }); // Pass user as null for non-logged-in users
        console.log("OTP stored in session", req.session.userOtp);
    } catch (error) {
        console.error("Signup error", error);
        res.redirect("/pageNotFound");
    }
};

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.error("Error hashing password", error);
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        if (otp === req.session.userOtp) {
            const user = req.session.user;
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
                ...(user.googleId && { googleId: user.googleId })
            });

            await saveUserData.save();
            req.session.user = saveUserData._id;
            res.json({ success: true, redirectUrl: "/" });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP, please try again" });
        }
    } catch (error) {
        console.error("Error verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};

const resendOtp = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.email) {
            return res.status(400).json({ success: false, message: "Session expired. Please sign up again." });
        }

        const { email } = req.session.user;
        const newOtp = generateOtp();

        console.log("Resending OTP:", newOtp);

        const emailSent = await sendVerificationEmail(email, newOtp);
        if (!emailSent) {
            return res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again later." });
        }

        req.session.userOtp = newOtp;

        res.json({ success: true, message: "New OTP sent successfully." });
    } catch (error) {
        console.error("Error resending OTP:", error);
        res.status(500).json({ success: false, message: "An error occurred. Please try again." });
    }
};

const loadLogin = async (req, res) => {
    try {
        if (req.session.user) {
            return res.redirect("/"); // If the user is already logged in, redirect to homepage
        }
        return res.render("user/login", { user: null, message: "" });
    } catch (error) {
        console.log("Login page not loading", error);
        res.status(500).send("Server error");
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ isAdmin: 0, email: email });

        if (!findUser) {
            return res.render("user/login", { message: "User not found" });
        }
        if (findUser.isBlocked) {
            return res.render("user/login", { message: "User is blocked by admin" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render("user/login", { message: "Incorrect password" });
        }

        req.session.user = findUser._id;
        req.session.userName = findUser.name;

        res.redirect("/");
    } catch (error) {
        console.error("Login error", error);
        res.render("user/login", { message: "Login failed, please try again later" });
    }
};

const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error("Logout error", err);
            }
            res.redirect("/");
        });
    } catch (error) {
        console.error("Error logging out", error);
        res.redirect("/pageNotFound");
    }
};

const pageNotFound = async (req, res) => {
    try {
        const user = req.session.user ? await User.findById(req.session.user) : null;
        res.render("user/page404", { user });  // Always pass 'user'
    } catch (error) {
        console.error("Error loading 404 page", error);
        res.redirect("/");
    }
}


module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,logout
   
}
