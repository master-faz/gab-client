const WebSocket = require('ws');
const term = require('terminal-kit').terminal;
const prompt = require('prompt');
const Twitter = require('twitter');

////////////// Global varaibles //////////////////////////////

let username = '';
const serverAddress = 'localhost:4930' //'10.226.148.164:4930' //
let connection = null;
let y = term().height;

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
let getUsername = new Promise((resolve, reject) => {
    prompt.start();
    prompt.get([{
      name: "Name",
      pattern: /^[?!0-9a-zA-Z]{3,10}$/,
      message: 'Username must be between 3 and 10 alphanumeric characters',
      required: true
    }], function (err, result) {
      username = result.Name;
      resolve(result.Name);
      reject(err);
    });
})

let openConnection = new Promise((resolve, reject) => {
  getUsername.then(
    (name => {
      term.windowTitle( "Welcome to JPChat" );
      connection = new WebSocket(`ws://${serverAddress}?username=${name}`);
      resolve(connection);
      })
    )
    .catch(err => {console.error(err)})
})

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
      try{
        let message = JSON.parse(event.data).data;
        let user = JSON.parse(event.data).from;
        let kind = JSON.parse(event.data).kind;

        if(kind === "ERROR"){
          term.previousLine(postHeight)
          term().scrollUp(1);
          term.red("ERROR")(message + '\n')
          term().moveTo(1, y);
        }
        else{
          term.previousLine(postHeight)
          term().scrollUp(1);
          term.green(user + ': ')(message + '\n');
          term().moveTo(1, y);
        }
      }
      catch(e){
      }
    },
    connection.onopen = function(event) {
      helpMessage()
      listenKeys();
    }
    })
  .catch(err => console.error(err))
}

connectionTasks();

///////////////////////// Utility Functions ///////////////////////

let setMessage = function(n) {
  openConnection.then(conn => {
    if(n === "All"){
      term.up(1)
      term('Enter message for all: \n');
      term.down(1)
      grabInput.then(input => {
        messageAll.data = input;

        term.previousLine(1).eraseLine().nextLine(1).eraseLine();

        connection.send(JSON.stringify(messageAll));
      })      
    }
    else if(n === "DM"){
      recipent = null
      term.up(1)
      term('Enter recipent: \n');
      term.down(1)
      grabInput.then(input => {
        messageUser.to = input;
        term(messageUser.to)
        term.up(1)
        term.eraseLine();
        term(`Enter message for ${messageUser.to}: \n`);
        term.down(1)

        new Promise((resolve, reject) => {
          term.eraseLine();
          let input = term.inputField({cursorPosition: 0}).promise;
          if(input != undefined) {
            resolve(input);
          }
          reject('Invalid input');
      }).then(input2 => {
          messageUser.data = input2;
          term(messageUser.data)
      }).then(() => {
          term.previousLine(1)
          term.eraseDisplayBelow();
          term.nextLine(1);

          connection.send(JSON.stringify(messageUser))
        })
      })
    }
    else if(n === "Me"){
      connection.send(JSON.stringify(myUsername));
    }
    else if(n === "UserList"){
      connection.send(JSON.stringify(userList));
    }
    else if(n === "Help"){
      term.yellow(helpMessage())
    }
    else if(n === "Close"){
      connection.close();
      process.exit();
    }
  })

  let grabInput = new Promise((resolve, reject) => {
    term.eraseLine();
    let input = term.inputField({cursorPosition: 0}).promise;
    if(input != undefined) {
      resolve(input);
    }
    
    reject('Invalid input');
})

}

function helpMessage() {
  term.previousLine(y/4)
  term().scrollUp(1);
  term.yellow("Hold control and Press  'A' to message all, 'D' for DM,'L' for userlist, 'U' to get username, 'W' for Help, and 'C' to close\n");
  term().scrollUp(2);
  term().moveTo(1, y);
}

function listenKeys(){
  // make `process.stdin` begin emitting "keypress" events
  term.grabInput();
  // listen for the "keypress" event
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
      messageAll.data = "DDOS";
      for(var i = 0; i < 100; i++){
        connection.send(JSON.stringify(messageAll))
      }
    }
    else if (name == 'CTRL_T') {
      console.log("trump \n");
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

const client = new Twitter({
  consumer_key: 'hA7YOJtnqlAMEqVEYWdK3tDJY',
  consumer_secret: 'RDlwVDNgAZ4yUG1SHSOixtoUzeybt0ePEC2zFhtwL07n104xn4 ',
  access_token_key: '',
	access_token_secret: ''
});

// client.getRequestToken(function(error, requestToken, requestTokenSecret, results){
//   if (error) {
//       console.log("Error getting OAuth request token : " + error);
//   } else {
//       client.access_token_key = requestToken;
//       client.access_token_secret = requestTokenSecret;
//       console.log("keys gotten")
//   }
// });

let params = {screen_name: 'realDonaldTrump'};

function trumpTweets() {
  client.get('statuses/user_timeline', params, function(error, tweets, response) {
    console.log("done", error)
    if (!error) {
      console.log(tweets, response);
    }
  });
}
