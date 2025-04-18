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

const blockCustomer = async (req, res) => {
    try {
        const id = req.params.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.status(200).json({ success: true, message: "Customer blocked" });
    } catch (error) {
        console.log("Error blocking customer:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const unblockCustomer = async (req, res) => {
    try {
        const id = req.params.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.status(200).json({ success: true, message: "Customer unblocked" });
    } catch (error) {
        console.log("Error unblocking customer:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


module.exports = { customerInfo,blockCustomer,unblockCustomer};
