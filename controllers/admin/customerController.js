const User = require("../../models/userschema");

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
        const limit = 3;

        // Fetch customers with pagination and search
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

        // Count total number of documents (for pagination)
        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } },
            ],
        });

        // Calculate total pages
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

module.exports = { customerInfo };
