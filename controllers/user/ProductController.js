

const Product = require("../../models/productschema");
const Category=require("../../models/categoryschema")
const Review=require("../../models/reviewschema")
const OrderItem = require("../../models/orderitemsschema")
const Order = require("../../models/order");
const Wishlist = require("../../models/wishlistschema");
const mongoose = require("mongoose")


const getAllProducts = async (req, res) => {
  try {
      const page = parseInt(req.query.page) || 1;
      const limit = 9;
      const skip = (page - 1) * limit;

      let filter = {};

      console.log("Query Params:", req.query);

     
      if (req.query.category) {
          const categories = req.query.category.split(","); // Convert CSV to array
          if (categories.every(id => mongoose.isValidObjectId(id))) {
              filter.categoryId = { $in: categories.map(id => new mongoose.Types.ObjectId(id)) };
          } else {
              console.error("Invalid Category ID(s) provided:", req.query.category);
          }
      }

      if (req.query.minPrice) {
          filter.price = { ...filter.price, $gte: Number(req.query.minPrice) };
      }
      if (req.query.maxPrice) {
          filter.price = { ...filter.price, $lte: Number(req.query.maxPrice) };
      }

      // Handle Search Query
      if (req.query.search) {
          filter.name = { $regex: new RegExp(req.query.search, "i") }; // Case-insensitive search
      }

      console.log("Final Filter Applied:", JSON.stringify(filter, null, 2));

      // Fetch Products
      const products = await Product.find(filter).skip(skip).limit(limit);
      const totalProducts = await Product.countDocuments(filter);
      const totalPages = Math.ceil(totalProducts / limit);

      console.log("Filtered Products Found:", products.length);

      // Fetch Categories
      const categories = await Category.find(); 

      // Render Products Page
      res.render("user/products", {
          products,
          categories,
          currentPage: page,
          totalPages,
          user: req.session.user ? { name: req.session.userName } : null
      });
  } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).send("Internal Server Error");
  }
};


const getProductDetail = async (req, res) => {
    try {
        const productId = req.params.id;
        console.log("Fetching product with ID:", productId); 

        const product = await Product.findById(productId).populate('categoryId');
        console.log("Product fetched:", product); // Debug log

        if (!product) {
            console.log(" Product not found");
            return res.status(404).send("Product not found");
        }

        res.render("user/productdetails", {
            product,
            user: req.session.user ? { name: req.session.userName } : null
        });
    } catch (error) {
        console.error(" Error fetching product details:", error);
        res.status(500).send("Internal Server Error");
    }
};

const getWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.redirect("/user/login");
    }

    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 6;
    const skip = (page - 1) * limit;

    const totalItems = await Wishlist.countDocuments({ userId });

    const wishlistItems = await Wishlist.find({ userId })
      .populate("productId")
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalItems / limit);

    res.render("user/wishlist", {
      wishlistItems,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).send("Internal Server Error");
  }
};





const loginstatus=(req,res)=>{
  if (req.session.user) {
    res.json({ loggedIn: true });
} else {
    res.json({ loggedIn: false });
}

}
const addToWishlist = async (req, res) => {
  try {
      const userId = req.session.user; // Get logged-in user ID
      const { productId } = req.body;

      // Check if the product is already in the wishlist
      const existingWishlistItem = await Wishlist.findOne({ userId, productId });

      if (existingWishlistItem) {
          return res.json({ success: false, message: "Item already exists in wishlist" });
      }

      // Add to wishlist
      const newWishlistItem = new Wishlist({ userId, productId });
      await newWishlistItem.save();

      res.json({ success: true, message: "Item added to wishlist" });
  } catch (error) {
      console.error("Error adding to wishlist:", error);
      res.redirect("/pageNotFound")
  }
};
const removeFromWishlist = async (req, res) => {
  try {
    const { id } = req.params; // Get wishlist item ID from URL
    const userId = req.session.user; // Get logged-in user

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const deletedItem = await Wishlist.findOneAndDelete({ _id: id, userId });

    if (!deletedItem) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    res.json({ success: true, message: "Item removed successfully" });
  } catch (error) {
    console.error("Error removing item from wishlist:", error);
    res.redirect("/pageNotFound")
  }
};


/*const getReview = async (req, res) => {
  try {
    const { productId } = req.params;
    
    // 1. Find all OrderItems for the given product
    const orderItems = await OrderItem.find({ productId: productId })
      .populate({
        path: "orderId",
        select: "userId orderStatus"
      });
    
    // 2. Filter OrderItems to include only those where the order status is "delivered"
    const verifiedUserIds = orderItems
      .filter(item => item.orderId && item.orderId.orderStatus === "delivered")
      .map(item => item.orderId.userId.toString());
    
    // 3. Remove duplicate user IDs
    const uniqueUserIds = [...new Set(verifiedUserIds)];
    
    // 4. Fetch reviews for this product written by the verified buyers
    const reviews = await Review.find({ 
      product: productId, 
      user: { $in: uniqueUserIds }
    }).populate("user", "name");
    
    res.json({ success: true, reviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ success: false, message: "Error fetching reviews" });
  }
};*/
const getReview = async (req, res) => {
    try {
      const { productId } = req.params;
      const reviews = await Review.find({ product: productId }).populate("user", "name");
      res.json({ success: true, reviews });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ success: false, message: "Error fetching reviews" });
    }
  };

  



module.exports = { getAllProducts,getProductDetail,getReview,getWishlist,loginstatus,addToWishlist ,removeFromWishlist};




