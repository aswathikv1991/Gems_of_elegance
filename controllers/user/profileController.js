const User = require("../../models/userschema"); 
const Address = require("../../models/addresschema"); 
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const session=require("express-session")
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
        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
}

const getForgotPassword=async(req,res)=>{
    try{
        res.render("user/forgot_password",{ user: req.session.user || null })
    }
    catch(error)
    {
        res.render("/pageNotFound")
    }
}
const forgotEmailValid=async(req,res)=>{
    try{
        const {email}=req.body
        const findUser=await User.findOne({email:email})
        if(findUser){
            const otp=generateOtp()
            const emailSent=await sendVerificationEmail(email,otp)
            if(emailSent){
                req.session.userOtp = otp
                req.session.email =  email
        
                res.render("user/forgotPass_otp", { user: null ,message:""});
                console.log("OTP",otp)

            }
            else{
                res.render("user/forgot_password", { user: null, message: "Failed to send OTP, please try again." });

            }
        }else{
            res.render("user/forgot_password",{message:"User does not exist"})
        }

    }
    catch(error)
    {
        res.redirect("/pageNotFound")
    }
}
const resendForgotOtp = async (req, res) => {
    try {
        const email = req.session.email;

        if (!email) {
            return res.json({ success: false, message: "Session expired. Please request OTP again." });
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
        console.error("Error resending OTP:", error);
        res.json({ success: false, message: "Something went wrong. Please try again later." });
    }
};
const verifyForgotOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        if (otp !== req.session.userOtp) {  
            return res.render("user/forgotPass_otp", { 
                user: null, 
                message: "Invalid OTP. Please try again." 
            });
        }

      
        req.session.otpVerified = true;  
        return res.redirect("/reset_password");

    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.redirect("/pageNotFound");
    }
};

const resetPasswordPage = (req, res) => {
    try {
        if (!req.session.otpVerified) {
            return res.redirect("/forgot_password"); 
        }
        res.render("user/reset_Password", {user:null, message: null }); 
    } catch (error) {
        console.error("Error loading reset password page:", error);
        res.redirect("/pageNotFound"); 
    }
};


    const resetPassword = async (req, res) => {
        try {
            const { password, confirmPassword } = req.body;
    
            if (!req.session.email) {
                return res.redirect("/forgot_password");
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
            console.error("Error resetting password:", error);
            res.render("user/reset_Password", { user: null, message: "Something went wrong. Please try again." });
        }
    };
    

// ------------------ PROFILE MANAGEMENT ------------------

const loadMyAccount = async (req, res) => {
    try {
        const user = await User.findById(req.session.user);
        if (!user) return res.redirect("/login");

        res.render("user/myaccount", { user });
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

const loadEditProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.user);
        if (!user) return res.redirect("/login");

        res.render("user/editProfile", { user });
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

// Send OTP for Email Change
const sendProfileOtp = async (req, res) => {
    try {
        const { email } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: "Email already in use." });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        console.log("Otp received",otp)
        if (emailSent) {
            req.session.profileOtp = otp;
            req.session.newEmail = email;
            return res.json({ success: true, message: "OTP sent successfully." });
        } else {
            return res.json({ success: false, message: "Failed to send OTP. Please try again." });
        }
    } catch (error) {
        res.json({ success: false, message: "Something went wrong." });
    }
};

// Verify OTP for Email Change
const verifyProfileOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        if (otp !== req.session.profileOtp) {
            return res.json({ success: false, message: "Invalid OTP." });
        }

        req.session.profileOtpVerified = true;
        res.json({ success: true, message: "OTP verified. You can update your email now." });
    } catch (error) {
        res.json({ success: false, message: "Something went wrong." });
    }
};

// Edit Profile
const editProfile = async (req, res) => {
    try {
        console.log("Received Request Body:", req.body); // Debugging step

        const user = await User.findById(req.session.user);
        if (!user) return res.redirect("/login");

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
        console.error("Edit profile error:", error);
        res.json({ success: false, message: "Something went wrong." });
    }
};  
const addAddress = async (req, res) => {
    try {
        const user = await User.findById(req.session.user);
        if (!user) return res.redirect("/login");

        res.render("user/addaddress", { user });
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}


const postaddAddress = async (req, res) => {
    try {
        console.log("Received Address Data:", req.body);
        console.log("Logged-in user:", req.session.user); // Log session data

        const userId = req.session.user; // Directly use req.session.user
        console.log("User ID from session:", userId); // Log the extracted user ID

        if (!userId) {
            return res.json({ success: false, message: "User not authenticated. Please log in." });
        }

        const { houseNumber, street, city, state, pincode } = req.body;

        if (!houseNumber || !street || !city || !state || !pincode) {
            return res.json({ success: false, message: "All fields are required" });
        }

        if (!/^\d{6}$/.test(pincode)) {
            return res.json({ success: false, message: "Invalid pincode. Must be 6 digits." });
        }

        const newAddress = new Address({
            userId, // Directly using extracted user ID
            houseNumber,
            street,
            city,
            state,
            pincode
        });

        await newAddress.save();
        console.log("Address saved successfully!");

        res.json({ success: true, message: "Address added successfully!" });

    } catch (error) {
        console.error("Error in postaddAddress:", error);
        res.json({ success: false, message: "Something went wrong." });
    }
};
const getAddresses = async (req, res) => {
    try {
        const userId = req.session.user; // Get logged-in user ID
        if (!userId) {
            return res.json({ success: false, message: "User not authenticated." });
        }

        const addresses = await Address.find({ userId }); // Fetch addresses for logged-in user
        res.json({ success: true, addresses });
    } catch (error) {
        console.error("Error fetching addresses:", error);
        res.json({ success: false, message: "Failed to fetch addresses." });
    }
};
const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.user; // Ensure user is logged in
        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated." });
        }

        const addressId = req.params.id;
        const address = await Address.findOne({ _id: addressId, userId });

        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found or not authorized to delete." });
        }

        await Address.deleteOne({ _id: addressId, userId });
        return res.json({ success: true, message: "Address deleted successfully." });

    } catch (error) {
        console.error("Error deleting address:", error);
        return res.status(500).json({ success: false, message: "Failed to delete address." });
    }
};
const editAddressPage = async (req, res) => {
    try {
        const userId = req.session.user; // Get logged-in user
        const addressId = req.params.id;

        const address = await Address.findOne({ _id: addressId, userId });

        if (!address) {
            return res.redirect("/myaccount"); // Redirect if address is not found
        }

        res.render("user/editaddress", { address, user: req.session.user });
    } catch (error) {
        console.error("Error fetching address for edit:", error);
        res.redirect("/myaccount");
    }
};

const updateAddress = async (req, res) => {
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
        console.error("Error updating address:", error);
        res.json({ success: false, message: "Failed to update address." });
    }
};




module.exports={loadMyAccount,getForgotPassword,forgotEmailValid,resendForgotOtp,verifyForgotOtp,resetPasswordPage,
    resetPassword,loadEditProfile,editProfile,sendProfileOtp,verifyProfileOtp,addAddress,postaddAddress,getAddresses,deleteAddress,updateAddress,editAddressPage}