import dotenv from "dotenv";
dotenv.config();
import express from "express"
import bodyParser from "body-parser";
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0"; //disables SSL/TLS certificate verification
import pg from "pg";
const {Pool} = pg
import jwt from "jsonwebtoken";
import cors from "cors"; //import
import validateToken from "./middleware/customersmiddleware";
let app = express();
import chatGPTRoutes from "./routes/chatGPT"; //import the chatGPT endpoint module
const HEIGHT_CONVERSION = {
  //this is coveting database-number from database into a string
  1: "4'8 - 4'11",
  2: "5'0 - 5'3",
  3: "5'4 - 5'6",
  4: "5'7 - 5'9",
  // "small" : "6 - 7",
  // large : "8 - 9"
};
let x_small = "1";
let small = "2";

// console.log(HEIGHT_CONVERSION[x_small])
HEIGHT_CONVERSION;

const pool = new Pool({
  user: "personalstyling_owner",
  host: "@ep-late-sun-a5d44wlu-pooler.us-east-2.aws.neon.tech",
  database: "personalstyling",
  password: "aiYkNjBE5W7H",
  port: 5432,
  ssl: {
    require: true,
  }
});

const corsOptions = {
  //import
  origin: "https://personal-styling-vue.vercel.app",
  credential: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions)); //in terminal: npm i cors

app.use(bodyParser.json());

app.use("/chatGPT", chatGPTRoutes); //use the chatGPT endpoint module to handle requests to "/chatGPT" endpoint

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Internal Server Error");
});

app.get("/login", (req, res) => {
  res.send("Hi");
});

app.post("/register", (req, res) => {
  // send email and password in the request body
  const first_name = req.body.first_name;
  const last_name = req.body.first_name;
  const email = req.body.email;
  const password = req.body.password;
  // save email and password to the database
  //pool.query is sending SQL commands to the database through Express.App
  pool.query(
    "INSERT INTO customers (first_name, last_name, email, password) VALUES ($1, $2, $3, $4)",
    [first_name, last_name, email, password],
    function (error, results) {
      if (error) {
        throw error;
      }
      res.send("User registered successfully");
    }
  );
});

app.post("/login", (req, res) => {
  //Get email and password
  const email = req.body.email;
  const password = req.body.password;
  //Check if email and password match in entry in my database
  pool.query(
    "SELECT * FROM customers WHERE email = $1 AND password = $2",
    [email, password],
    function (error, results) {
      if (error) {
        console.log(error);
      }
      if (results.rows.length > 0) {
        //continue with login
        const token = jwt.sign(
          { userID: results.rows[0].id },
          process.env.JWT_SECRET,
          { expiresIn: "10years" }
        );
        res.send(token);
      } else {
        //send back a login failed message
        res.send("Incorrect login details");
      }
    }
  );
  //Send back auth token if successful
});

app.get("/secret", validateToken, (req, res) => {
  res.send("A secret route");
});

app.post("/personalizequiz", (req, res) => {
  //updating the customers table in the database based on the user's selection
  let height = Number(req.body.height);
  let bust = Number(req.body.bust);
  let waist = Number(req.body.waist);
  let skinTone = req.body.skin_tone;
  let underTone = req.body.under_tone;
  let hairColor = req.body.hair_color;
  let eyeColor = req.body.eye_color;

  pool.query(
    "UPDATE customers SET skin_tone = $1, height = $2, bust = $3, waist = $4, hair_color = $5, eye_color = $6, under_tone = $7 WHERE id = $8",
    [skinTone, height, bust, waist, hairColor, eyeColor, underTone, req.userId],
    function (error, results) {
      if (error) {
        console.log(error);
        throw error;
      }
      res.send(req.body);
    }
  );
});

//enabling ChatGPT
app.get("/gpt/:skintone/:undertone/:eye_color/:hair_color", (req, res) => {
  let skinTone = req.params.skintone;
  let underTone = req.params.undertone;
  let eyeColor = req.params.eye_color;
  let hairColor = req.params.hair_color;

  const params = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a color analysis generating machine. Using skin tone, hair color, and eye color factors, you are going to help someone identify their color analysis season. ",
        },
        {
          role: "user",
          content: `Hello, my skin tone is ${skinTone} with a ${underTone} undertone. I have ${eyeColor} eyes and ${hairColor} hair. Using color analysis data, which of the four main seasons compliments my skin tone? What season compliments my skin tone? You should only respond with one of the four main seasons like spring, summer, autumn, or winter. Format your response as JSON where the color analysis season is defined by a property called season and the season description in a property called description and the season color palette in a property called colors. Do not add markdown formatting.`,
        },
      ],
    }),
  };

  fetch(
    `https://haja-proxy.onrender.com/gpt/${skinTone}/${underTone}/${eyeColor}/${hairColor}`
  )
    .then((response) => response.json())
    .then((gptData) => {
      pool.query(
        "SELECT O.id, O.outfit_link, O.description, O.available FROM outfits O JOIN outfit_season B ON O.id = B.outfit_id JOIN seasons S ON S.id = B.season_id WHERE s.season_name = $1 AND O.available = true",
        [gptData.season.toLowerCase()],
        function (error, results) {
          if (error) {
            console.log(error, "database error");
          }
          //check if no outfits available, send soemthing back so front end can handle no outfits
          if (results.rows.length > 0) {
            const analysisData = {
              season: gptData.season,
              description: gptData.description,
              colors: gptData.colors,
              outfits: results.rows,
            };

            res.send(analysisData);
          } 
        }
      );
    });
});

//endpoint
app.post("/submit", validateToken, (req, res) => {
  const { outfit_ids } = req.body;
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }

  //current date and time
  const orderDate = new Date();
  const orderDateFormatted = orderDate.toLocaleDateString(undefined, options)
  const orderTime = orderDate.toLocaleTimeString();
  let orderId;

  //insert the order into the orders table
  pool.query(
    "INSERT INTO orders (order_date, order_time, customer_id) VALUES ($1, $2, $3) RETURNING id",
    [orderDateFormatted, orderTime, req.userId],
    async (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).send("Order could not be processed");
      }

      orderId = results.rows[0].id;
      
      //make the outfit unavailable
      for(const outfit of outfit_ids) {
        const query =`UPDATE outfits SET available = false WHERE id = ${outfit.id} RETURNING id`
        const result = await pool.query(query)

        console.log(result.rows)
      }

        //sending response back with the order date, time, and ID
        res.send({
          message: "Order submitted successfully",
          orderId: orderId,
          orderDate: orderDateFormatted,
          orderTime: orderTime,
        });
    }
  );
});

app.listen(3000);
export default app 
