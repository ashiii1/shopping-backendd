require('dotenv').config();

const port = process.env.PORT || 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");



app.use(express.json());

// Configure CORS
const allowedOrigins = [
    // `https://shopping-frontend-3.onrender.com`,
    `https://shopping-frontend-gold.vercel.app`
    // `https://shopping-frontend-1-tjbb.onrender.com`,
    `https://e-commerce-shopping-admin.onrender.com`
];

app.use(cors({
    origin: function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

// Database connection with MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to MongoDB");
}).catch((error) => {
    console.error("Error connecting to MongoDB: ", error);
});

// Image storage engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });
app.use('/images', express.static(path.join(__dirname, 'upload/images')));

// Creating upload endpoint for images
// app.post("/upload", upload.single('product'), (req, res) => {
//     res.json({
//         success: 1,
//         image_url: `https://shopping-backendd.onrender.com/images/${req.file.filename}`
//     });
// });
app.post("/upload", upload.single('product'), (req, res) => {
    if (req.file && req.file.filename) {
        res.json({
            success: 1,
            image_url: `https://shopping-backendd.onrender.com/images/${req.file.filename}`
        });
    } else {
        res.status(400).json({
            success: 0,
            error: "Image upload failed"
        });
    }
});

// Schema for creating products
const ProductSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    available: {
        type: Boolean,
        default: true,
    },
});

const Product = mongoose.model("Product", ProductSchema);

app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    } else {
        id = 1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success: true,
        name: req.body.name,
    });
});

// Creating API for deleting products
app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    console.log("Removed");
    res.json({
        success: true,
        name: req.body.name,
    });
});

// Creating API for getting all products
// app.get('/allproducts', async (req, res) => {
//     let products = await Product.find({});
//     console.log("All products fetched");
//     res.send(products);
// });
app.get('/allproducts', async (req, res) => {
    try {
        let products = await Product.find({});
        let updatedProducts = products.map(product => {
            let updatedImage = product.image;

            // Replace local development URL with production URL
            if (updatedImage.startsWith('https://shopping-backendd.onrender.com')) {
                updatedImage = updatedImage.replace('https://shopping-backendd.onrender.com', 'https://shopping-backendd.onrender.com');
            }

            // If using HTTPS in production or other URL schemes
            if (updatedImage.startsWith('https://localhost:4000')) {
                updatedImage = updatedImage.replace('https://localhost:4000', 'https://shopping-backendd.onrender.com');
            }

            return {
                ...product.toObject(),
                image: updatedImage
            };
        });
        res.send(updatedProducts);
    } catch (error) {
        console.error('Error fetching products:', error); // Log error
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});


// Schema creation for user model
const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    cartData: {
        type: Object,
    },
    wishlistData: {
        type: Array,
        default: [],
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

const Users = mongoose.model('Users', UserSchema);

// Schema for storing delivery information
const DeliveryInfoSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
    zip: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true,
    },
});

const DeliveryInfo = mongoose.model('DeliveryInfo', DeliveryInfoSchema);

// Creating endpoint for registering user
app.post('/signup', async (req, res) => {
    try {
        let check = await Users.findOne({ email: req.body.email });
        if (check) {
            return res.status(400).json({ success: false, errors: "Existing user found with same email address" });
        }
        let cart = {};
        for (let i = 0; i < 300; i++) {
            cart[i] = 0;
        }
        const user = new Users({
            name: req.body.username,
            email: req.body.email,
            password: req.body.password,
            cartData: cart,
        });

        await user.save();

        const data = {
            user: {
                id: user.id
            }
        };
        const token = jwt.sign(data, 'secret_ecom');
        res.json({ success: true, token });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ success: false, errors: "Server error" });
    }
});

// Creating endpoint for user login
app.post('/login', async (req, res) => {
    try {
        let user = await Users.findOne({ email: req.body.email });
        if (user) {
            const passCompare = req.body.password === user.password;
            if (passCompare) {
                const data = {
                    user: {
                        id: user.id
                    }
                };
                const token = jwt.sign(data, 'secret_ecom');
                res.json({ success: true, token });
            } else {
                res.json({ success: false, error: "Wrong password" });
            }
        } else {
            res.json({ success: false, errors: "Wrong Email Id" });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ success: false, errors: "Server error" });
    }
});

// Creating endpoint for new collection data
// app.get('/newcollections', async (req, res) => {
//     let products = await Product.find({});
//     let newcollection = products.slice(1).slice(-8);
//     console.log("newcollections fetched");
//     res.send(newcollection);
// });
app.get('/newcollections', async (req, res) => {
    try {
        let products = await Product.find({});
        let newcollection = products.slice(1).slice(-8).map(product => {
            let updatedImage = product.image;
            if (updatedImage.startsWith('https://shopping-backendd.onrender.com')) {
                updatedImage = updatedImage.replace('https://shopping-backendd.onrender.com', 'https://shopping-backendd.onrender.com');
            }
            if (updatedImage.startsWith('https://localhost:4000')) {
                updatedImage = updatedImage.replace('https://localhost:4000', 'https://shopping-backendd.onrender.com');
            }
            return {
                ...product.toObject(),
                image: updatedImage
            };
        });
        console.log("New collections fetched");
        res.send(newcollection);
    } catch (error) {
        console.error('Error fetching new collections:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});


// Creating endpoint for popular in women 
// app.get('/popularinwomen', async (req, res) => {
//     let products = await Product.find({ category: "women" });
//     let popular_in_women = products.slice(0, 4);
//     console.log("Popular in women fetched");
//     res.send(popular_in_women);
// });
app.get('/popularinwomen', async (req, res) => {
    try {
        let products = await Product.find({ category: "women" });
        let popular_in_women = products.slice(0, 4).map(product => {
            let updatedImage = product.image;
            if (updatedImage.startsWith('https://shopping-backendd.onrender.com')) {
                updatedImage = updatedImage.replace('https://shopping-backendd.onrender.com', 'https://shopping-backendd.onrender.com');
            }
            if (updatedImage.startsWith('https://localhost:4000')) {
                updatedImage = updatedImage.replace('https://localhost:4000', 'https://shopping-backendd.onrender.com');
            }
            return {
                ...product.toObject(),
                image: updatedImage
            };
        });
        console.log("Popular in women fetched");
        res.send(popular_in_women);
    } catch (error) {
        console.error('Error fetching popular in women products:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});


// Creating middleware to fetch user
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ errors: "Please authenticate using a valid token" });
    } else {
        try {
            const data = jwt.verify(token, 'secret_ecom');
            req.user = data.user;
            next();
        } catch (error) {
            res.status(401).send({ errors: "Please authenticate using a valid token" });
        }
    }
};

// Creating endpoint for adding products in cart data
app.post('/addtocart', fetchUser, async (req, res) => {
    console.log("added", req.body.itemId);
    let userData = await Users.findOne({ _id: req.user.id });
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Added");
});

// Creating endpoint to remove product from cart data
app.post('/removefromcart', fetchUser, async (req, res) => {
    console.log("removed", req.body.itemId);
    let userData = await Users.findOne({ _id: req.user.id });
    if (userData.cartData[req.body.itemId] > 0)
        userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Removed");
});

// Creating endpoint to get cart data
app.post('/getcart', fetchUser, async (req, res) => {
    console.log("get cart");
    let userData = await Users.findOne({ _id: req.user.id });
    res.json(userData.cartData);
});

// Creating endpoint to add item to wishlist
app.post('/addtowishlist', fetchUser, async (req, res) => {
    console.log("added", req.body.itemId);
    let userData = await Users.findOne({ _id: req.user.id });
    userData.wishlistData.push(req.body.itemId);
    await Users.findOneAndUpdate({ _id: req.user.id }, { wishlistData: userData.wishlistData });
    res.send("Added");
});

// Creating endpoint to remove item from wishlist
app.post('/removefromwishlist', fetchUser, async (req, res) => {
    console.log("removed", req.body.itemId);
    let userData = await Users.findOne({ _id: req.user.id });
    userData.wishlistData = userData.wishlistData.filter(e => e != req.body.itemId);
    await Users.findOneAndUpdate({ _id: req.user.id }, { wishlistData: userData.wishlistData });
    res.send("Removed");
});

// Creating endpoint to get wishlist data
app.post('/getwishlist', fetchUser, async (req, res) => {
    console.log("get wishlist");
    let userData = await Users.findOne({ _id: req.user.id });
    res.json(userData.wishlistData);
});

app.listen(port, () => {
    console.log(`Listening to the port ${port}`);
});

// require('dotenv').config();

// const port = process.env.PORT || 4000;
// const express = require("express");
// const app = express();
// const mongoose = require("mongoose");
// const jwt = require("jsonwebtoken");
// const multer = require("multer");
// const path = require("path");
// const cors = require("cors");

// app.use(express.json());

// // Configure CORS
// const allowedOrigins = [
//     `https://shopping-frontend-1-tjbb.onrender.com`,
//     `https://e-commerce-shopping-admin.onrender.com`
// ];

// app.use(cors({
//     origin: function(origin, callback) {
//         if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
//             callback(null, true);
//         } else {
//             callback(new Error('Not allowed by CORS'));
//         }
//     }
// }));

// // Database connection with MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// }).then(() => {
//     console.log("Connected to MongoDB");
// }).catch((error) => {
//     console.error("Error connecting to MongoDB: ", error);
// });

// // Image storage engine
// const storage = multer.diskStorage({
//     destination: './upload/images',
//     filename: (req, file, cb) => {
//         cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
//     }
// });

// const upload = multer({ storage: storage });
// app.use('/images', express.static(path.join(__dirname, 'upload/images')));

// // Creating upload endpoint for images
// app.post("/upload", upload.single('product'), (req, res) => {
//     res.json({
//         success: 1,
//         image_url: `https://shopping-backendd.onrender.com/images/${req.file.filename}`
//     });
// });

// // Schema for creating products
// const Product = mongoose.model("Product", {
//     id: {
//         type: Number,
//         required: true,
//     },
//     name: {
//         type: String,
//         required: true,
//     },
//     image: {
//         type: String,
//         required: true
//     },
//     category: {
//         type: String,
//         required: true,
//     },
//     new_price: {
//         type: Number,
//         required: true,
//     },
//     old_price: {
//         type: Number,
//         required: true,
//     },
//     date: {
//         type: Date,
//         default: Date.now,
//     },
//     available: {
//         type: Boolean,
//         default: true,
//     },
// });

// app.post('/addproduct', async (req, res) => {
//     let products = await Product.find({});
//     let id;
//     if (products.length > 0) {
//         let last_product_array = products.slice(-1);
//         let last_product = last_product_array[0];
//         id = last_product.id + 1;
//     } else {
//         id = 1;
//     }
//     const product = new Product({
//         id: id,
//         name: req.body.name,
//         image: req.body.image,
//         category: req.body.category,
//         new_price: req.body.new_price,
//         old_price: req.body.old_price,
//     });
//     console.log(product);
//     await product.save();
//     console.log("Saved");
//     res.json({
//         success: true,
//         name: req.body.name,
//     });
// });

// // Creating API for deleting products
// app.post('/removeproduct', async (req, res) => {
//     await Product.findOneAndDelete({ id: req.body.id });
//     console.log("Removed");
//     res.json({
//         success: true,
//         name: req.body.name,
//     });
// });

// // Creating API for getting all products
// app.get('/allproducts', async (req, res) => {
//     let products = await Product.find({});
//     console.log("All products fetched");
//     res.send(products);
// });

// // Schema creation for user model
// const Users = mongoose.model('Users', {
//     name: {
//         type: String,
//         required: true,
//     },
//     email: {
//         type: String,
//         unique: true,
//         required: true,
//     },
//     password: {
//         type: String,
//         required: true,
//     },
//     cartData: {
//         type: Object,
//     },
//     wishlistData: {
//         type: Array,
//         default: [],
//     },
//     date: {
//         type: Date,
//         default: Date.now,
//     },
// });

// // Schema for storing delivery information
// const DeliveryInfo = mongoose.model('DeliveryInfo', {
//     name: {
//         type: String,
//         required: true,
//     },
//     address: {
//         type: String,
//         required: true,
//     },
//     city: {
//         type: String,
//         required: true,
//     },
//     state: {
//         type: String,
//         required: true,
//     },
//     zip: {
//         type: String,
//         required: true,
//     },
//     country: {
//         type: String,
//         required: true,
//     },
//     userId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Users',
//         required: true,
//     },
// });

// // Creating endpoint for registering user
// app.post('/signup', async (req, res) => {
//     try {
//         let check = await Users.findOne({ email: req.body.email });
//         if (check) {
//             return res.status(400).json({ success: false, errors: "Existing user found with same email address" });
//         }
//         let cart = {};
//         for (let i = 0; i < 300; i++) {
//             cart[i] = 0;
//         }
//         const user = new Users({
//             name: req.body.username,
//             email: req.body.email,
//             password: req.body.password,
//             cartData: cart,
//         });

//         await user.save();

//         const data = {
//             user: {
//                 id: user.id
//             }
//         };
//         const token = jwt.sign(data, 'secret_ecom');
//         res.json({ success: true, token });
//     } catch (error) {
//         console.error('Error during signup:', error);
//         res.status(500).json({ success: false, errors: "Server error" });
//     }
// });

// // Creating endpoint for user login
// app.post('/login', async (req, res) => {
//     try {
//         let user = await Users.findOne({ email: req.body.email });
//         if (user) {
//             const passCompare = req.body.password === user.password;
//             if (passCompare) {
//                 const data = {
//                     user: {
//                         id: user.id
//                     }
//                 };
//                 const token = jwt.sign(data, 'secret_ecom');
//                 res.json({ success: true, token });
//             } else {
//                 res.json({ success: false, error: "Wrong password" });
//             }
//         } else {
//             res.json({ success: false, errors: "Wrong Email Id" });
//         }
//     } catch (error) {
//         console.error('Error during login:', error);
//         res.status(500).json({ success: false, errors: "Server error" });
//     }
// });

// // Creating endpoint for new collection data
// app.get('/newcollections', async (req, res) => {
//     let products = await Product.find({});
//     let newcollection = products.slice(1).slice(-8);
//     console.log("newcollections fetched");
//     res.send(newcollection);
// });

// // Creating endpoint for popular in women 
// app.get('/popularinwomen', async (req, res) => {
//     let products = await Product.find({ category: "women" });
//     let popular_in_women = products.slice(0, 4);
//     console.log("Popular in women fetched");
//     res.send(popular_in_women);
// });

// // Creating middleware to fetch user
// const fetchUser = async (req, res, next) => {
//     const token = req.header('auth-token');
//     if (!token) {
//         res.status(401).send({ errors: "Please authenticate using a valid token" });
//     } else {
//         try {
//             const data = jwt.verify(token, 'secret_ecom');
//             req.user = data.user;
//             next();
//         } catch (error) {
//             res.status(401).send({ errors: "Please authenticate using a valid token" });
//         }
//     }
// };

// // Creating endpoint for adding products in cart data
// app.post('/addtocart', fetchUser, async (req, res) => {
//     console.log("added", req.body.itemId);
//     let userData = await Users.findOne({ _id: req.user.id });
//     userData.cartData[req.body.itemId] += 1;
//     await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
//     res.send("Added");
// });

// // Creating endpoint to remove product from cart data
// app.post('/removefromcart', fetchUser, async (req, res) => {
//     console.log("removed", req.body.itemId);
//     let userData = await Users.findOne({ _id: req.user.id });
//     if (userData.cartData[req.body.itemId] > 0)
//         userData.cartData[req.body.itemId] -= 1;
//     await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
//     res.send("Removed");
// });

// // Creating endpoint to get cart data
// app.post('/getcart', fetchUser, async (req, res) => {
//     console.log("get cart");
//     let userData = await Users.findOne({ _id: req.user.id });
//     res.json(userData.cartData);
// });

// // Creating endpoint to add item to wishlist
// app.post('/addtowishlist', fetchUser, async (req, res) => {
//     console.log("added to wishlist", req.body.itemId);
//     let userData = await Users.findOne({ _id: req.user.id });
//     if (!userData.wishlistData.includes(req.body.itemId)) {
//         userData.wishlistData.push(req.body.itemId);
//         await Users.findOneAndUpdate({ _id: req.user.id }, { wishlistData: userData.wishlistData });
//     }
//     res.send("Added to Wishlist");
// });

// // Creating endpoint to remove item from wishlist
// app.post('/removefromwishlist', fetchUser, async (req, res) => {
//     console.log("removed from wishlist", req.body.itemId);
//     let userData = await Users.findOne({ _id: req.user.id });
//     userData.wishlistData = userData.wishlistData.filter(id => id !== req.body.itemId);
//     await Users.findOneAndUpdate({ _id: req.user.id }, { wishlistData: userData.wishlistData });
//     res.send("Removed from Wishlist");
// });

// // Creating endpoint to get wishlist data
// app.post('/getwishlist', fetchUser, async (req, res) => {
//     console.log("get wishlist");
//     let userData = await Users.findOne({ _id: req.user.id });
//     res.json(userData.wishlistData);
// });

// // Creating endpoint for saving delivery information
// app.post('/savedeliveryinfo', fetchUser, async (req, res) => {
//     const { name, address, city, state, zip, country } = req.body;
//     try {
//         const deliveryInfo = new DeliveryInfo({
//             name,
//             address,
//             city,
//             state,
//             zip,
//             country,
//             userId: req.user.id,
//         });
//         await deliveryInfo.save();
//         res.json({ success: true, message: 'Delivery information saved successfully' });
//     } catch (error) {
//         console.error('Error saving delivery information:', error);
//         res.status(500).json({ success: false, errors: 'Server error' });
//     }
// });

// // Creating endpoint for fetching delivery information
// app.get('/getdeliveryinfo', fetchUser, async (req, res) => {
//     try {
//         const deliveryInfo = await DeliveryInfo.findOne({ userId: req.user.id });
//         if (deliveryInfo) {
//             res.json(deliveryInfo);
//         } else {
//             res.status(404).json({ success: false, errors: 'No delivery information found' });
//         }
//     } catch (error) {
//         console.error('Error fetching delivery information:', error);
//         res.status(500).json({ success: false, errors: 'Server error' });
//     }
// });

// app.listen(port, (error) => {
//     if (!error) {
//         console.log("Server running on port " + port);
//     } else {
//         console.log("Error: " + error);
//     }
// });


//crct code before deploy
// require('dotenv').config();

// const port = process.env.PORT || 4000;
// const express = require("express");
// const app = express();
// const mongoose = require("mongoose");
// const jwt = require("jsonwebtoken");
// const multer = require("multer");
// const path = require("path");
// const cors = require("cors");

// app.use(express.json());
// app.use(cors());

// // Database connection with MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// }).then(() => {
//     console.log("Connected to MongoDB");
// }).catch((error) => {
//     console.error("Error connecting to MongoDB: ", error);
// });

// // Image storage engine
// const storage = multer.diskStorage({
//     destination: './upload/images',
//     filename: (req, file, cb) => {
//         cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
//     }
// });

// const upload = multer({ storage: storage });
// app.use('/images', express.static('upload/images'));

// // Creating upload endpoint for images
// app.post("/upload", upload.single('product'), (req, res) => {
//     res.json({
//         success: 1,
//         image_url: `http://localhost:${port}/images/${req.file.filename}`
//     });
// });

// // Schema for creating products
// const Product = mongoose.model("Product", {
//     id: {
//         type: Number,
//         required: true,
//     },
//     name: {
//         type: String,
//         required: true,
//     },
//     image: {
//         type: String,
//         required: true
//     },
//     category: {
//         type: String,
//         required: true,
//     },
//     new_price: {
//         type: Number,
//         required: true,
//     },
//     old_price: {
//         type: Number,
//         required: true,
//     },
//     date: {
//         type: Date,
//         default: Date.now,
//     },
//     available: {
//         type: Boolean,
//         default: true,
//     },
// });

// app.post('/addproduct', async (req, res) => {
//     let products = await Product.find({});
//     let id;
//     if (products.length > 0) {
//         let last_product_array = products.slice(-1);
//         let last_product = last_product_array[0];
//         id = last_product.id + 1;
//     } else {
//         id = 1;
//     }
//     const product = new Product({
//         id: id,
//         name: req.body.name,
//         image: req.body.image,
//         category: req.body.category,
//         new_price: req.body.new_price,
//         old_price: req.body.old_price,
//     });
//     console.log(product);
//     await product.save();
//     console.log("Saved");
//     res.json({
//         success: true,
//         name: req.body.name,
//     });
// });

// // Creating API for deleting products
// app.post('/removeproduct', async (req, res) => {
//     await Product.findOneAndDelete({ id: req.body.id });
//     console.log("Removed");
//     res.json({
//         success: true,
//         name: req.body.name,
//     });
// });

// // Creating API for getting all products
// app.get('/allproducts', async (req, res) => {
//     let products = await Product.find({});
//     console.log("All products fetched");
//     res.send(products);
// });

// // Schema creation for user model
// const Users = mongoose.model('Users', {
//     name: {
//         type: String,
//         required: true,
//     },
//     email: {
//         type: String,
//         unique: true,
//         required: true,
//     },
//     password: {
//         type: String,
//         required: true,
//     },
//     cartData: {
//         type: Object,
//     },
//     wishlistData: {
//         type: Array,
//         default: [],
//     },
//     date: {
//         type: Date,
//         default: Date.now,
//     },
// });

// // Schema for storing delivery information
// const DeliveryInfo = mongoose.model('DeliveryInfo', {
//     name: {
//         type: String,
//         required: true,
//     },
//     address: {
//         type: String,
//         required: true,
//     },
//     city: {
//         type: String,
//         required: true,
//     },
//     state: {
//         type: String,
//         required: true,
//     },
//     zip: {
//         type: String,
//         required: true,
//     },
//     country: {
//         type: String,
//         required: true,
//     },
//     userId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Users',
//         required: true,
//     },
// });

// // Creating endpoint for registering user
// app.post('/signup', async (req, res) => {
//     try {
//         let check = await Users.findOne({ email: req.body.email });
//         if (check) {
//             return res.status(400).json({ success: false, errors: "Existing user found with same email address" });
//         }
//         let cart = {};
//         for (let i = 0; i < 300; i++) {
//             cart[i] = 0;
//         }
//         const user = new Users({
//             name: req.body.username,
//             email: req.body.email,
//             password: req.body.password,
//             cartData: cart,
//         });

//         await user.save();

//         const data = {
//             user: {
//                 id: user.id
//             }
//         };
//         const token = jwt.sign(data, 'secret_ecom');
//         res.json({ success: true, token });
//     } catch (error) {
//         console.error('Error during signup:', error);
//         res.status(500).json({ success: false, errors: "Server error" });
//     }
// });

// // Creating endpoint for user login
// app.post('/login', async (req, res) => {
//     try {
//         let user = await Users.findOne({ email: req.body.email });
//         if (user) {
//             const passCompare = req.body.password === user.password;
//             if (passCompare) {
//                 const data = {
//                     user: {
//                         id: user.id
//                     }
//                 };
//                 const token = jwt.sign(data, 'secret_ecom');
//                 res.json({ success: true, token });
//             } else {
//                 res.json({ success: false, error: "Wrong password" });
//             }
//         } else {
//             res.json({ success: false, errors: "Wrong Email Id" });
//         }
//     } catch (error) {
//         console.error('Error during login:', error);
//         res.status(500).json({ success: false, errors: "Server error" });
//     }
// });

// // Creating endpoint for new collection data
// app.get('/newcollections', async (req, res) => {
//     let products = await Product.find({});
//     let newcollection = products.slice(1).slice(-8);
//     console.log("newcollections fetched");
//     res.send(newcollection);
// });

// // Creating endpoint for popular in women 
// app.get('/popularinwomen', async (req, res) => {
//     let products = await Product.find({ category: "women" });
//     let popular_in_women = products.slice(0, 4);
//     console.log("Popular in women fetched");
//     res.send(popular_in_women);
// });

// // Creating middleware to fetch user
// const fetchUser = async (req, res, next) => {
//     const token = req.header('auth-token');
//     if (!token) {
//         res.status(401).send({ errors: "Please authenticate using a valid token" });
//     } else {
//         try {
//             const data = jwt.verify(token, 'secret_ecom');
//             req.user = data.user;
//             next();
//         } catch (error) {
//             res.status(401).send({ errors: "Please authenticate using a valid token" });
//         }
//     }
// };

// // Creating endpoint for adding products in cart data
// app.post('/addtocart', fetchUser, async (req, res) => {
//     console.log("added", req.body.itemId);
//     let userData = await Users.findOne({ _id: req.user.id });
//     userData.cartData[req.body.itemId] += 1;
//     await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
//     res.send("Added");
// });

// // Creating endpoint to remove product from cart data
// app.post('/removefromcart', fetchUser, async (req, res) => {
//     console.log("removed", req.body.itemId);
//     let userData = await Users.findOne({ _id: req.user.id });
//     if (userData.cartData[req.body.itemId] > 0)
//         userData.cartData[req.body.itemId] -= 1;
//     await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
//     res.send("Removed");
// });

// // Creating endpoint to get cart data
// app.post('/getcart', fetchUser, async (req, res) => {
//     console.log("get cart");
//     let userData = await Users.findOne({ _id: req.user.id });
//     res.json(userData.cartData);
// });

// // Creating endpoint to add item to wishlist
// app.post('/addtowishlist', fetchUser, async (req, res) => {
//     console.log("added to wishlist", req.body.itemId);
//     let userData = await Users.findOne({ _id: req.user.id });
//     if (!userData.wishlistData.includes(req.body.itemId)) {
//         userData.wishlistData.push(req.body.itemId);
//         await Users.findOneAndUpdate({ _id: req.user.id }, { wishlistData: userData.wishlistData });
//     }
//     res.send("Added to Wishlist");
// });

// // Creating endpoint to remove item from wishlist
// app.post('/removefromwishlist', fetchUser, async (req, res) => {
//     console.log("removed from wishlist", req.body.itemId);
//     let userData = await Users.findOne({ _id: req.user.id });
//     userData.wishlistData = userData.wishlistData.filter(id => id !== req.body.itemId);
//     await Users.findOneAndUpdate({ _id: req.user.id }, { wishlistData: userData.wishlistData });
//     res.send("Removed from Wishlist");
// });

// // Creating endpoint to get wishlist data
// app.post('/getwishlist', fetchUser, async (req, res) => {
//     console.log("get wishlist");
//     let userData = await Users.findOne({ _id: req.user.id });
//     res.json(userData.wishlistData);
// });

// // Creating endpoint for saving delivery information
// app.post('/savedeliveryinfo', fetchUser, async (req, res) => {
//     const { name, address, city, state, zip, country } = req.body;
//     try {
//         const deliveryInfo = new DeliveryInfo({
//             name,
//             address,
//             city,
//             state,
//             zip,
//             country,
//             userId: req.user.id,
//         });
//         await deliveryInfo.save();
//         res.json({ success: true, message: 'Delivery information saved successfully' });
//     } catch (error) {
//         console.error('Error saving delivery information:', error);
//         res.status(500).json({ success: false, errors: 'Server error' });
//     }
// });

// // Creating endpoint for fetching delivery information
// app.get('/getdeliveryinfo', fetchUser, async (req, res) => {
//     try {
//         const deliveryInfo = await DeliveryInfo.findOne({ userId: req.user.id });
//         if (deliveryInfo) {
//             res.json(deliveryInfo);
//         } else {
//             res.status(404).json({ success: false, errors: 'No delivery information found' });
//         }
//     } catch (error) {
//         console.error('Error fetching delivery information:', error);
//         res.status(500).json({ success: false, errors: 'Server error' });
//     }
// });

// app.listen(port, (error) => {
//     if (!error) {
//         console.log("Server running on port " + port);
//     } else {
//         console.log("Error: " + error);
//     }
// });

//crct
// require('dotenv').config();

// const port = process.env.PORT || 4000;
// const express = require("express");
// const app = express();
// const mongoose = require("mongoose");
// const jwt = require("jsonwebtoken");
// const multer = require("multer");
// const path = require("path");
// const cors = require("cors");

// app.use(express.json());
// app.use(cors());

// // Database connection with MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// }).then(() => {
//     console.log("Connected to MongoDB");
// }).catch((error) => {
//     console.error("Error connecting to MongoDB: ", error);
// });

// // Rest of your code...

// // API creation
// app.get("/", (req, res) => {
//     res.send("Express app is running");
// });

// // Image storage engine
// const storage = multer.diskStorage({
//     destination: './upload/images',
//     filename: (req, file, cb) => {
//         cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
//     }
// });

// const upload = multer({ storage: storage });
// app.use('/images', express.static('upload/images'));

// // Creating upload endpoint for images
// app.post("/upload", upload.single('product'), (req, res) => {
//     res.json({
//         success: 1,
//         image_url: `http://localhost:${port}/images/${req.file.filename}`
//     });
// });

// // Schema for creating products
// const Product = mongoose.model("Product", {
//     id: {
//         type: Number,
//         required: true,
//     },
//     name: {
//         type: String,
//         required: true,
//     },
//     image: {
//         type: String,
//         required: true
//     },
//     category: {
//         type: String,
//         required: true,
//     },
//     new_price: {
//         type: Number,
//         required: true,
//     },
//     old_price: {
//         type: Number,
//         required: true,
//     },
//     date: {
//         type: Date,
//         default: Date.now,
//     },
//     available: {
//         type: Boolean,
//         default: true,
//     },
// });

// app.post('/addproduct', async (req, res) => {
//     let products = await Product.find({});
//     let id;
//     if (products.length > 0) {
//         let last_product_array = products.slice(-1);
//         let last_product = last_product_array[0];
//         id = last_product.id + 1;
//     } else {
//         id = 1;
//     }
//     const product = new Product({
//         id: id,
//         name: req.body.name,
//         image: req.body.image,
//         category: req.body.category,
//         new_price: req.body.new_price,
//         old_price: req.body.old_price,
//     });
//     console.log(product);
//     await product.save();
//     console.log("Saved");
//     res.json({
//         success: true,
//         name: req.body.name,
//     });
// });

// // Creating API for deleting products
// app.post('/removeproduct', async (req, res) => {
//     await Product.findOneAndDelete({ id: req.body.id });
//     console.log("Removed");
//     res.json({
//         success: true,
//         name: req.body.name,
//     });
// });

// // Creating API for getting all products
// app.get('/allproducts', async (req, res) => {
//     let products = await Product.find({});
//     console.log("All products fetched");
//     res.send(products);
// });

// // Schema creation for user model
// const Users = mongoose.model('Users', {
//     name: {
//         type: String,
//         required: true,
//     },
//     email: {
//         type: String,
//         unique: true,
//         required: true,
//     },
//     password: {
//         type: String,
//         required: true,
//     },
//     cartData: {
//         type: Object,
//     },
//     wishlistData: {
//         type: Array,
//         default: [],
//     },
//     date: {
//         type: Date,
//         default: Date.now,
//     },
// });

// // Creating endpoint for registering user
// app.post('/signup', async (req, res) => {
//     try {
//         let check = await Users.findOne({ email: req.body.email });
//         if (check) {
//             return res.status(400).json({ success: false, errors: "Existing user found with same email address" });
//         }
//         let cart = {};
//         for (let i = 0; i < 300; i++) {
//             cart[i] = 0;
//         }
//         const user = new Users({
//             name: req.body.username,
//             email: req.body.email,
//             password: req.body.password,
//             cartData: cart,
//         });

//         await user.save();

//         const data = {
//             user: {
//                 id: user.id
//             }
//         };
//         const token = jwt.sign(data, 'secret_ecom');
//         res.json({ success: true, token });
//     } catch (error) {
//         console.error('Error during signup:', error);
//         res.status(500).json({ success: false, errors: "Server error" });
//     }
// });

// // Creating endpoint for user login
// app.post('/login', async (req, res) => {
//     try {
//         let user = await Users.findOne({ email: req.body.email });
//         if (user) {
//             const passCompare = req.body.password === user.password;
//             if (passCompare) {
//                 const data = {
//                     user: {
//                         id: user.id
//                     }
//                 };
//                 const token = jwt.sign(data, 'secret_ecom');
//                 res.json({ success: true, token });
//             } else {
//                 res.json({ success: false, error: "Wrong password" });
//             }
//         } else {
//             res.json({ success: false, errors: "Wrong Email Id" });
//         }
//     } catch (error) {
//         console.error('Error during login:', error);
//         res.status(500).json({ success: false, errors: "Server error" });
//     }
// });

// // Creating endpoint for new collection data
// app.get('/newcollections',async(req,res)=>{
//     let products=await Product.find({});
//     let newcollection =products.slice(1).slice(-8);
//     console.log("newcollections fetched");
//     res.send(newcollection);
// })

// // Creating endpoint for popular in women 
// app.get('/popularinwomen',async (req,res)=>{
//     let products =await Product.find({category:"women"});
//     let popular_in_women =products.slice(0,4);
//     console.log("Popular in women fetched");
//     res.send(popular_in_women);
// })

// // Creating middleware to fetch user
// const fetchUser = async (req, res, next) => {
//     const token = req.header('auth-token');
//     if (!token) {
//         res.status(401).send({errors: "Please authenticate using a valid token"});
//     } else {
//         try {
//             const data = jwt.verify(token, 'secret_ecom');
//             req.user = data.user;
//             next();
//         } catch (error) {
//             res.status(401).send({errors: "Please authenticate using a valid token"});
//         }
//     }
// }

// // Creating endpoint for adding products in cart data
// app.post('/addtocart', fetchUser, async (req, res) => {
//     console.log("added", req.body.itemId);
//     let userData = await Users.findOne({_id: req.user.id});
//     userData.cartData[req.body.itemId] += 1;
//     await Users.findOneAndUpdate({_id: req.user.id}, {cartData: userData.cartData});
//     res.send("Added");
// })

// // Creating endpoint to remove product from cart data
// app.post('/removefromcart', fetchUser, async (req, res) => {
//     console.log("removed", req.body.itemId);
//     let userData = await Users.findOne({_id: req.user.id});
//     if (userData.cartData[req.body.itemId] > 0)
//         userData.cartData[req.body.itemId] -= 1;
//     await Users.findOneAndUpdate({_id: req.user.id}, {cartData: userData.cartData});
//     res.send("Removed");
// })

// // Creating endpoint to get cart data
// app.post('/getcart', fetchUser, async (req, res) => {
//     console.log("get cart");
//     let userData = await Users.findOne({_id: req.user.id});
//     res.json(userData.cartData);
// })

// // Creating endpoint to add item to wishlist
// app.post('/addtowishlist', fetchUser, async (req, res) => {
//     console.log("added to wishlist", req.body.itemId);
//     let userData = await Users.findOne({_id: req.user.id});
//     if (!userData.wishlistData.includes(req.body.itemId)) {
//         userData.wishlistData.push(req.body.itemId);
//         await Users.findOneAndUpdate({_id: req.user.id}, {wishlistData: userData.wishlistData});
//     }
//     res.send("Added to Wishlist");
// })

// // Creating endpoint to remove item from wishlist
// app.post('/removefromwishlist', fetchUser, async (req, res) => {
//     console.log("removed from wishlist", req.body.itemId);
//     let userData = await Users.findOne({_id: req.user.id});
//     userData.wishlistData = userData.wishlistData.filter(id => id !== req.body.itemId);
//     await Users.findOneAndUpdate({_id: req.user.id}, {wishlistData: userData.wishlistData});
//     res.send("Removed from Wishlist");
// })

// // Creating endpoint to get wishlist data
// app.post('/getwishlist', fetchUser, async (req, res) => {
//     console.log("get wishlist");
//     let userData = await Users.findOne({_id: req.user.id});
//     res.json(userData.wishlistData);
// })

// app.listen(port, (error) => {
//     if (!error) {
//         console.log("Server running on port " + port);
//     } else {
//         console.log("Error: " + error);
//     }
// });

// require('dotenv').config();

// const port = process.env.PORT || 4000;
// const express = require("express");
// const app = express();
// const mongoose = require("mongoose");
// const jwt = require("jsonwebtoken");
// const multer = require("multer");
// const path = require("path");
// const cors = require("cors");

// app.use(express.json());
// app.use(cors());

// // Database connection with MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// }).then(() => {
//     console.log("Connected to MongoDB");
// }).catch((error) => {
//     console.error("Error connecting to MongoDB: ", error);
// });

// // Rest of your code...

// // API creation
// app.get("/", (req, res) => {
//     res.send("Express app is running");
// });

// // Image storage engine
// const storage = multer.diskStorage({
//     destination: './upload/images',
//     filename: (req, file, cb) => {
//         cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
//     }
// });

// const upload = multer({ storage: storage });
// app.use('/images', express.static('upload/images'));

// // Creating upload endpoint for images
// app.post("/upload", upload.single('product'), (req, res) => {
//     res.json({
//         success: 1,
//         image_url: `http://localhost:${port}/images/${req.file.filename}`
//     });
// });

// // Schema for creating products
// const Product = mongoose.model("Product", {
//     id: {
//         type: Number,
//         required: true,
//     },
//     name: {
//         type: String,
//         required: true,
//     },
//     image: {
//         type: String,
//         required: true
//     },
//     category: {
//         type: String,
//         required: true,
//     },
//     new_price: {
//         type: Number,
//         required: true,
//     },
//     old_price: {
//         type: Number,
//         required: true,
//     },
//     date: {
//         type: Date,
//         default: Date.now,
//     },
//     available: {
//         type: Boolean,
//         default: true,
//     },
// });

// app.post('/addproduct', async (req, res) => {
//     let products = await Product.find({});
//     let id;
//     if (products.length > 0) {
//         let last_product_array = products.slice(-1);
//         let last_product = last_product_array[0];
//         id = last_product.id + 1;
//     } else {
//         id = 1;
//     }
//     const product = new Product({
//         id: id,
//         name: req.body.name,
//         image: req.body.image,
//         category: req.body.category,
//         new_price: req.body.new_price,
//         old_price: req.body.old_price,
//     });
//     console.log(product);
//     await product.save();
//     console.log("Saved");
//     res.json({
//         success: true,
//         name: req.body.name,
//     });
// });

// // Creating API for deleting products
// app.post('/removeproduct', async (req, res) => {
//     await Product.findOneAndDelete({ id: req.body.id });
//     console.log("Removed");
//     res.json({
//         success: true,
//         name: req.body.name,
//     });
// });

// // Creating API for getting all products
// app.get('/allproducts', async (req, res) => {
//     let products = await Product.find({});
//     console.log("All products fetched");
//     res.send(products);
// });

// // Schema creation for user model
// const Users = mongoose.model('Users', {
//     name: {
//         type: String,
//         required: true,
//     },
//     email: {
//         type: String,
//         unique: true,
//         required: true,
//     },
//     password: {
//         type: String,
//         required: true,
//     },
//     cartData: {
//         type: Object,
//     },
//     date: {
//         type: Date,
//         default: Date.now,
//     },
// });

// // Creating endpoint for registering user
// app.post('/signup', async (req, res) => {
//     try {
//         let check = await Users.findOne({ email: req.body.email });
//         if (check) {
//             return res.status(400).json({ success: false, errors: "Existing user found with same email address" });
//         }
//         let cart = {};
//         for (let i = 0; i < 300; i++) {
//             cart[i] = 0;
//         }
//         const user = new Users({
//             name: req.body.username,
//             email: req.body.email,
//             password: req.body.password,
//             cartData: cart,
//         });

//         await user.save();

//         const data = {
//             user: {
//                 id: user.id
//             }
//         };
//         const token = jwt.sign(data, 'secret_ecom');
//         res.json({ success: true, token });
//     } catch (error) {
//         console.error('Error during signup:', error);
//         res.status(500).json({ success: false, errors: "Server error" });
//     }
// });

// // Creating endpoint for user login
// app.post('/login', async (req, res) => {
//     try {
//         let user = await Users.findOne({ email: req.body.email });
//         if (user) {
//             const passCompare = req.body.password === user.password;
//             if (passCompare) {
//                 const data = {
//                     user: {
//                         id: user.id
//                     }
//                 };
//                 const token = jwt.sign(data, 'secret_ecom');
//                 res.json({ success: true, token });
//             } else {
//                 res.json({ success: false, error: "Wrong password" });
//             }
//         } else {
//             res.json({ success: false, errors: "Wrong Email Id" });
//         }
//     } catch (error) {
//         console.error('Error during login:', error);
//         res.status(500).json({ success: false, errors: "Server error" });
//     }
// });

// //creating end point for newcollection data
// app.get('/newcollections',async(req,res)=>{
//     let products=await Product.find({});
//     let newcollection =products.slice(1).slice(-8);
//     console.log("newcollections fetched");
//     res.send(newcollection);
// })

// //creating end point for popular in women 
// app.get('/popularinwomen',async (req,res)=>{
//     let products =await Product.find({category:"women"});
//     let popular_in_women =products.slice(0,4);
//     console.log("Popular in women fetched");
//     res.send(popular_in_women);
// })

// //creating middleware to fetch user
// const fetchUser=async (req,res,next)=>{
//     const token =req.header('auth-token');
//     if(!token){
//         res.status(401).send({errors:"Pls authenticate using valid token"})
//     }
//     else{
//         try{
//             const data=jwt.verify(token,'secret_ecom');
//             req.user=data.user;
//             next();
//         }catch (error){
//             res.status(401).send({errors:"pleases authenticate using valid token"})
//         }
//     }
// }

// //creating endpoint for adding products in cartdata

// app.post('/addtocart',fetchUser,async (req,res)=>{
//     console.log("added",req.body.itemId);
//     let userData= await Users.findOne({_id:req.user.id});
//     userData.cartData[req.body.itemId]+=1;
//     await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
//     res.send("Added")
// })

// //creating endpoint to remove product from cartdata
// app.post('/removefromcart',fetchUser,async (req,res)=>{
//     console.log("removed",req.body.itemId);
//     let userData= await Users.findOne({_id:req.user.id});
//     if(userData.cartData[req.body.itemId]>0)
//     userData.cartData[req.body.itemId]-=1;
//     await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
//     res.send("Removed")
// })

// //creating endpoint to get cartdata
// app.post('/getcart',fetchUser,async (req,res)=>{
//     console.log("get cart");
//     let userData= await Users.findOne({_id:req.user.id});
//     res.json(userData.cartData);
// })

// app.listen(port, (error) => {
//     if (!error) {
//         console.log("Server running on port " + port);
//     } else {
//         console.log("Error: " + error);
//     }
// });
