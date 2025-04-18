const express=require("express")
const app=express()
require("dotenv").config()
const db=require("./config/db")
const path=require("path")
const session=require("express-session")
const passport=require("./config/passport")
const setUser = require("./middlewares/setUserMiddleware")
const userRouter=require("./routes/userRouter")
const adminRouter=require("./routes/adminRouter")
const errorHandler=require("./middlewares/errorMiddleware")



db()

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, 
            httpOnly:true,
            maxAge:72*60*60*1000
            } 

}));


app.use(passport.initialize())
app.use(passport.session())


app.set("view engine","ejs")
app.set("views",path.join(__dirname,"views"))
app.use(express.static("public"))

app.get("/get-razorpay-key", (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
});



app.use("/",setUser,userRouter)
app.use("/admin",adminRouter)




app.use(errorHandler);
app.listen(process.env.PORT,()=>{
    console.log("server running")
})

module.exports=app