const Product = require("../../models/productschema");
const Category=require("../../models/categoryschema")
const Review=require("../../models/reviewschema")

const Order = require("../../models/order");
const Wishlist = require("../../models/wishlistschema");
const Cart=require("../../models/cartschema")
const mongoose = require("mongoose")
const Offer=require("../../models/offerschema")


const getAllProducts = async (req, res,next) => {
  try {
      const page = parseInt(req.query.page) || 1;
      const limit = 9;
      const skip = (page - 1) * limit;

      let filter = {};
      let sortOption = {};
     // console.log("Query Params:", req.query);

     
      if (req.query.category) {
          const categories = req.query.category.split(","); // Convert CSV to array
          if (categories.every(id => mongoose.isValidObjectId(id))) {
              filter.categoryId = { $in: categories.map(id => new mongoose.Types.ObjectId(id)) };
          } else {
            const error = new Error("Invalid Category ID(s) provided");
            error.statusCode = 400;
            return next(error);
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
      if (req.query.sort) {
        if (req.query.sort === "priceAsc") {
            sortOption.price = 1; // Sort by price (ascending)
        } else if (req.query.sort === "priceDesc") {
            sortOption.price = -1; // Sort by price (descending)
        } else if (req.query.sort === "newest") {
            sortOption.createdAt = -1; // Sort by newest (latest products first)
        } else if (req.query.sort === "oldest") {
            sortOption.createdAt = 1; // Sort by oldest (first added products first)
        }
    }
      //console.log("Final Filter Applied:", JSON.stringify(filter, null, 2));

      // Fetch Products
      const products = await Product.find(filter).sort(sortOption).skip(skip).limit(limit);

      const totalProducts = await Product.countDocuments(filter);
      const totalPages = Math.ceil(totalProducts / limit);

     // console.log("Filtered Products Found:", products.length);

      // Fetch Categories
      let wishlistItems = [];
      if (req.session.user) {
          const wishlist = await Wishlist.find({ userId: req.session.user }).select("productId");
          wishlistItems = wishlist.map(item => item.productId.toString());
      }
      //console.log("Wishlist Items:", wishlistItems);

      const categories = await Category.find(); 
      const activeOffers = await Offer.find({ status: "active", endDate: { $gte: new Date() } });

// Calculate and attach discount price for each product
const updatedProducts = products.map(product => {
    let discountPrice = product.price; // Default: Original price
    let maxDiscount = 0;

    // Check for product-specific offers
    activeOffers.forEach(offer => {
        if (offer.productId && offer.productId.equals(product._id)) {
            maxDiscount = Math.max(maxDiscount, offer.discount);
        } else if (offer.categoryId && offer.categoryId.equals(product.categoryId)) {
            maxDiscount = Math.max(maxDiscount, offer.discount);
        }
    });

    // Apply the highest discount
    if (maxDiscount > 0) {
        discountPrice = product.price - (product.price * maxDiscount) / 100;
    }

    return { ...product.toObject(), discountPrice }; // Add discountPrice field dynamically
});

      // Render Products Page
      res.render("user/products", {
        products: updatedProducts,
          categories,
          currentPage: page,
          totalPages,
          query: req.query, 
          selectedCategories: req.query.category ? req.query.category.split(",") : [], // Send selected categories
          selectedMinPrice: req.query.minPrice || "", // Retain minPrice filter
          selectedMaxPrice: req.query.maxPrice || "", // Retain maxPrice filter
          selectedSort: req.query.sort || "",
          user: req.session.user ? { name: req.session.userName } : null,
          wishlistItems
      });
  } catch (error) {
      //console.error("Error fetching products:", error);
     // res.status(500).send("Internal Server Error");
     next(error);
  }
};


const getProductDetail = async (req, res,next) => {
  try {
      const productId = req.params.id;
      //console.log("Fetching product with ID:", productId); 

      const product = await Product.findById(productId).populate('categoryId');
      //console.log("Product fetched:", product); // Debug log
      const reviews = await Review.find({productId}).populate("userId", "name");
      if (!product) {
          //console.log("Product not found");
          //return res.status(404).send("Product not found");
          const error = new Error("Product not found");
          error.statusCode = 404;
          return next(error);
        }

      // Fetch active offers
      const activeOffers = await Offer.find({ status: "active", endDate: { $gte: new Date() } });

      let discountPrice = product.price; // Default: original price
      let maxDiscount = 0;

      // Check for product-specific and category-level discounts
      activeOffers.forEach(offer => {
          if (offer.productId && offer.productId.equals(product._id)) {
              maxDiscount = Math.max(maxDiscount, offer.discount);
          } else if (offer.categoryId && offer.categoryId.toString() === product.categoryId._id.toString()) {  
              // Fix: Compare category IDs properly
              maxDiscount = Math.max(maxDiscount, offer.discount);
          }
      });

      // Apply the highest discount
      if (maxDiscount > 0) {
          discountPrice = product.price - (product.price * maxDiscount) / 100;
      }

      res.render("user/productdetails", {
          product: { ...product.toObject(), discountPrice }, // Add discountPrice dynamically
          user: req.session.user ? { name: req.session.userName } : null,
          reviews
      });
  } catch (error) {
      //console.error("Error fetching product details:", error);
      //res.status(500).send("Internal Server Error");
      next(error);
  }
};


const getWishlist = async (req, res,next) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.redirect("/user/login");
    }

    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 6;
    const skip = (page - 1) * limit;

    const totalItems = await Wishlist.countDocuments({ userId });

    // Fetch wishlist items and populate product details
    const wishlistItems = await Wishlist.find({ userId })
      .populate({
        path: "productId",
        select: "name price image categoryId", // Populate only required fields
      })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalItems / limit);

    // Fetch active offers
    const activeOffers = await Offer.find({ status: "active", endDate: { $gte: new Date() } });

    // Calculate discount price for each product
    const updatedWishlist = wishlistItems.map(item => {
      if (!item.productId) return item; // If product is missing, return the item as is

      let product = item.productId.toObject();
      let discountPrice = product.price;
      let maxDiscount = 0;

      // Check for product-specific and category-specific discounts
      activeOffers.forEach(offer => {
        if (offer.productId && offer.productId.equals(product._id)) {
          maxDiscount = Math.max(maxDiscount, offer.discount);
        } else if (offer.categoryId && offer.categoryId.toString() === product.categoryId.toString()) {
          maxDiscount = Math.max(maxDiscount, offer.discount);
        }
      });

      // Apply the highest discount
      if (maxDiscount > 0) {
        discountPrice = product.price - (product.price * maxDiscount) / 100;
      }

      // Return the full wishlist item with product and discount price
      return {
        ...item.toObject(),
        productId: {
          ...product,
          discountPrice,
        },
      };
    });

    res.render("user/wishlist", {
      wishlistItems: updatedWishlist,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    //console.error("Error fetching wishlist:", error);
    //res.status(500).send("Internal Server Error");
    next(error); 
  }
};

const loginstatus=(req,res)=>{
  if (req.session.user) {
    res.json({ loggedIn: true });
} else {
    res.json({ loggedIn: false });
}

}
const addToWishlist = async (req, res,next) => {
  try {
      const userId = req.session.user; // Get logged-in user ID
      const { productId } = req.body;
      if (!userId) {
        const error = new Error("You must be logged in to add items to the wishlist.");
          error.statusCode = 401;
          return next(error);
    }

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
      //console.error("Error adding to wishlist:", error);
      //res.redirect("/pageNotFound")
      next(error);
  }
};
const removeFromWishlistByProduct = async (req, res,next) => {
  try {
      const userId = req.session.user;
      const { productId } = req.body;

      if (!userId) {
        const error = new Error("You must be logged in.");
        error.statusCode = 401;
        return next(error);
      }

      await Wishlist.findOneAndDelete({ userId, productId });

      res.json({ success: true, message: "Removed from wishlist." });
  } catch (error) {
    next(error);
      //console.error(error);
      //res.json({ success: false, message: "Error removing from wishlist." });
  }
};


const removeFromWishlist = async (req, res,next) => {
  try {
    const { id } = req.params; // Get wishlist item ID from URL
    const userId = req.session.user; // Get logged-in user

    if (!userId) {
      const error = new Error("User not logged in");
      error.statusCode = 401;
      return next(error)
    }

    const deletedItem = await Wishlist.findOneAndDelete({ _id: id, userId });

    if (!deletedItem) {
      const error = new Error("Item not found");
      error.statusCode = 404;
      return next(error);
    }

    res.json({ success: true, message: "Item removed successfully" });
  } catch (error) {
    //console.error("Error removing item from wishlist:", error);
    //res.redirect("/pageNotFound")
    next(error);
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
/*const getReview = async (req, res) => {
    try {
      const { productId } = req.params;
      const reviews = await Review.find({ product: productId }).populate("user", "name");
      res.json({ success: true, reviews });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ success: false, message: "Error fetching reviews" });
    }
  };*/
  const addReview= async (req, res,next) => {
    try {
        const userId = req.session.user; 
        const productId = req.params.productId;

        // Check if user has an order with the given product that is delivered or returned
        const order = await Order.findOne({
            userId: userId,
            "items.productId": productId,
            "items.status": { $in: ["delivered", "returned"] }
        });

        if (order) {
            return res.json({ canReview: true });
        } else {
            return res.json({ canReview: false });
        }
    } catch (error) {
      next(error);
        //console.error("Error checking review eligibility:", error);
        //res.status(500).json({ message: "Server error" });
    }
};

const submitReview= async (req, res,next) => {
  try {
      const { productId, rating, comment } = req.body;
      //console.log("review....",req.body)
      const userId = req.session.user; 

    
      const order = await Order.findOne({
          userId,
          "items.productId": productId,
          "items.status": "delivered"
      });

      if (!order) {
        const error = new Error("You can only review delivered products!");
        error.statusCode = 400;
        return next(error);
      }

   
      const review = new Review({ userId, productId, rating, comment });
      await review.save();
      await review.populate("userId", "name")
      res.json({ success: true ,review});
  } catch (error) {
      //console.error(error);
     
      // res.json({ success: false, message: "Something went wrong" });
      next(error);
    }
};



  const addtocart = async (req, res,next) => {
    try {
        const { productId, quantity } = req.body;
       // console.log("Product ID:", productId);

        const userId = req.session.user;
        //console.log("User Cart:", userId);

        if (!userId) {
          const error = new Error("User not logged in");
          error.statusCode = 401;
          return next(error);
        }

        const product = await Product.findById(productId).populate("categoryId");
        if (!product) {
          const error = new Error("Product not found");
          error.statusCode = 400;
          return next(error);
      }

      if (product.status === "Unlisted" || product.status === "Blocked") {
        const error = new Error("This product is unavailable");
        error.statusCode = 400;
        return next(error);
    }

        const category = await Category.findById(product.categoryId);
        if (category.status === "Unlisted" || category.status === "Blocked") {
          const error = new Error("This product category is unavailable");
          error.statusCode = 400;
          return next(error);
      }

      if (product.stockStatus === "Out of Stock") {
        const error = new Error("This product is out of stock");
        error.statusCode = 400;
        return next(error);
    }
        // Check if product is already in cart
        const existingCartItem = await Cart.findOne({ 
            userId: new mongoose.Types.ObjectId(userId), 
            productId: new mongoose.Types.ObjectId(productId) 
        });

        if (existingCartItem) {
          // If product is already in the cart, increase quantity
          const newQuantity = existingCartItem.quantity + (quantity || 1);

          // Validate stock limit
          if (newQuantity > product.quantity) {
            const error = new Error(`Only ${product.quantity} items available in stock.`);
            error.statusCode = 400;
            return next(error);
        }
          existingCartItem.quantity = newQuantity;
          await existingCartItem.save();

          return res.status(200).json({ 
              success: true, 
              message: "Quantity updated in cart", 
              existingCartItem
          });
      }
        await Wishlist.deleteOne({ userId, productId });
        // Add product to cart
        const newCartItem = new Cart({
            userId,
            productId,
            quantity: quantity || 1,
        });

        await newCartItem.save();
        

        res.status(200).json({ success: true, message: "Product added to cart", cartItem: newCartItem });
    } catch (error) {
       // console.error("Cart Error:", error);
        //res.status(500).json({ success: false, message: "Something went wrong" });
        next(error);
      }
};

  const updateQuantity=async (req, res,next) => {
    try {
      const { cartItemId, quantity } = req.body;
      
      // Find cart item
      const cartItem = await Cart.findById(cartItemId).populate("productId");
      if (!cartItem) {
        const error = new Error("Cart item not found.");
        error.statusCode = 404;
        return next(error);
    }
  
      // Validate stock
      if (quantity > cartItem.productId.quantity) {
        const error = new Error("Quantity exceeds stock availability.");
        error.statusCode = 400;
        return next(error);
    }
  
      // Update quantity
      cartItem.quantity = quantity;
      await cartItem.save();
  
      // Calculate new total price
      const cartItems = await Cart.find({ userId: cartItem.userId }).populate("productId");
      const newTotal = cartItems.reduce((total, item) => total + item.productId.price * item.quantity, 0);
  
      return res.json({ success: true, message: "Quantity updated!", newTotal: newTotal });
    } catch (error) {
      //console.error("Error updating cart:", error);
      //res.status(500).json({ success: false, message: "Internal server error." });
      next(error);
    }
  }

// Assuming you have the necessary imports and setup

const getcart = async (req, res,next) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.redirect("/user/login");
    }

    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 6;
    const skip = (page - 1) * limit;

    const totalItems = await Cart.countDocuments({ userId });

    // Fetch cart items with product details
    const cartItems = await Cart.find({ userId })
      .populate("productId")
      .skip(skip)
      .limit(limit);

    // Fetch active offers
    const activeOffers = await Offer.find({ status: "active", endDate: { $gte: new Date() } });

    let totalPrice = 0;

    // Calculate discount for each cart item
    const updatedCartItems = cartItems.map(item => {
      let product = item.productId.toObject();
      let discountPrice = product.price;
      let maxDiscount = 0;

      // Check product-specific and category-specific discounts
      activeOffers.forEach(offer => {
        if (offer.productId && offer.productId.equals(product._id)) {
          maxDiscount = Math.max(maxDiscount, offer.discount);
        } else if (offer.categoryId && offer.categoryId.toString() === product.categoryId.toString()) {
          maxDiscount = Math.max(maxDiscount, offer.discount);
        }
      });

      // Apply highest discount
      if (maxDiscount > 0) {
        discountPrice = product.price - (product.price * maxDiscount) / 100;
      }

      // Calculate total price
      totalPrice += discountPrice * item.quantity;

      return { ...item.toObject(), discountPrice };
    });

    const totalPages = Math.ceil(totalItems / limit);

    res.render("user/cart", {
      cartItems: updatedCartItems,
      totalPrice: totalPrice.toFixed(2),
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    //console.error("Error fetching cart:", error);
    //res.status(500).send("Internal Server Error");
    next(error);
  }
};


const deleteCartItem = async (req,res,next) => {
  try {
    const { cartItemId } = req.params;

    // Find the cart item before deleting
    const cartItem = await Cart.findById(cartItemId);
    if (!cartItem) {
      const error = new Error("Cart item not found.");
      error.statusCode = 404;
      return next(error);
    }

    // Delete the cart item
    await Cart.findByIdAndDelete(cartItemId);

    // Recalculate total price
    const cartItems = await Cart.find({ userId: cartItem.userId }).populate("productId");
    const newTotal = cartItems.length > 0
      ? cartItems.reduce((total, item) => total + item.productId.price * item.quantity, 0)
      : 0;
   // const newTotal = cartItems.reduce((total, item) => total + item.productId.price * item.quantity, 0);

    return res.json({ success: true, message: "Item removed!", newTotal: newTotal });
  } catch (error) {
    //console.error("Error removing item:", error);
    //res.status(500).json({ success: false, message: "Internal server error." });
    next(error);
  }
};





module.exports = { getAllProducts,getProductDetail,addReview,submitReview,getWishlist,loginstatus,addToWishlist ,removeFromWishlist,addtocart,updateQuantity,
  getcart,deleteCartItem,removeFromWishlistByProduct};




