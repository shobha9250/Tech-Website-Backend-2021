const jwt = require('jsonwebtoken');
const config = require('../config');


const isAuthenticated = (req, res, next) => {

  const token = req.headers.authorization;
  if (token) {
    try{
        jwt.verify(token, config.key, (err, data) => {
        if (err) {
        
            return res.status(401).json({
                success: false, err: 'unauthenticated request'
            });
        }
        //else {
        let email = data.email;
        email = email.replace(/\./g, ',');
        const name = data.name;

        req.body.email = email;
        req.body.name = name;
        console.log(email+ " "+ name);
        //}
    });
  }
  catch(error){
    res.status(401).json({
      success: false, err: 'unauthenticated request'
    });
  }
  return next();
}
else {
    res.status(401).json({
      success: false, err: 'unauthenticated request'
    });
  }
};

module.exports =  isAuthenticated;
