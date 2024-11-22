import jwt from 'jsonwebtoken'
// to access decode method

function validateToken(req, res, next) {
    //get the token
    const token = req.header('Authorization') //getting authorization out of the header in Postman


    //check if the token is valid- decode the token with try/catch
    try {
            //if valid token setID and continue to next route
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET) 
            req.userId = decodedToken.userID
            next()
    } catch(error) {
        //if invalid token / no token- send back unauthorized
        res.send("Invalid auth token")

    }

}

export default validateToken //exporting the function out of this file so it can be used in index.js