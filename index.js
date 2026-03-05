const express = require('express');
const hbs = require('express-handlebars');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("Missing Connection Data");
    process.exit(1);
}

//Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//Connect to Mongo
async function connectToMongo() {
    try {
        await mongoose.connect(MONGO_URI, { dbName: "Empl"});
        console.log("Connected to MongoDB!!");
    }
    catch (err) {
        console.error("Error connecting to MongoDB:", err.message);
        process.exit(1);
    }
};

const employeeSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    department: { type: String, required: true },
    startDate: { type: Date, required: true },
    jobTitle: { type: String, required: true, trim: true },
    salary: { type: Number, required: true, min: 0 }
});

const dateInput = (date) => {
    if (!date) return "";
    const dt = new Date(date);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
};

const Employee = mongoose.model("Employee", employeeSchema, "employees");

const departments = ["HR", "Marketing", "Engineering", "Sales", "Finance"];
const DepartmentsList = (selected) =>
    departments.map((dept) => ({ name: dept, selected: dept === selected }));

app.engine("hbs", hbs.engine({ extname: ".hbs" }));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));


app.get("/", (req, res) => {
    res.render("index", { title: "Create Employee", departments: DepartmentsList(), form: {} });
});

app.post("/employees", async (req, res) => {
    try {
        const { firstName, lastName, department, startDate, jobTitle, salary } = req.body;

        await Employee.create({ 
            firstName, 
            lastName, 
            department, 
            startDate, 
            jobTitle, 
            salary: Number(salary) 
        });

        res.redirect("/employees");
    } catch (err) {
        console.error("Error creating employee:", err.message);
        res.status(400).render("index", { 
            title: "Create Employee", 
            departments: DepartmentsList(req.body.department), 
            error: "Error creating employee", 
            form: req.body 
        });
    }
});
app.get("/employees", async (req, res) => {
    const employees = await Employee.find().lean();
    res.render("employees", { title: "Employee List", employees });
});

app.get("/employees/:id/edit", async (req, res) => {
    const employee = await Employee.findById(req.params.id).lean();
    if (!employee) {
        return res.status(404).send("Employee not found");
    }
    res.render("edit", { 
        title: "Update Employee", 
        employee: { ...employee, startDateValue: dateInput(employee.startDate) },
        departments: DepartmentsList(employee.department) 
    });
});

app.post("/employees/:id/update", async (req, res) => {
    try {
        const { firstName, lastName, department, startDate, jobTitle, salary } = req.body;

        await Employee.findByIdAndUpdate(req.params.id, { 
            firstName, 
            lastName,
            department, 
            startDate, 
            jobTitle, 
            salary: Number(salary) 
        });

        res.redirect("/employees");
    } catch (err) {
        console.error("Error updating employee:", err.message);
        res.status(400).render("edit", { 
            title: "Update Employee", 
            employee: { ...req.body, _id: req.params.id }, 
            departments: DepartmentsList(req.body.department), 
            error: "Error updating employee" 
        });
    }
});

app.get("/employees/:id/delete", async (req, res) => {
    try {
        const deleted = await Employee.findByIdAndDelete(req.params.id).lean();
        const message = deleted
            ? `Deleted ${deleted.firstName} ${deleted.lastName} from the database.`
            : "Employee not found.";

        res.render("delete", { title: "Delete", message });
    } catch (err) {
        console.error("Error deleting employee:", err.message);
        res.status(400).render("delete", { title: "Delete", message: "Error deleting employee." });
    }
});

connectToMongo().then(()=>{
    app.listen(PORT, ()=>{
        console.log(`Server is running on port ${PORT}`);
    });
});

