const WebSocket = require('ws');
const term = require('terminal-kit').terminal;
const prompt = require('prompt');
const Twitter = require('twitter');
const style = require('./styles')

////////////// Global varaibles //////////////////////////////

let username = '';
const serverAddress = '10.226.71.146:4930'  //'localhost:4930' //
let connection = null;
let y = term().height;

// objects for each message type. can chage property's value as needed
let messageAll = {
  from : `${username}`,
  to : "all",
  kind : "chat",
  data : ""
}
const messageUser = {
  from : `${username}`,
  to : "",
  kind : "direct",
  data : ""
}
const userList = {
    from : `${username}`,
    to : "",
    kind : "userlist",
    data : ""
}
const myUsername = {
    from : `${username}`,
    to : "",
    kind : "whoami",
    data : ""
}

///////////// Connection Functions ////////////////////////////////////////

// promise to get username before connecting
let getUsername = new Promise((resolve, reject) => {
  // prompt asks for name and does validation. 
  prompt.start();
  prompt.get([{
    name: "Name",
    pattern: /^[?!0-9a-zA-Z]{3,10}$/,
    message: 'Username must be between 3 and 10 alphanumeric characters',
    required: true
  }], function (err, result) {
    // Sets input to global variable username and returns it
    username = result.Name;
    resolve(result.Name);
    reject(err);
  });
})

// promise object that resolves once connected
let openConnection = new Promise((resolve, reject) => {
  // waits for username to be set then connects to server
  getUsername.then(
    (name => {
      term.windowTitle( "Welcome to JPChat" );
      connection = new WebSocket(`ws://${serverAddress}?username=${name}`);
      resolve(connection);
      })
    )
    .catch(err => {console.log(err)})
})

// contains events from server
let connectionTasks = function() {
  let postHeight = y/4;
  openConnection.then(connection => { 
    term().clear().nextLine(y),
    connection.onerror = function (error) {
      // Notifies if there was a problem with connection
      term('Sorry, but there\'s some problem with your '
      + 'connection or the server is down.')
    },
    connection.onmessage = function(event) {
      // parses data from server and outputs it on terminal
      try{
        let message = JSON.parse(event.data).data;
        let user = JSON.parse(event.data).from;
        let kind = JSON.parse(event.data).kind;

        // checks if message is an error
        if(kind === "ERROR"){
          term.previousLine(postHeight)
          term().scrollUp(1);
          term.red("ERROR")(message + '\n')
          term().moveTo(1, y);
        }
        else if(user === "GABServer"){
          term.previousLine(postHeight)
          term().scrollUp(1);
          term.yellow(user + ': ')(message + '\n');
          term().moveTo(1, y);
        }
        else{
          let styledMsg = checkRegex(message, user, kind);
        }
      }
      catch(e){
        console.log('Error', e)
      }
    },
    connection.onopen = function(event) {
      // calls functions to print instructions and sets key listener
      helpMessage()
      listenKeys();
    }
    })
  .catch(err => console.log(err))
}

connectionTasks();

///////////////////////// Utility Functions ///////////////////////

// sends different messages depending on what's pressed
// Always waits until openConnection is resolved
let setMessage = function(n) {
  openConnection.then(conn => {
    if(n === "All"){
      term.up(1)
      term('Enter message for all: \n');
      term.down(1)

      // waits until user input is recived, then changes message data property
      grabInput.then(input => {
        messageAll.data = input;

        term.previousLine(1).eraseLine().nextLine(1).eraseLine();

        // message is sent as a JSON string to server
        connection.send(JSON.stringify(messageAll));
      })      
    }
    else if(n === "DM"){
      recipent = null
      term.up(1)
      term('Enter recipent: \n');
      term.down(1)

      // waits until promise asking for recipent is resolved and changes message property to it
      grabInput.then(input => {
        messageUser.to = input;
        
        term.up(1)
        term.eraseLine();
        term(`\nasEnter message for ${messageUser.to}: \n`);
        term.down(1)
        // after creates new promise for message body
        new Promise((resolve, reject) => {
          term.eraseLine();
          let input = term.inputField({cursorPosition: 0}).promise;
          if(input != undefined) {
            resolve(input);
          }
          reject('Invalid input');
      }).then(input2 => {
          // once resolved changes object property 
          messageUser.data = input2;
      }).then(() => {
          term.previousLine(1)
          term.eraseDisplayBelow();
          term.nextLine(1);

          // message is sent as a JSON string to server
          // only user specified recives message
          connection.send(JSON.stringify(messageUser))
        })
      })
    }
    else if(n === "Me"){
      // sends JSON string to server. No change is needed
      // gets username
      connection.send(JSON.stringify(myUsername));
    }
    else if(n === "UserList"){
      // sends JSON string to server. No change is needed
      //gets list of users
      connection.send(JSON.stringify(userList));
    }
    else if(n === "Help"){
      // prints instructions
      term.yellow(helpMessage())
    }
    else if(n === "Close"){
      // closes connection and exits
      connection.close();
      process.exit();
    }
  })

  // promise object that returns user input
  let grabInput = new Promise((resolve, reject) => {
    term.eraseLine();
    let input = term.inputField({cursorPosition: 0}).promise;
    if(input != undefined) {
      resolve(input);
    }
    
    reject('Invalid input');
})

}

// checks incoming message for expressions in JSON file
function checkRegex(msg, from, kind) {

  // loops through expressions in JSON file and creates regex
  for(let i in style) {
    const exprssion = style[i].expression
    const regex = new RegExp(exprssion)

    if (regex.test(msg)) {
      const s = style[i].style;

      // splits string based on if expressions is found
      let splitString = msg.split(exprssion);

      term.previousLine(y/4)
      term().scrollUp(1);
      term.eraseLine();

      if(kind == 'direct'){
        term.blue(from + ': ')(splitString[0])[s](exprssion)(splitString[1])('\n')
      }
      else{
        term.green(from + ': ')(splitString[0])[s](exprssion)(splitString[1])('\n')
      }
      term().moveTo(1, y);
      
      return
    }
  }
  // shifts terminal up a line and writes message
  // last 2 lines are never written in
  term.previousLine(y/4)
  term().scrollUp(1);
  term.eraseLine();

  if(kind == 'direct'){
    term.blue(from + ': ')(msg + '\n');
  }
  else{
    term.green(from + ': ')(msg + '\n');
  }
  term().moveTo(1, y);
  
  return  
}

// prints intrsuctions on terminal screen in yellow
function helpMessage() {
  term.previousLine(y/4)
  term().scrollUp(1);
  term.yellow("Hold control and press  'A' to message all, 'D' for DM,'L' for "
  + "userlist, 'U' to get username, 'W' for Help, 'T' for Trump's latest tweet, and 'C' to close\n");
  term().scrollUp(2);
  term().moveTo(1, y);
}

// calls specific function based on key press
function listenKeys(){
  term.grabInput();
  // listen for the "keypress" event
  // calls function on specific keys, usually control + key
  term.on('key', function(name, matches, data) {
    if (name == 'CTRL_A') {
      term.grabInput('false');
      setMessage('All')
    }
    else if (name == 'CTRL_D') {
      term.grabInput('false');
      setMessage('DM')
    }
    else if (name == 'CTRL_L') {
      term.grabInput('false');
      setMessage('UserList');
    }
    else if (name == 'CTRL_U') {
      term.grabInput('false');
      setMessage('Me')
    }
    else if (name == 'CTRL_W') {
      term.grabInput('false');
      setMessage('Help')
    }
    else if (name == 'CTRL_K') {
      messageAll.data = "BILLIE";
      for(var i = 0; i < 100; i++){
        connection.send(JSON.stringify(messageAll))
      }
    }
    else if (name == 'CTRL_T') {
      trumpTweets();
    }
    else if (name == 'CTRL_C') {
      term.grabInput('false');
      setMessage('Close')
    }
  });
  
  process.stdin.setRawMode(true);
  process.stdin.resume();
}

///////////////////////// Twitter Features ///////////////////////

// creates twitter object of API
const client = new Twitter({
  consumer_key: 'WPdr0KJJjz0EKRg8EWxuGXzeE',
  consumer_secret: 'iXsQbM6FYFoDf78l7hdu7VkVMM7o2VX0KmU1nD89UsHlx0ulhj',
  access_token_key: '331925463-0FLNTOF7Hg6hP93L8qpj5CmliPS7ixxFjEkaqHvM',
	access_token_secret: 'Yz4Y0deMuygx9z16AlaxX58ed0ooOkU3EvyoFXj85J03B'
});


let params = {screen_name: 'realDonaldTrump', count: 1};

// send get request to twitter to get trump's last tweet
function trumpTweets() {
  client.get('statuses/user_timeline', params, function(error, tweets, response) {
    if (!error) {
      // gets when tweet was sent and what it was
      let createdAt = tweets[0].created_at;
      let tweetbody = tweets[0].text;
      
      
      // removes exta info in data time string
      createdAt = createdAt.substring(0, createdAt.indexOf('+'))

      // message is sent as a JSON string to server
      messageAll.data = 'On ' +  createdAt + ' @realDonaldTrump tweeted "' + tweetbody + '"'
      connection.send(JSON.stringify(messageAll))
    }
  });
}
