
const User=require("../models/userschema")
const userAuth = async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login"); 
        }

     
        const user = await User.findById(req.session.user);

        if (user && !user.isBlocked) {
            next(); 
        } else {
            res.redirect("/login"); 
        }
    } catch (error) {
        console.error("Error in user authentication middleware:", error);
        res.status(500).send("Internal server error");
    }
}

const adminAuth = async (req, res, next) => {
    try {
       // console.log("Session user ID:", req.session.admin); 
        if (!req.session.admin) {
            return res.redirect("/admin/login");  
        }
      
        //console.log("Admin session:", req.session.admin);

       
        const adminUser = await User.findById(req.session.admin);
       // console.log("Found admin user:", adminUser)
        if (adminUser && adminUser.isAdmin) {
           return  next(); 
        } else {
            console.log("admin not found...")
            return res.redirect("/admin/login"); 
        }
    } catch (error) {
        console.error("Error in admin auth middleware:", error);
        res.status(500).send("Internal server error");
    }
};

module.exports={userAuth,adminAuth}