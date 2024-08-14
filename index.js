const express = require("express");
const path = require("path");
const app = express();
const ejs = require("ejs");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");
const mongoose = require("mongoose");
const User = require("./models/user");
const Appointment = require("./models/Appointment");

// Connect to MongoDB
mongoose.connect(
  "mongodb+srv://harsh59266:ea0YTb2sO0248v2r@cluster0.duxnli5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
).then(() => {
  console.log("Connected to MongoDB");
}).catch((error) => {
  console.error("MongoDB connection error:", error);
});

// Middleware setup
app.use(
  session({
    secret: "your_secret_key_here",
    resave: false,
    saveUninitialized: false,
  })
);
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to authenticate driver
// Middleware to authenticate driver
const authenticateDriver = async (req, res, next) => {
  try {
    if (req.session && req.session.user && req.session.user.userType === "Driver") {
      const user = await User.findById(req.session.user._id);
      if (user) {
        req.user = user;
        next();
      } else {
        res.redirect("/login");
      }
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

// Middleware to authenticate admin
const authenticateAdmin = async (req, res, next) => {
  try {
    if (req.session && req.session.user && req.session.user.userType === "Admin") {
      const user = await User.findById(req.session.user._id);
      if (user) {
        req.user = user;
        next();
      } else {
        res.redirect("/login");
      }
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

// Middleware to authenticate examiner
const authenticateExaminer = async (req, res, next) => {
  try {
    if (req.session && req.session.user && req.session.user.userType === "Examiner") {
      const user = await User.findById(req.session.user._id);
      if (user) {
        req.user = user;
        next();
      } else {
        res.redirect("/login");
      }
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

// Define time slots
const timeSlots = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM",
  "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM"
];

// Routes

// Home page
app.get("/", (req, res) => {
  res.render("index", { user: req.session.user });
});

// Signup page
app.get("/signup", (req, res) => {
  res.render("signup", { user: req.session.user });
});

app.post("/signup", async (req, res) => {
  const { username, password, repeatPassword, userType } = req.body;
  if (password !== repeatPassword) {
    return res.status(400).send("Passwords do not match");
  }
  try {
    const newUser = new User({
      username,
      password,
      userType,
      firstName: "default",
      lastName: "default",
      licenseNumber: "default",
      age: 0,
      carDetails: {
        make: "default",
        model: "default",
        year: 0,
        plateNumber: "default",
      },
    });
    await newUser.save();
    res.redirect("/login");
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Login page
app.get("/login", (req, res) => {
  res.render("login", { user: req.session.user });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    console.log("Login attempt:", { username, password });

    const user = await User.findOne({ username });
    if (!user) {
      console.log("User not found:", username);
      return res.status(400).send("Invalid username or password");
    }

    console.log("User found:", user);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match result:", isMatch);

    if (!isMatch) {
      return res.status(400).send("Invalid username or password");
    }

    req.session.user = { _id: user._id, userType: user.userType };
    console.log("User authenticated successfully:", req.session.user);

    res.redirect("/");
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed to logout");
    }
    res.redirect("/login");
  });
});

// Driver-specific routes
app.get("/g2", authenticateDriver, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const appointments = await Appointment.find({ date, isTimeSlotAvailable: true, testType: 'G2' });
    res.render("g2", { user: req.user, date, appointments, testType: 'G2' });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/g", authenticateDriver, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const appointments = await Appointment.find({ date, isTimeSlotAvailable: true, testType: 'G' });
    res.render("g", { user: req.user, date, appointments, testType: 'G' });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/bookAppointment", authenticateDriver, async (req, res) => {
  const { date, time, testType } = req.body;

  try {
    // Check if the user already has a booked appointment
    const existingAppointment = await Appointment.findOne({ bookedBy: req.user._id, testType });
    if (existingAppointment) {
      return res.status(400).send("You have already booked an appointment for this test type.");
    }

    // Check if the selected slot is available
    const appointment = await Appointment.findOne({ date, time, isTimeSlotAvailable: true, testType });
    if (!appointment) {
      return res.status(400).send("The selected slot is not available.");
    }

    // Book the appointment
    appointment.isTimeSlotAvailable = false;
    appointment.bookedBy = req.user._id;
    appointment.testType = testType;
    await appointment.save();

    // Redirect back to the appropriate page
    if (testType === 'G2') {
      res.redirect("/g2");
    } else {
      res.redirect("/g");
    }
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Update user car information (Driver only)
app.post("/updateUser", authenticateDriver, async (req, res) => {
  try {
    const { licenseNumber, make, model, year, plateNumber } = req.body;

    const user = await User.findById(req.session.user._id);

    if (user) {
      user.carDetails = { make, model, year, plateNumber };
      await user.save();

      res.redirect("/g");
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error updating user car information:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Handle user information submission from G2 page (Driver only)
app.post("/submit", authenticateDriver, async (req, res) => {
  try {
    const { firstName, lastName, licenseNumber, age, make, model, year, plateNumber } = req.body;

    const user = await User.findById(req.session.user._id);

    if (user) {
      user.firstName = firstName;
      user.lastName = lastName;
      user.licenseNumber = licenseNumber;
      user.age = age;
      user.carDetails = { make, model, year, plateNumber };

      await user.save();
      res.redirect("/g2");
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error updating user information:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Admin routes
app.get("/appointment", authenticateAdmin, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const existingAppointments = await Appointment.find({ date }).distinct('time');
    res.render("appointment", { user: req.user, date, existingAppointments, timeSlots });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/createAppointment", authenticateAdmin, async (req, res) => {
  const { date, time, testType } = req.body;

  try {
    if (!date) {
      return res.status(400).send("Date is required.");
    }

    // Convert the date string to a Date object
    const selectedDate = new Date(date);
    const today = new Date();

    // Set the time to midnight for comparison purposes
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    // Check if the selected date is in the past
    if (selectedDate < today) {
      return res.status(400).send("Cannot book an appointment for a past date.");
    }

    // Check if an appointment slot already exists
    const existingAppointment = await Appointment.findOne({ date, time, testType });
    if (existingAppointment) {
      return res.status(400).send("Appointment slot already exists for this date, time, and test type.");
    }

    // Create a new appointment slot
    const newAppointment = new Appointment({
      date,
      time,
      isTimeSlotAvailable: true,
      testType,
    });
    await newAppointment.save();
    res.redirect(`/appointment?date=${date}`);
  } catch (error) {
    console.error("Error creating appointment slot:", error);
    res.status(500).send("Internal Server Error");
  }
});


// Examiner routes
app.get("/examiner/dashboard", authenticateExaminer, async (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const testType = req.query.testType || ''; // Get the test type from the query string

    try {
        // Build the query based on the selected filter
        const query = { date };
        if (testType) {
            query.testType = testType;
        }

        // Fetch appointments based on the query, with the bookedBy field populated
        const appointments = await Appointment.find(query).populate('bookedBy').exec();

        // Render the examiner dashboard with the filtered appointments and selected test type
        res.render("examiner_dashboard", { user: req.user, date, appointments, testType });
    } catch (error) {
        console.error("Error fetching appointments:", error);
        res.status(500).send("Internal Server Error");
    }
});


app.post("/examiner/updateStatus", authenticateExaminer, async (req, res) => {
  const { appointmentId, status, comments } = req.body;

  try {
      const appointment = await Appointment.findById(appointmentId).populate('bookedBy');

      if (appointment) {
          appointment.status = status; // "Pass" or "Fail"
          appointment.comments = comments || ""; // Examiner comments
          await appointment.save();

          // Update the passFailStatus in the User model
          const user = await User.findById(appointment.bookedBy._id);
          if (user) {
              user.passFailStatus = status; // Update to "Pass" or "Fail"
              await user.save();
          }

          res.redirect("/examiner/dashboard");
      } else {
          res.status(404).send("Appointment not found");
      }
  } catch (error) {
      console.error("Error updating appointment status:", error);
      res.status(500).send("Internal Server Error");
  }
});



app.get("/examiner/viewDriver", authenticateExaminer, async (req, res) => {
  const { appointmentId } = req.query;

  try {
    const selectedAppointment = await Appointment.findById(appointmentId).populate('bookedBy').exec();

    const date = new Date().toISOString().split('T')[0];
    const appointments = await Appointment.find({ date }).populate('bookedBy').exec();

    res.render("examiner_dashboard", { user: req.user, appointments, selectedAppointment });
  } catch (error) {
    console.error("Error fetching driver details:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/examiner/addComment", authenticateExaminer, async (req, res) => {
  const { appointmentId, comments } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (appointment) {
      appointment.comments = comments;
      await appointment.save();
      res.redirect(`/examiner/viewDriver?appointmentId=${appointmentId}`);
    } else {
      res.status(404).send("Appointment not found");
    }
  } catch (error) {
    console.error("Error adding comments:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/examiner/addCommentAndStatus", authenticateExaminer, async (req, res) => {
  const { appointmentId, status, comments } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (appointment) {
      appointment.status = status;
      appointment.comments = comments;
      await appointment.save();
      res.redirect(`/examiner/viewDriver?appointmentId=${appointmentId}`);
    } else {
      res.status(404).send("Appointment not found");
    }
  } catch (error) {
    console.error("Error updating status and comments:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route for Admin to view Pass/Fail candidates
// Route for Admin to view Pass/Fail candidates
app.get("/admin/candidates", authenticateAdmin, async (req, res) => {
  try {
    const candidates = await Appointment.find({ status: { $in: ['Pass', 'Fail'] } })
      .populate('bookedBy')
      .exec();

    res.render("admin_candidates", { user: req.user, candidates });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).send("Internal Server Error");
  }
});


// Starting the server
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});