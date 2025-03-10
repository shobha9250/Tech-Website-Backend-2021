const admin = require("firebase-admin");
const { basicmail } = require("../utils/basicmail");
const mailHelper = require("../utils/emailHelper");

const database = admin.database();
const db = database.ref();
//return eventName
// {
// 	"managerial": ["a", "b"],
// 	"programming" : ["a","b"]
// }
// Hard-Coded String
const events = "events";
const eventDescription = "eventDescription";
const users = "users";
const registeredEvents = "registeredEvents19";
exports.getEventNames = (req, res) => {
  //optional - eventCategory
  if (req.query.eventCategory === undefined) {
    return db
      .child(events)
      .once("value")
      .then((snapshot) => {
        let database = snapshot.val();
        let data = {};
        data[events] = new Array();

        for (let category in database) {
          for (let event in database[category]) {
            let eventData = new Object();
            let eventName = database[category][event]["eventName"];

            eventData["eventName"] = eventName;
            eventData["eventCategory"] = category;

            data[events].push(eventData);
          }
        }

        let success = true;
        res.set("Cache-Control", "public, max-age=3600 , s-maxage=7200");
        return res.json({ success: success, data: data });
      });
  } else {
    let category = req.query.eventCategory;

    let node = events + "/" + category;

    return db
      .child(node)
      .once("value")
      .then((snapshot) => {
        //console.log(snapshot.val());
        let database = snapshot.val();
        if (database === null) {
          return res.json({
            success: false,
            message: `${category} category doesn't exist`,
          });
        }

        let data = {};
        data[events] = new Array();

        for (let event in database) {
          data[events].push({
            eventName: database[event].eventName,
            eventCategory: category,
          });
        }

        var success = true;
        res.set("Cache-Control", "public, max-age=3600 , s-maxage=7200");
        return res.json({ success: success, data: data });
      });
  }
};

// {
// 	categories: ["a", "b"]
// }
// returns json object with array of categories
exports.getCategories = (req, res) => {
  return db
    .child(events)
    .once("value")
    .then((snapshot) => {
      var data = { categories: [] };
      for (var i in snapshot.val()) {
        // get each category
        let category = i;
        data.categories.push(category);
      }

      message = "Categories received";
      success = true;
      res.set("Cache-Control", "public, max-age=3600 , s-maxage=7200");
      return res.json({ message: message, success: success, data: data });
    })
    .catch((err) => {
      return res.send({
        success: false,
        message: `Error occured while sending categories\n Error: ${err}`,
      });
    });
};

exports.addCategory = (req, res) => {
  let category = req.body.category;

  if (category === undefined) {
    return res.status(401).json({
      success: false,
      message: "Category not defined",
    });
  }

  let node = events + "/" + category;
  // check if node existe
  return db
    .child(node)
    .once("value")
    .then((snapshot) => {
      if (snapshot.val() !== null) {
        return res.status(401).json({
          success: false,
          message: "Category already exists",
        });
      } else {
        // create node
        return db
          .child(node)
          .set({ dummy: "dummy" })
          .then(() => {
            return res.status(200).json({
              success: true,
              message: "Category added",
            });
          });
      }
    })
    .catch((err) => {
      return res.status(401).json({
        success: false,
        message: `Error occured while adding category\n Error: ${err}`,
      });
    });
};

// to add a new events from the admin panel
exports.addEvent = (req, res) => {
  let eventData = req.body.eventData; // accepts JSON event data

  if (eventData === undefined) {
    return res.json({
      success: false,
      message: `Send event data as json data in $eventData`,
    });
  }

  if (
    eventData["eventName"] === undefined ||
    eventData["startTime"] === undefined ||
    eventData["endTime"] === undefined ||
    eventData["description"] === undefined ||
    eventData["category"] === undefined
  ) 
  {
    return res.status(400).json({
      success: false,
      message:
        "eventName, startTime, endTime, category  description-- are compulsory parameters",
    });
  }

  eventData.startTime = parseInt(eventData.startTime);
  eventData.endTime = parseInt(eventData.endTime);

  // check if category exists

  return db
    .child(events + "/" + eventData.category)
    .once("value")
    .then((snapshot) => {
      if (snapshot.val() === null) {
        throw new Error("Category doesn't exist");
      } else {
        // adding event to timeline
        // name, startTime and endTime
        // delete dummy node

        //  check if dummy node is there
        let node = events + "/" + eventData.category;
        db.child(node)
          .once("value")
          .then((snapshot) => {
            let database = snapshot.val();
            //  console.log(database);
            if (database["dummy"]) {
              // delete dummy node
              console.log(database["dummy"]);
              db.child(node)
                .update({
                  dummy: null,
                })
                .then(() => {
                  console.log("dummy node deleted");
                });
              // remove the dummy node
            }
          })
          .catch((err) => {
            return console.log(err);
          });

        db.child(`${events}/${eventData.category}/${eventData.eventName}`)
          .set({
            eventName: eventData.eventName,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
          })
          .then((snapshot) => {
            return console.log(
              `Added ${eventData.eventName} to timeline succesfully`
            );
          })
          .catch((err) => {
            throw new Error(err);
          });

        // adding event with full description to the node
        // with all the json data received

        let eventCategory = eventData.category;
        delete eventData.category;

        return db
          .child(`${eventDescription}/${eventCategory}/${eventData.eventName}`)
          .set(eventData)
          .then((snapshot) => {
            console.log(`Added ${eventData.eventName} successfully`);

            return res.send({
              success: true,
              message: `Added ${eventData.eventName} successfully`,
            });
          });
      }
    })
    .catch((err) => {
      return res.send({
        success: false,
        message: `Error occured while adding event to the timeline\nError : ${err}`,
      });
    });
};

// returns events description for single event
// or all the events of one category
exports.getEventDescription = (req, res) => {
  //	compulsory
  let categoryName = req.query.eventCategory;
  // optional parameter
  let eventName = req.query.eventName;

  if (categoryName === undefined) {
    return res.send({
      success: false,
      message: `Invalid Paramenters. \n Usage: eventCategory=category&[eventName=name]`,
    });
  }

  if (eventName === undefined) {
    db.child(`${eventDescription}/${categoryName}`)
      .once("value")
      .then((snapshot) => {
        if (snapshot.val() === null) {
          return res.send({
            success: false,
            message: `${categoryName} doesn't exist.`,
          });
        }

        let database = snapshot.val();
        // console.log(database);

        let data = {};
        data[events] = new Array();

        for (let event in database) {
          let eventData = database[event];
          eventData["eventCategory"] = categoryName;
          // console.log(eventData);

          data[events].push(eventData);
        }

        res.set("Cache-Control", "public, max-age=3600 , s-maxage=7200");
        return res.status(200).json({
          data: data,
          success: true,
        });
      })
      .catch(() => {
        return res.json({
          success: false,
          message: `could not fetch description for category ${categoryName}`,
        });
      });
  } else {
    db.child(`${eventDescription}/${categoryName}/${eventName}`)
      .once("value")
      .then((snapshot) => {
        let data = snapshot.val();
        if (data === null) {
          return res.send({
            success: false,
            message: `${eventName} in ${categoryName} doesn't exist.`,
          });
        }

        data["eventCategory"] = categoryName;
        res.set("Cache-Control", "public, max-age=3600 , s-maxage=7200");
        return res.status(200).json({
          data: data,
          success: true,
        });
      })
      .catch((err) => {
        return res.send({
          error: true,
          message: `Error in getting events details.\n Error: ${err}`,
        });
      });
  }
};

// returns events startTime, endTime and name
exports.getEventTimeline = (req, res) => {
  return db
    .child(events)
    .once("value")
    .then((snapshot) => {
      let database = snapshot.val();

      let data = {};
      data[events] = new Array();

      for (let category in database) {
        for (let event in database[category]) {
          let eventData = database[category][event];
          eventData["eventCategory"] = category;

          data[events].push(eventData);
        }
      }

      res.set("Cache-Control", "public, max-age=3600 , s-maxage=7200");
      return res.status(200).json({
        success: true,
        data: data,
      });
    })
    .catch((err) => {
      return res.status(500).send({
        success: false,
        message: `Error occured while getting events timeline\n Error : ${err}`,
      });
    });
};

exports.getRegisteredEvents = (req, res) => {
  let email = req.body.email;

  db.child(users + "/" + email + "/" + registeredEvents)
    .once("value")
    .then((snapshot) => {
      let database = snapshot.val();

      if (!database) {
        return res.status(400).json({
          success: false,
          message: "No events registered",
          data: {
            events: [],
          },
        });
      }

      let data = {};

      // console.log(database);

      return matchEventDescription(database, data)
        .then((data) => {
          return res.status(200).json({
            success: true,
            data: data,
          });
        })
        .catch((errData) => {
          return res.status(500).json(errData);
        });
    })
    .catch(() => {
      res.status(400).json({
        success: false,
        message: `Error while fetching user registered events`,
      });
    });
};

// registeredEvents
// {
// 	managerial: ["a", "b"],
// 	programming: ["a", "b"]
// }
// register user for a events
exports.eventRegister = (request, response) => {
  let eventName = request.body.eventName;
  let eventCategory = request.body.eventCategory;
  let email = request.body.email;
  var emailArray = request.body.email.split(",");
  var finalEmail = emailArray[0];
  for (let i = 1; i < emailArray.length; i++) {
    finalEmail += "." + emailArray[i];
  }

  if (eventName === undefined || eventCategory === undefined) {
    return response.status(400).json({
      success: false,
      message: `Invalid Parameters.\n Usage: eventName=event&eventCategory=category`,
    });
  }

  // check if the event exists
  db.child(`${events}/${eventCategory}/${eventName}`)
    .once("value")
    .then((snapshot) => {
      const data = snapshot.val();
      if (data === null) {
        throw new Error(`${eventName} in ${eventCategory} doesn't exist.`);
      }

      return db
        .child(users + "/" + email + "/" + registeredEvents)
        .once("value")
        .then((snapshot) => {
          let registeredEvent = snapshot.val();
          if (registeredEvent === undefined || registeredEvent === null) {
            registeredEvent = {};
          }

          // if not registred any events in that category
          if (registeredEvent[eventCategory] === undefined) {
            // create array fro category
            registeredEvent[eventCategory] = new Array();
            // push event into that category
            registeredEvent[eventCategory].push(eventName);
          } else {
            // if category already exists
            // push event to that category

            // if event already registered
            if (registeredEvent[eventCategory].indexOf(eventName) === -1) {
              registeredEvent[eventCategory].push(eventName);
            } else {
              return response.send({
                success: false,
                message: `already registered for ${eventName}`,
              });
            }
          }

          // update user registered events
          db.child(users + "/" + email)
            .update({
              [registeredEvents]: registeredEvent,
            })
            .then((data) => {
              var html = basicmail(
                "thankyou for your registeration",
                `you have succesfully registerd for the event: ${eventName}`,
                "checkout website",
                "https://website-frontend20-2mkfatxre.vercel.app/",
                "Thank you for registering for the event"
              );
              mailHelper({
                email: finalEmail,
                subject: "Event Registration",
                text: `You have been registered for ${eventName}`,
                html: html,
              }).then((info)=>{
                console.log(info);
              }).catch((err) => {
                console.log(err);
              });
              return response.json({
                success: true,
                status: `Successfully registered for ${eventName}`,
              });
            })
            .catch((err) => {
              console.log(err);
              return response.json({
                success: false,
                message: "could not register!",
                error: err,
              });
            });

          return console.log("registered");
        })
        .catch(() => {
          return response.json({
            success: false,
            message: "could not fetch user registered events",
            error: err,
          });
        });
    })
    .catch(() => {
      return response.status(400).json({
        success: false,
        message: `Error while fetching event details`,
      });
    });

  // get previsouly registered events
};

exports.eventUnregister = (request, response) => {
  let eventName = request.body.eventName;
  let eventCategory = request.body.eventCategory;
  let email = request.body.email;

  if (eventName === undefined || eventCategory === undefined) {
    return response.status(400).json({
      success: false,
      message: `Invalid Parameters.\n Usage: eventName=event&eventCategory=category`,
    });
  }

  // check if the event exists
  db.child(`${events}/${eventCategory}/${eventName}`)
    .once("value")
    .then((snapshot) => {
      const data = snapshot.val();
      if (data === null) {
        throw new Error(`${eventName} in ${eventCategory} doesn't exist.`);
      }

      // get previsouly registered events
      return db
        .child(users + "/" + email + "/" + registeredEvents)
        .once("value")
        .then((snapshot) => {
          let registeredEvent = snapshot.val();
          if (registeredEvent === undefined || registeredEvent === null) {
            return response.send({
              success: false,
              message: `not registered for ${eventName}`,
            });
          }

          if (registeredEvent[eventCategory] === undefined) {
            return response.send({
              success: false,
              message: `not registered for ${eventName}`,
            });
          }

          if (registeredEvent[eventCategory].indexOf(eventName) === -1) {
            return response.send({
              success: false,
              message: `not registered for ${eventName}`,
            });
          } else {
            registeredEvent[eventCategory].pop(eventName);
          }

          // update user registered events
          db.child(users + "/" + email)
            .update({
              [registeredEvents]: registeredEvent,
            })
            .then(() => {
              return response.json({
                success: true,
                status: `Successfully unregistered for ${eventName}`,
              });
            })
            .catch((err) => {
              return response.json({
                success: false,
                message: "could not unregister!",
                error: err,
              });
            });

          return;
        })
        .catch((err) => {
          return response.json({
            success: false,
            message: "could not fetch user registered events",
            error: err,
          });
        });
    })
    .catch(() => {
      return response.status(400).json({
        success: false,
        message: `Error while fetching event details`,
      });
    });
};

function matchEventDescription(database, data) {
  return new Promise(function (resolve, reject) {
    db.child(eventDescription)
      .once("value")
      .then((snap) => {
        // console.log("idhr hau mai");
        // console.log();
        // console.log();

        let eventsDes = snap.val();

        data[events] = new Array();

        for (let category in database) {
          let arrLen = database[category].length;

          for (let event = 0; event < arrLen; event++) {
            // event is single events registered by user in category = category
            let userEvent = database[category][event];
            let eventDetails = eventsDes[category][userEvent];

            // console.log(eventDetails);
            if (eventDetails) {
              eventDetails["eventCategory"] = category;
              data[events].push(eventDetails);
            } else {
              // console.log(eventDetails);
              // console.log(userEvent);
            }

            // data[category].push(eventDetails);
          }
        }

        // console.log(data);
        return resolve(data);
      })
      .catch((err) => {
        // console.log("error: ", err);		// have to add
        // deploy shows error - error needs to be handled
        data = {
          success: false,
          message: `coould not fetch event description`,
          error: err,
        };

        return reject(data);
      });
  });
}
