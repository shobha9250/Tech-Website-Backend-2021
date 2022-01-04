// 2021-2022---------------------------------------------------

const jwt = require('jsonwebtoken');
const config = require('../config');
const organisers = require('../organisers');


const isAuthenticatedOrganiser = (req, res, next) => {
  const token = req.headers.authorization;

  if (token) {
    jwt.verify(token, config.key, (err, data) => {
      if (err) {

        res.status(401).json({
          success: false, err: 'unauthenticated request'
        });
      }
      else {
        let email = data.email  ;
        email = email.replace(/\./g, '');
        email = email.replace(/@/g, '');
        console.log('isAuthenticatedOrganiser email = '+ email);
        console.log(organisers[email]);
        if(organisers[email] === true)
            return next();
        else {
          res.status(401).json({
            success: false, err: 'you are not an organiser'
          });
        }
      }
    });
  }
  else {
    res.status(401).json({
      success: false, err: 'unauthenticated request'
    });
  }
};
module.exports=isAuthenticatedOrganiser;
