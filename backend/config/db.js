const mongoose =  require('mongoose');

const connectDB = async () => {
    await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected successfully');
};

module.exports = connectDB;