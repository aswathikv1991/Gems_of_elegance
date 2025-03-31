const User=require("../../models/userschema")
//const mongoose=require ("mongoose")
const bcrypt=require("bcrypt")

const loadLogin=(req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin/dashboard")
    }
    else{
        res.render("admin/login",{error:null})
    }

}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const adminUser = await User.findOne({ email, isAdmin: true });

        if (!adminUser) {
            return res.render("admin/login", { error: "Admin not found!" });
        }

        const isMatch = await bcrypt.compare(password, adminUser.password);
        if (!isMatch) {
            return res.render("admin/login", { error: "Invalid credentials!" });
        }

       
        req.session.admin = adminUser._id;

      
        return res.redirect("/admin/dashboard");
    } 
    catch (error) {
        console.error("Error during login:", error);
        return res.redirect("/admin/pageError")
    }
};

const loadDashboard=async(req,res)=>{
    try{
        if(req.session.admin){
            res.render("admin/dashboard")
        }
        else{
            return res.redirect("/admin/login")
        }
    }
   catch(error){
    console.log("error load dashboard",error)
res.redirect("/admin/pageError")
   }
}
const pageError=async(req,res)=>{
    
    res.render("admin/pageError")
}
const logout=async(req,res)=>{
    try{
        req.session.destroy(err=>{
            if(err){
                console.log("Error in destroying session",err)
                return res.redirect("/pageError")
            }
            res.redirect("/admin/login")
        })
    }
    catch(error){
        console.log("unexpected error during logout",error)
        return res.redirect("admin/pageError")
    }

}
module.exports={loadLogin,login,loadDashboard,pageError,logout}