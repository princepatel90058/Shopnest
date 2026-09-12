const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    Name:{
        type: String,
        required: true,
        trim: true,
        maxlength: 80

    },
    Email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    Password:{
        type: String,
        required: true,
        select: false

    },
    role:{
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
       },
    verified:{
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('User', userSchema);

