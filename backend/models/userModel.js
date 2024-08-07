const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Compare entered password with hashed password
const comparePasswords = async (enteredPassword, hashedPassword) => {
   return await bcrypt.compare(enteredPassword, hashedPassword);
};

// Generate reset password token
const getResetPasswordToken = () => {
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
    
    const resetPasswordExpire = Date.now() + 15 * 60 * 1000; // Example expiration time

    return { resetToken, resetPasswordToken, resetPasswordExpire };
};


module.exports = {
    generateToken,
    comparePasswords,
    getResetPasswordToken
};