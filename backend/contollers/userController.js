const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ApiFeatures = require('../utils/apiFeatures');
const sendToken = require('../utils/jwtToken');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/userModel');
const crypto = require('crypto');
const db = require('../config/mysql_database');
const bcrypt = require('bcryptjs');
const Joi = require('joi');

const registerSchema = Joi.object({
    name: Joi.string().required().max(50),
    email: Joi.string().email().required().max(255),
    password: Joi.string().min(8).required()
});



// Register a user
exports.registerUser =  catchAsyncErrors(async (req, res, next) => {
    const { name, email, password,role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

    try {
        await registerSchema.validateAsync(req.body, { abortEarly: false, allowUnknown: true });
    } catch (error) {
        // Joi validation failed, send 400 Bad Request with error details
       return next(new ErrorHandler(error.details.map(d => d.message), 400));
    }

    // Check if email already exists
    const existingUser = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (existingUser[0].length > 0) {
        // If email already exists, send a 400 Bad Request response
        return next(new ErrorHandler("Email already exists", 400));
    }

    const userData = { name, email, password: hashedPassword,role,created_at,updated_at };
    const userInsert = await db.query('INSERT INTO users SET ?', userData);

    // Get the ID of the last inserted row
    const lastInsertId = userInsert[0].insertId;

    // Fetch the latest inserted user data using the ID
    const userDetail = await db.query('SELECT * FROM users WHERE id = ?', [lastInsertId]);
    const user = userDetail[0][0];
    // Assuming `user` is the object returned from MySQL query
    const token = User.generateToken(user.id); // Adjust as per your user object structure

    sendToken(user,token,201,res);
});


exports.showLogin = catchAsyncErrors(async(req, res, next)=>{
    
    const message = req.flash('msg_response');
    
     if (req.user) {
         res.redirect("/admin/dashboard");
     }
    
     res.render('users/login',{message})
 })

// Login user
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
    
    const { email, password } = req.body;
   
    // checking that user email and password are provided
    if (!email || !password) {
        //return next(new ErrorHandler("Please enter email and password", 400));
        
        req.flash('msg_response', { status: 400, message: 'Please enter email and password' });
        res.redirect(`/${process.env.ADMIN_PREFIX}/login`);
    }

    // Find user by email
    const userData = await db.query('SELECT * FROM users WHERE email = ? limit 1', [email]);
    const user = userData[0][0];
    
    // If user not found
    if (!user) {
        
        //return next(new ErrorHandler("Invalid email or password 1", 400));
        req.flash('msg_response', { status: 400, message: 'Invalid email or password' });
        res.redirect(`/${process.env.ADMIN_PREFIX}/login`);
    }
    
    // Compare passwords
    const isPasswordMatched = await User.comparePasswords(password, user.password);
   
    if (!isPasswordMatched) {
       // return next(new ErrorHandler("Invalid email or password 2", 400));
       req.flash('msg_response', { status: 400, message: 'Invalid email or password' });
       res.redirect(`/${process.env.ADMIN_PREFIX}/login`);
    }

    const token = User.generateToken(user.id); // Adjust as per your user object structure

   /* res.status(200).json({
        success: true,
        user: user[0],
        token
    });*/
   // console.log(user);console.log(token);
  
    sendToken(user,token,201,res);

    req.flash('msg_response', { status: 200, message: 'Successfully LoggedIn' });

    res.redirect(`/${process.env.ADMIN_PREFIX}/dashboard`);
});


exports.logout = catchAsyncErrors(async (req, res, next) => {

    res.cookie('token',null,{
        expires: new Date(Date.now()),
        httpOnly: true
    });

    //req.flash('msg_response', { status: 200, message: 'Logout Successfully' });
    req.flash('msg_response', { status: 200, message: 'Logout Successfully' });
    
    res.redirect(`/${process.env.ADMIN_PREFIX}/login`);
})

//forgot password for sending token in mail
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {

    //const user = await User.findOne({email: req.body.email})
    const userData = await db.query('SELECT * FROM users WHERE email = ? limit 1', [req.body.email]);
    const user = userData[0][0];
   
    if(!user) {
        return next(new ErrorHandler("User not found",404));
     }

     //get ResetPasswordToken token 
     const resetTokenValues  = User.getResetPasswordToken();
     
     const resetToken = resetTokenValues.resetToken;
     const resetPasswordToken = resetTokenValues.resetPasswordToken;
     const resetPasswordExpire = resetTokenValues.resetPasswordExpire;

     
     
     /*await user.save({validateBeforeSave: false});*/

     const resetPasswordUrl = `${req.protocol}://${req.get("host")}/api/v1/password/reset/${resetToken}`;

     const message = `password reset token is :- \n\n ${resetPasswordUrl} \n\n If you have not requested reset password then please ingone it`

     try{

        const query = 'UPDATE users SET reset_password_token = ?, reset_password_expire = ? WHERE email = ?';
         // Execute the update query
         const result = await db.query(query, [resetPasswordToken, resetPasswordExpire, req.body.email]);

        await sendEmail({
           email: user.email,
           subject: "Password Recovery",
           message  
        });

        res.status(200).json({
            success: true,
            message: `Email sent successfully to ${user.email}`
        })
     }catch(error){
         await db.query(`UPDATE users SET reset_password_token = '', reset_password_expire = '' WHERE email = ${req.body.email}`);
        
        return next(new ErrorHandler(error.message, 500));
     }

})

// reset user password
exports.resetPassword = catchAsyncErrors(async(req, res, next) =>{
    
    //creating token hash
    const resetPasswordToken = crypto
                                .createHash("sha256")
                                .update(req.params.token)
                                .digest("hex");
    
     const currentTime = Date.now();

     const query = `
        SELECT *
        FROM users
        WHERE reset_password_token = ? 
        AND reset_password_expire > ?
    `;

    // Execute the query
    const userDetail = await db.query(query, [resetPasswordToken, currentTime]);
    const user = userDetail[0][0];
   
   
    if(!user) {
        return next(new ErrorHandler("Reset password token is invalid or has been expired",404));
    }

    if(req.body.password !== req.body.confirmPassword) {
        return next(new ErrorHandler("Password does not matched",404));
    }

    
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    
    const query_2 = 'UPDATE users SET password = ?, reset_password_token = ?,reset_password_expire = ?  WHERE id = ?';
    // Execute the update query
    const result = await db.query(query_2, [hashedPassword,'','', user.id]);

    const token = User.generateToken(user.id); // Adjust as per your user object structure

     sendToken(user,token,201,res);

     
})


// get user detail
exports.getUserDetail = catchAsyncErrors(async(req, res, next)=>{
   const userDetail = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = userDetail[0][0];
    const message = req.flash('msg_response');
    res.render('users/profile',{ layout: 'layouts/main',title : 'Profile',user,message})
    /* res.status(200).json({
            success: true,
            user
        })*/
})

// update user password
exports.updatePassword = catchAsyncErrors(async(req, res, next)=>{
    
    const userDetail = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = userDetail[0][0];
    
    const isPasswordMatched = await User.comparePasswords(req.body.oldPassword, user.password);
    
    if(!isPasswordMatched){
       // return next(new ErrorHandler("Old password is incorrect",400));
        req.flash('msg_response', { status: 400, message: 'Old password is incorrect' });
    }

    if(req.body.newPassword !== req.body.confirmPassword){
        //return next(new ErrorHandler("password does not matched",400));
        req.flash('msg_response', { status: 400, message: 'password does not matched' });
    }

   // user.password = req.body.newPassword;

   // await user.save();
    
   
   const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
   const query = 'UPDATE users SET password = ? WHERE id = ?';
    // Execute the update query
    const result = await db.query(query, [hashedPassword, user.id]);

    const token = User.generateToken(user.id);
    sendToken(user,token,200,res);

   // res.redirect(`/${process.env.ADMIN_PREFIX}/me`);
})



// update user profile
exports.updateProfile = catchAsyncErrors(async(req, res, next)=>{
   
   await db.query('UPDATE users SET name = ?  WHERE id = ?', [req.body.name, req.user.id]);
   
   const message = req.flash('msg_response', { status: 200, message: 'Successfully updated profile' });
   
    res.redirect(`/${process.env.ADMIN_PREFIX}/me`);
    
})

/***************************************/

exports.checkAdminLoginOrDashboard = catchAsyncErrors(async(req, res, next)=>{
    
    if(!req.user){
      res.redirect('/admin/login');
    }else{
      res.redirect('/admin/dashboard');
    }
 })
 
 
 
 exports.dashboard = catchAsyncErrors(async (req, res, next) => {
   res.render('users/dashboard',{ layout: 'layouts/main',title : 'Dashboard'})
 })

 exports.allUsers = catchAsyncErrors(async (req, res, next) => {
    const users = await db.query('SELECT id,name,email,created_at,DATE_FORMAT(created_at, "%d-%m-%Y") AS created_date FROM users  WHERE role = ?', ['user']);
  // console.log(users);
    res.render('users/index',{ layout: 'layouts/main',title : 'Users',users})
 })