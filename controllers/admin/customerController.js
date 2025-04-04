const User = require("../../models/userschema");

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
        const limit = 3;

      
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } }, 
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ],
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

       
        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } },
            ],
        });

   
        const totalPages = Math.ceil(count / limit);

        // Render page and pass data
        res.render("admin/customers", {
            customers: userData,
            totalPages: totalPages,
            currentPage: page,
            searchQuery: search
        });

    } catch (error) {
        console.error("Error fetching customer data:", error);
        res.render("admin/pageError"); 
    }
};

const customerBlocked=async(req,res)=>{
    try{
        let id=req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect("/admin/users")
    }
    catch(error){
        console.log("error customer ",error)
        res.redirect("/admin/pageError")
    }
    
}

const customerunBlocked=async(req,res)=>{
    try{
        let id=req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/users")
    }
    catch(error){
        console.log("customer blocking error ",error)
        res.redirect("/admin/pageError")
    }
    
}


module.exports = { customerInfo,customerBlocked,customerunBlocked };
