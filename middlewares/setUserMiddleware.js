const User = require("../models/userschema");

const setUser = async (req, res, next) => {
    try {
        if (req.session.user) {
            const user = await User.findById(req.session.user);
            res.locals.user = user; // Make user available in all views
        } else {
            res.locals.user = null; // Ensure user is null for non-logged-in users
        }
        next();
    } catch (error) {
        console.error("Error in setUser middleware:", error);
        res.locals.user = null;
        next();
    }
};

module.exports = setUser;
