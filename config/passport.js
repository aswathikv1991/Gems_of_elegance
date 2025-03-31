const passport=require("passport")
const GoogleStrategy=require("passport-google-oauth20").Strategy
const User=require("../models/userschema")
require("dotenv").config()



passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:process.env.CALLBACK_URL
},
async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
            user = await User.create({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
                profilePicture: profile.photos[0].value
            });
        }

        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));


passport.serializeUser((user,done)=>{
    done(null,user.id)
})
passport.deserializeUser((id,done)=>{
    User.findById(id)
    .then(user=>{
        done(null,user)
    })
    .catch(error=>{
        done(error,null)
    })
})
module.exports=passport