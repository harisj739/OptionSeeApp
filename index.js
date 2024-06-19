const express = require("express");
const fetch = require("node-fetch");
const app = express();
const session = require("express-session");
const bcrypt = require("bcrypt");
const pool = require("./dbPool");

app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(
  session({
    secret: "#sf356&*>?iok",
    resave: false,
    saveUninitialized: true,
  }),
);

function isAuntheticated(req, res, next) {
  if(!req.session.authenticated) {
    res.redirect("login");
  }
  else {
    next();
  }
}

app.use(express.urlencoded({ extended: true }));

// Root route (login page).
app.get("/", async (req, res) => {
  // res.render('index', {flightData: data});
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("index");
});

// Root route (login page).
app.post("/login", async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  let hashedPwd = "";
  let sql = "SELECT * FROM user WHERE userName = ?";
  let rows = await executeSQL(sql, [username]);

  //alt results attempt
  let locationsQuery = "SELECT * FROM location";
  let locations = await executeSQL(locationsQuery, []);
  let randomNumber = Math.floor(Math.random() * 1000000);
  //end

  if (rows.length === 0) {
    res.render("index", { message: "Account does not exist" });
  } else {
    if (rows.length > 0) {
      let storedPassword = rows[0].password;

      if (password === storedPassword) {
        req.session.authenticated = true;
        req.session.name = rows[0].userId;
        res.render("home", {
          rows: rows,
          locations: locations,
          number: randomNumber,
          user: rows,
        });
      } else {
        res.render("index", { message: "Invalid username or password" });
      }
    }
  }
});

// Register / register
app.get("/register", async (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  let {
    newUsername,
    newPassword,
    firstName,
    lastName,
    dob,
    sex,
    email,
    phone,
  } = req.body;
  let checkUsernameQuery = "SELECT * FROM user WHERE userName = ?";
  let existingUser = await executeSQL(checkUsernameQuery, [newUsername]);

  if (existingUser.length > 0) {
    res.render("register", { message: "Username already exists" });
  } else {
    let insertUserQuery = `
      INSERT INTO user (userName, password, fName, lName, dob, sex, email, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let insertResult = await executeSQL(insertUserQuery, [
      newUsername,
      newPassword,
      firstName,
      lastName,
      dob,
      sex,
      email,
      phone,
    ]);
    if (insertResult.affectedRows > 0) {
      let sql = "SELECT * from user WHERE userName = ?";
      let user = await executeSQL(sql, [req.body.newUsername]);
      req.session.name = user[0].userId;
      let locationsQuery = "SELECT * FROM location";
      let locations = await executeSQL(locationsQuery, []);
      let randomNumber = Math.floor(Math.random() * 1000000);
      res.render("home", {
        user: user,
        locations: locations,
        number: randomNumber,
      });
    } else {
      res.render("register", { message: "Error creating user" });
    }
  }
});

// Home page route
app.get("/home", isAuntheticated, async (req, res) => {
  if (req.session.authenticated) {
    let locationsQuery = "SELECT * FROM location";
    let locations = await executeSQL(locationsQuery, []);
    let randomNumber = Math.floor(Math.random() * 1000000);

    res.render("home", { locations: locations, number: randomNumber });
  }
});

app.post("/home", isAuntheticated, async (req, res) => {
  let { destination, departureDate } = req.body;

  let locationQuery = "SELECT * FROM location WHERE locationId = ?";
  let locationDetails = await executeSQL(locationQuery, [destination]);

  let flightsQuery = `
    SELECT *
    FROM flight
    WHERE dstAirport = ? AND DATE(dptTime) = ?
  `;
  let flights = await executeSQL(flightsQuery, [
    locationDetails[0].locationId,
    departureDate,
  ]);

  //testing for results page
  let sql =
    "INSERT INTO tempticket (tempDst, tempDptDate, tempConf, userId) VALUES (?, ?, ?, ?)";
  let confirmation = req.body.confirmation;
  let userId = req.session.name;
  let rows = await executeSQL(sql, [
    destination,
    departureDate,
    confirmation,
    userId,
  ]);
  sql =
    "SELECT * FROM location JOIN tempticket ON location.locationId = tempTicket.tempDst WHERE tempTicket.tempConf = ?";
  let ticket = await executeSQL(sql, [confirmation]);

  res.render("results", { flights, ticket: ticket, userId: userId });
});

app.get("/results", isAuntheticated, async (req, res) => {
    res.render("results");
});

app.post("/results", isAuntheticated, async (req, res) => {
  let numTickets = req.body.numTickets;
  let dptTime = req.body.dptTime;
  let confirmation = req.body.confirmation;
  let userId = req.session.name;
  let ticketPrice = req.body.ticketPrice;
  let totalCost = numTickets * ticketPrice;
  //randomly choosing airline
  let airlineId = Math.floor(Math.random() * 5) + 1;

  let [hours, minutes, ampm] = dptTime.split(/[:\s]/);
  hours = parseInt(hours);
  if (ampm == "pm") {
    if (hours != 12) {
      hours += 12;
    }
  }
  let random = Math.floor(Math.random() * 4) + 3;
  hours += random;

  if (hours > 0 && hours < 12) {
    ampm = "am";
  } else if (hours === 12) {
    ampm = "pm";
  } else if (hours > 12 && hours < 24) {
    ampm = "pm";
    hours -= 12;
  } else if (hours === 24) {
    ampm = "am";
    hours -= 12;
  } else if (hours > 24) {
    ampm = "am";
    hours -= 24;
  }

  let formattedArrivalTime = `${hours}:${minutes} ${ampm}`;

  let sql = `UPDATE tempticket 
            SET tempNumTickets = ?, tempDptTime = ?, 
            tempArrTime = ?, totalCost = ?, airlineId = ? 
            WHERE tempConf = ?`;
  let rows = await executeSQL(sql, [
    numTickets,
    dptTime,
    formattedArrivalTime,
    totalCost,
    airlineId,
    confirmation,
  ]);

  sql =
    "SELECT * FROM location JOIN tempticket ON location.locationId = tempTicket.tempDst WHERE tempTicket.tempConf = ?";
  let ticket = await executeSQL(sql, [confirmation]);

  if (!dptTime || numTickets == 0) {
    res.render("results", {
      message: "Please fill out all required fields",
      ticket: ticket,
      userId: userId,
      confirmation: confirmation,
    });
  } else {
    res.render("checkout", {
      ticket: ticket,
      userId: userId,
      confirmation: confirmation,
    });
  }
});

// cancel and delete tempticket
app.post("/results/cancel", isAuntheticated, async (req, res) => {
  let confirmation = req.body.confirmation;
  let userId = req.session.name;

  let deleteSql = "DELETE FROM tempticket WHERE tempConf = ?";
  let deleteResult = await executeSQL(deleteSql, [confirmation]);

  let locationsQuery = "SELECT * FROM location";
  let locations = await executeSQL(locationsQuery);
  let randomNumber = Math.floor(Math.random() * 1000000);

  res.render("home", { locations: locations, number: randomNumber, "userId": userId });
});

//proceeding from flights page to checkout page
app.get("/checkout", isAuntheticated, async (req, res) => {
  res.render("checkout");
});

app.post("/checkout", isAuntheticated, async (req, res) => {
  let confirmation = req.body.confirmation;
  let userId = req.body.userId;
  let totalCost = req.body.totalCost;
  let dptTime = req.body.dptTime;
  let numTickets = req.body.numTickets;

  let selectTemp = "SELECT * FROM tempticket WHERE tempticket.tempConf = ?";
  let rows = await executeSQL(selectTemp, [confirmation]);
  
  let insertFlightQuery = `INSERT INTO flight (airlineId, locationId, tempDptTime, tempDptDate) VALUES (?, ?, ?, ?)`;
  let insertFlightResult = await executeSQL(insertFlightQuery, [rows[0].airlineId, rows[0].tempDst, rows[0].tempDptTime, rows[0].tempDptDate]);

  sql = `SELECT * from flight`;
  rows = await executeSQL(sql);

  sql =
    "INSERT INTO ticket (userId, flightId, totalCost, ticketsBought, confirmationNo) values (?, ?, ?, ?, ?)";
  let insertTicketQuery = await executeSQL(sql, [
    userId,
    rows[rows.length - 1].flightId,
    totalCost,
    numTickets,
    confirmation,
  ]);

  let deleteSql = 'DELETE FROM tempticket WHERE tempConf = ?';
  let deleteResult = await executeSQL(deleteSql, [confirmation]);

  let message = `Thank you for flying with OptionSee! Your confirmation number is ${confirmation}`;
  res.render("checkout", { message: message });
});

// Route that specific the user profile.
app.get("/user/profile", isAuntheticated, async (req, res) => {
  let userId = req.session.name;

  let sql = `SELECT *, DATE_FORMAT(dob, '%Y-%m-%d') dobISO
                 FROM user 
                 WHERE userId = ?`;

  let params = [userId];

  let rows = await executeSQL(sql, params);

  res.render("profile", { users: rows });
});

// Route that specific the user profile.
app.post("/user/profile", isAuntheticated, async (req, res) => {
  let userId = req.session.name;

  let sql = `UPDATE user
                SET userName = ?,
                   password = ?,
                   fName = ?,
                   lName = ?,
                   dob = ?,
                   sex = ?,
                   email= ?,
                   phone = ?
                WHERE userId = ?`;

  let params = [
    req.body.username,
    req.body.pswd,
    req.body.firstName,
    req.body.lastName,
    req.body.dob,
    req.body.sex,
    req.body.email,
    req.body.phone,
    userId,
  ];

  let rows = await executeSQL(sql, params);

  sql = `SELECT *, DATE_FORMAT(dob, '%Y-%m-%d') dobISO
             FROM user 
             WHERE userId = ?`;

  params = [userId];

  rows = await executeSQL(sql, params);

  res.render("profile", { users: rows, message: "Profile updated!" });
});

app.get("/user/logout", isAuntheticated, function (req, res) {
  res.redirect("/login");
});

app.get("/user/delete", isAuntheticated, async function (req, res) {
  let userId = req.query.userId;

  let sql = `DELETE
             FROM user
             WHERE userId = ${userId}`;

  let rows = await executeSQL(sql);

  res.redirect("/login");
});

// Flight Data
app.get("/flightData/:locationId", async (req, res) => {
  // let flightId = req.params.flightId;
  // let sql = `SELECT * FROM flight WHERE flightId =  ?`;
  // let flightData = await executeSQL(sql, [flightId]);
  res.render("flightData");
});

// Local User API
app.get("/api/users/:uId", async (req, res) => {
  let userId = req.params.uId;

  let sql = `SELECT *
            FROM user
            WHERE userId = ? `;

  params = [userId];

  let rows = await executeSQL(sql, params);

  res.send(rows);
});

// Local Flight API
app.get("/api/flights", async (req, res) => {
  let flightId = req.params.fId;

  let sql = `SELECT *, DATE_FORMAT(tempDptDate, '%Y-%m-%d') depDate, TIME_FORMAT(dptTime, "%h:%i %p") depTime, DATE_FORMAT(dstTime, "%M %e, %Y") desDate, TIME_FORMAT(dstTime, "%h:%i %p") desTime FROM flight f, location l WHERE f.locationId = l.locationId`;

  params = [flightId];

  let rows = await executeSQL(sql, params);

  res.send(rows);
});

// Local Bookings API
app.get("/api/bookings/:uId", async (req, res) => {
  let userId = req.params.uId;

  // let sql = `SELECT *, dpt.airportName AS departure, dst.airportName AS destination, DATE_FORMAT(dptTime, "%M %e, %Y") depDate, TIME_FORMAT(dptTime, "%h:%i %p") depTime, DATE_FORMAT(dstTime, "%M %e, %Y") desDate, TIME_FORMAT(dstTime, "%h:%i %p") desTime FROM ticket t, flight f, airline l, airport dpt, airport dst, location loc WHERE t.flightId = f.flightId && f.airlineId = l.airlineId && f.dptAirport = dpt.airportId && f.dstAirport = dst.airportId && f.locationId = loc.locationId && userId = ?`;

  let sql = `SELECT *, DATE_FORMAT(flight.tempDptDate, '%Y-%m-%d') depDate FROM ticket 
       JOIN flight ON ticket.flightId = flight.flightId
       JOIN airline ON flight.airlineId = airline.airlineId
       JOIN location ON flight.locationId = location.locationId
       WHERE ticket.userId = ?`;

  params = [userId];

  let rows = await executeSQL(sql, params);

  res.send(rows);
});

// Add other information about flights and hotel booking
// start here
app.get("/flights", async (req, res) => {
  // add here
});

// Display user's history of bookings. - Haris
app.get("/user/history/:uId", isAuntheticated, async (req, res) => {
  let keyword = req.query.keyword;
  let userId = req.params.uId;
  if (!keyword) {
    let url = `https://team8-finalproject.amatricia.repl.co/api/bookings/${userId}`;
    let response = await fetch(url);
    let data = await response.json();
    res.render("bookings", { booking: data });
  } else {
    //let sql = `SELECT *, dpt.airportName AS departure, dst.airportName AS destination, DATE_FORMAT(dptTime, "%M %e, %Y") depDate, TIME_FORMAT(dptTime, "%h:%i %p") depTime, DATE_FORMAT(dstTime, "%M %e, %Y") desDate, TIME_FORMAT(dstTime, "%h:%i %p") desTime FROM ticket t, flight f, airline l, airport dpt, airport dst WHERE t.flightId = f.flightId && f.airlineId = l.airlineId && f.dptAirport = dpt.airportId && f.dstAirport = dst.airportId && userId = ? && (l.airlineName = ? || dpt.airportName = ? || dst.airportName = ?)`;
    let sql = `SELECT *, DATE_FORMAT(flight.tempDptDate, '%Y-%m-%d') depDate FROM ticket 
            JOIN flight ON ticket.flightId = flight.flightId
            JOIN airline ON flight.airlineId = airline.airlineId
            JOIN location ON flight.locationId = location.locationId
            WHERE ticket.userId = ? && airline.airlineName like ?`;
    let params = [userId, keyword, keyword];
    let rows = await executeSQL(sql, params);
    if (rows.length == 0) {
      res.render("bookings", { booking: rows, message: "None found." });
    }
    res.render("bookings", { booking: rows });
  }
});

/* This function executes the SQL queries based on the 
   provided parameters. */
async function executeSQL(sql, params) {
  return new Promise(function (resolve, reject) {
    pool.query(sql, params, function (err, rows, fields) {
      if (err) throw err;
      resolve(rows);
    });
  });
}

//start server
app.listen(3000, () => {
  console.log("Expresss server running...");
});
