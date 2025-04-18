const User = require("../../models/userschema");
const Address = require("../../models/addresschema");
const nodemailer = require("nodemailer");
require("dotenv").config();
const bcrypt = require("bcrypt");

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
            subject: "Your otp for password reset",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,
        });
        console.log("Email sent", info.response);
       
        if (!info.accepted.length) {
            throw new Error("Failed to send email");
        }
        return true;
    } catch (error) {
       
        throw new Error(`Email sending error: ${error.message}`);
    }
}

const getForgotPassword = async (req, res) => {
    try {
        res.render("user/forgot_password", { user: req.session.user || null })
    }
    catch (error) {
        console.error("Error in forgot password", error);
        res.render("/pageNotFound")
    }
}
const verifyForgotPasswordEmail = async (req, res, next) => {
    try {
        const { email } = req.body
        const findUser = await User.findOne({ email: email })
        if (findUser) {
            const otp = generateOtp()
            const emailSent = await sendVerificationEmail(email, otp)
            if (emailSent) {
                req.session.userOtp = otp
                req.session.email = email

                res.render("user/forgotPass_otp", { user: null, message: "" });
                console.log("OTP", otp)

            }
            else {
                res.render("user/forgot_password", { user: null, message: "Failed to send OTP, please try again." });

            }
        } else {
            res.render("user/forgot_password", { message: "User does not exist" })
        }

    }
    catch (error) {
        next(error);
       

    }
}
const resendForgotOtp = async (req, res, next) => {
    try {
        const email = req.session.email;

        if (!email) {
            const error = new Error("Session expired. Please request OTP again.");
            error.statusCode = 401;
            return next(error);
        }

        const newOtp = generateOtp();
        console.log("New OTP:", newOtp);
        const emailSent = await sendVerificationEmail(email, newOtp);

        if (emailSent) {
            req.session.userOtp = newOtp;
            res.json({ success: true, message: "A new OTP has been sent to your email." });
        } else {
            res.json({ success: false, message: "Failed to send OTP. Please try again." });
        }
    } catch (error) {
        
        next(error);
    }
};
const verifyForgotOtp = async (req, res, next) => {
    try {
        const { otp } = req.body;

        if (!otp) {
            const error = new Error("OTP is required.");
            error.statusCode = 400;
            return next(error);
        }
        if (otp !== req.session.userOtp) {
            return res.render("user/forgotPass_otp", {
                user: null,
                message: "Invalid OTP. Please try again."
            });
        }


        req.session.otpVerified = true;
        return res.redirect("/password/reset");

    } catch (error) {
       
        next(error);
    }
};

const showResetPasswordForm = (req, res, next) => {
    try {
        if (!req.session.otpVerified) {
            return res.redirect("/password/forgot");
        }
        res.render("user/reset_Password", { user: null, message: null });
    } catch (error) {
       
        next(error);
    }
};


const handleResetPassword = async (req, res, next) => {
    try {
        const { password, confirmPassword } = req.body;

        if (!req.session.email) {
            return res.redirect("/password/forgot");
        }

        // Validate password length
        if (!password || password.length < 8) {
            return res.render("user/reset_Password", { user: null, message: "Password must be at least 8 characters long." });
        }

        // Confirm passwords match
        if (password !== confirmPassword) {
            return res.render("user/reset_Password", { user: null, message: "Passwords do not match." });
        }

        // Find the user by email
        const user = await User.findOne({ email: req.session.email });
        if (!user) {
            return res.render("user/reset_Password", { user: null, message: "User not found." });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;

        // Save updated password and clear session
        await user.save();
        req.session.email = null;
        req.session.otpVerified = null;
        req.session.userOtp = null;

        // Store success message in session
        req.session.successMessage = "Password reset successful! Please log in.";

        // Redirect to login page
        res.redirect("/login");
    } catch (error) {
       
        next(error);
        
    }
};


// ------------------ PROFILE MANAGEMENT ------------------

const loadMyAccount = async (req, res, next) => {
    try {
        const user = await User.findById(req.session.user);
        if (!user) return res.redirect("/login");

        res.render("user/myaccount", { user });
    } catch (error) {
       
        next(error);

    }
};

const loadEditProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.session.user);
        if (!user) return res.redirect("/login");

        res.render("user/editProfile", { user });
    } catch (error) {
        next(error);
    }
};

// Send OTP for Email Change
const sendProfileOtp = async (req, res, next) => {
    try {
        const { email } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            const error = new Error("Email already in use.");
            error.statusCode = 400;
            return next(error);
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        console.log("Otp received", otp)
        if (emailSent) {
            req.session.profileOtp = otp;
            req.session.newEmail = email;
            return res.json({ success: true, message: "OTP sent successfully." });
        } else {
            const error = new Error("Failed to send OTP. Please try again.");
            error.statusCode = 500;
            return next(error);
        }
    } catch (error) {
        next(error);
    }
};

// Verify OTP for Email Change
const verifyProfileOtp = async (req, res, next) => {
    try {
        const { otp } = req.body;
        if (otp !== req.session.profileOtp) {
            const error = new Error("Invalid OTP.");
            error.statusCode = 400;
            return next(error);
        }
        req.session.profileOtpVerified = true;
        res.json({ success: true, message: "OTP verified. You can update your email now." });
    } catch (error) {
       
        next(error);
    }
};

// Edit Profile
const editProfile = async (req, res, next) => {
    try {
        console.log("Received Request Body:", req.body); // Debugging step

        const user = await User.findById(req.session.user);
        if (!user) {
            const error = new Error("User not found. Please log in.");
            error.statusCode = 401;
            return next(error);
        }

        let isUpdated = false; // To track if any field is updated

        // Update email if OTP is verified
        if (req.session.profileOtpVerified && req.session.newEmail) {
            user.email = req.session.newEmail;
            isUpdated = true;
        }

        const { name, phone, currentPassword, newPassword } = req.body;

        // Update name if provided
        if (name && name !== user.name) {
            user.name = name;
            isUpdated = true;
        }

        // Update phone if provided
        if (phone && phone !== user.phone) {
            user.phone = phone;
            isUpdated = true;
        }

        // Handle password change
        if (currentPassword && newPassword) {
            const passwordMatch = await bcrypt.compare(currentPassword, user.password);
            if (!passwordMatch) {
                return res.json({ success: false, message: "Current password is incorrect." });
            }

            // Hash the new password before saving
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            isUpdated = true;
        }

        // If nothing was updated, return a message
        if (!isUpdated) {
            return res.json({ success: false, message: "No changes were made to your profile." });
        }

        await user.save();

        // Clear session variables
        req.session.profileOtp = null;
        req.session.newEmail = null;
        req.session.profileOtpVerified = null;

        res.json({ success: true, message: "Profile updated successfully." });
    } catch (error) {
     
        next(error);
    }
};
const renderAddAddressPage = async (req, res, next) => {
    try {
        const user = await User.findById(req.session.user);
        if (!user) return res.redirect("/login");

        res.render("user/addaddress", { user });
    } catch (error) {
        
        next(error);
    }
}


const addAddress = async (req, res, next) => {
    try {


        const userId = req.session.user;


        if (!userId) {
            const error = new Error("User not authenticated. Please log in.");
            error.statusCode = 401;
            return next(error);
        }

        const { houseNumber, street, city, state, pincode } = req.body;

        if (!houseNumber || !street || !city || !state || !pincode) {
            return res.json({ success: false, message: "All fields are required" });
        }

        if (!/^\d{6}$/.test(pincode)) {
            return res.json({ success: false, message: "Invalid pincode. Must be 6 digits." });
        }

        // Check if user already has any address
        const existingAddresses = await Address.find({ userId });

        const newAddress = new Address({
            userId,
            houseNumber,
            street,
            city,
            state,
            pincode,
            isDefault: existingAddresses.length === 0 // First address will be default
        });

        await newAddress.save();
        //console.log("Address saved successfully!");

        res.json({ success: true, message: "Address added successfully!" });

    } catch (error) {

        next(error);
    }
};

const getAddresses = async (req, res, next) => {
    try {
        const userId = req.session.user; // Get logged-in user ID
        if (!userId) {
            const error = new Error("User not authenticated.");
            error.statusCode = 401;
            return next(error);
        }

        const addresses = await Address.find({ userId }); // Fetch addresses for logged-in user
        res.json({ success: true, addresses });
    } catch (error) {

        next(error);
    }
};
const deleteAddress = async (req, res, next) => {
    try {
        const userId = req.session.user; // Ensure user is logged in
        if (!userId) {
            const error = new Error("User not authenticated.");
            error.statusCode = 401;
            return next(error);
        }

        const addressId = req.params.id;
        const address = await Address.findOne({ _id: addressId, userId });

        if (!address) {
            const error = new Error("Address not found or not authorized to delete.");
            error.statusCode = 404;
            return next(error);
        }

        await Address.deleteOne({ _id: addressId, userId });
        return res.json({ success: true, message: "Address deleted successfully." });

    } catch (error) {

        next(error);
    }
};
const editAddressPage = async (req, res, next) => {
    try {
        const userId = req.session.user; // Get logged-in user
        const addressId = req.params.id;

        const address = await Address.findOne({ _id: addressId, userId });

        if (!address) {
            return res.redirect("/myaccount"); // Redirect if address is not found
        }

        res.render("user/editaddress", { address, user: req.session.user });
    } catch (error) {

        next(error);
    }
};

const updateAddress = async (req, res, next) => {
    try {
        const userId = req.session.user;
        const addressId = req.params.id;
        const { houseNumber, street, city, state, pincode } = req.body;

        // Validation
        if (!houseNumber || !street || !city || !state || !pincode) {
            return res.json({ success: false, message: "All fields are required." });
        }

        if (!/^\d{6}$/.test(pincode)) {
            return res.json({ success: false, message: "Pincode must be exactly 6 digits." });
        }

        const updatedAddress = await Address.findOneAndUpdate(
            { _id: addressId, userId },
            { $set: { houseNumber, street, city, state, pincode } },
            { new: true }
        );

        if (!updatedAddress) {
            return res.json({ success: false, message: "Address not found or unauthorized." });
        }

        res.json({ success: true, message: "Address updated successfully!" });
    } catch (error) {

        next(error);
    }
};

const setDefaultAddress = async (req, res, next) => {
    try {
        const { addressId } = req.params;
        const userId = req.session.user;


        if (!userId) {
            const error = new Error("User not authenticated.");
            error.statusCode = 401;
            return next(error);
        }
        // Find the address to be set as default
        const address = await Address.findOne({ _id: addressId, userId });
        if (!address) {
            const error = new Error("Address not found.");
            error.statusCode = 404;
            return next(error);
        }
        // Set all other addresses to isDefault: false
        await Address.updateMany({ userId }, { $set: { isDefault: false } });

        // Set the selected address as default
        address.isDefault = true;
        await address.save();

        // Fetch updated addresses and send to frontend
        const updatedAddresses = await Address.find({ userId });

        res.json({ success: true, message: "Default address updated successfully!", addresses: updatedAddresses });
    } catch (error) {

        next(error);
    }
};



module.exports = {
    loadMyAccount, getForgotPassword, verifyForgotPasswordEmail, resendForgotOtp, verifyForgotOtp, showResetPasswordForm,
    handleResetPassword, loadEditProfile, editProfile, sendProfileOtp, verifyProfileOtp, renderAddAddressPage, addAddress, getAddresses, deleteAddress, updateAddress, editAddressPage, setDefaultAddress
}