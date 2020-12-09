const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session");
const findOrCreate = require("mongoose-findorcreate");
const flash = require('connect-flash');


const app = express();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set("view engine", "ejs");

app.use(session({
    secret: "this project is important",
    resave: true,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/assignmentdb", { useNewUrlParser: true, useUnifiedTopology: true });
app.use(bodyParser.json());

const UserSchema = new mongoose.Schema({
    "username": String,
    "password": String,
    "purchaseList": Array
});

const MovieSchema = new mongoose.Schema({
    "name": String,
    "date": String, // DD-MM-YY
    "startTime": String, // HH-MM-SS
    "endTime": String, // HH-MM-SS
    "description": String,
    "director": String,
    "duration": String,
    "price": Number,
    "totalTickets": Number
});


UserSchema.plugin(passportLocalMongoose);
UserSchema.plugin(findOrCreate);


const User = mongoose.model("User", UserSchema);
const Movie = mongoose.model("Movie", MovieSchema);


passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

function escapeRegex(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

app.get("/", function(req, res) {
    if (req.isAuthenticated()) {
        Movie.find({}, function(err, data) {
            if (req.query.search) {
                Movie.find({ name: req.query.search }, function(err, allFound) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(allFound);
                        if (allFound.length > 0) {
                            res.render("index", { allFound: allFound , data: data})
                        } else {
                            res.redirect("/")
                        }
                    }
                })
            } else {
                res.render("index", {data: data});
            }
        })


    } else {
        res.redirect("login");
    }

});

app.get("/login", function(req, res) {
    res.render("login");
});

app.get("/register", function(req, res) {
    res.render("register");
});

app.get("/editDetails", function(req,res){
	Movie.find({}, function(err, data) {
		res.render("editDetails", {data: data});
	});
})

app.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/login");
});


app.post("/login", function(req, res) {
    const user = new User({
        "username": req.body.username,
        "password": req.body.password
    });
    req.login(user, function(err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local", { failureRedirect: "/login" })(req, res, function() {
                console.log(req.user);
                res.redirect("/");
            })
        }
    })
})

app.post("/register", function(req, res) {
    User.register({ username: req.body.username }, req.body.password, function(err, user) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function() {
                console.log(req.user);
                res.redirect("/");
            })
        }
    })
});

app.post("/addMovies", function(req, res) {
    const obj = new Movie(req.body);
    obj.save(function(err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/");
        }
    });

})

app.post("/addDetails", function(req, res) {
    var date = req.body.date;
    var startTime = req.body.startTime;
    var endTime = req.body.endTime;
    var newStartTime = new Date(date + " " + startTime)
    var newEndTime = new Date(date + " " + endTime)

    Movie.find({}, function(err, movies) {
        var flag = 0;
        movies.forEach(function(movie) {
            var curr_date = movie.date;
            var curr_startTime = movie.startTime;
            var curr_endTime = movie.endTime;

            var currStart = new Date(curr_date + " " + curr_startTime);
            var currEnd = new Date(curr_date + " " + curr_endTime);

            if (Date.parse(currStart) >= Date.parse(newStartTime) && Date.parse(currStart) < Date.parse(newEndTime)) {
                flag = 1;
                console.log("Time clashed");
                res.redirect("/login");
                // break;
            } else if (Date.parse(currStart) < Date.parse(newStartTime) && Date.parse(currEnd) > Date.parse(newStartTime)) {
                flag = 1;
                // console.log("Time clashed")
                res.redirect("/login");
                // break;
            }

        });

        if (flag === 0) {
            Movie.findByIdAndUpdate({ _id: req.body.id }, { "date": req.body.date, "startTime": req.body.startTime, "endTime": req.body.endTime, "price": req.body.price, "totalTickets": req.user.totalTickets }, function(err, arr) {
                if (err) {
                    console.log(err);
                }
            })
        }
    })
});

app.post("/purchase", function(req, res) {
    if (req.isAuthenticated()) {
        var obj = {
            "name": req.body.name,
            "noOfTickets": req.body.noOfTickets
        }
        req.user.purchaseList.push(obj);
        User.find({name: req.body.name}, function(err,data){
        	console.log(data.totalTickets);
        })

        User.findOneAndUpdate({name: req.body.name },  
		    {totalTickets: totalTickets-req.body.noOfTickets}, null, function (err, docs) { 
		    if (err){ 
		        console.log(err) 
		    } 
		    else{ 
		        console.log("Original Doc : ",docs); 
		    } 
		}); 

        res.rediect("/");
    } else {
        res.redirect("/login")
    }
});



app.listen(3000);