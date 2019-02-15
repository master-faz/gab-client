const WebSocket = require('ws');
const term = require('terminal-kit').terminal;
const prompt = require('prompt');

////////////// Global varaibles //////////////////////////////

const menuOptions = [
	'1. Message All' ,
	'2. Direct Message' ,
  '3. Check Client Username',
  '4. Get List All Users',
  '5. Exit Client'
];
let username = '';
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

///////////// FUNCTIONS ////////////////////////////////////////
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
      connection = new WebSocket(`ws://localhost:4930?username=${name}`);
      resolve(connection);
      })
    )
    .catch(err => {console.error(err)})
})

let connectionTasks = function() {
  let postHeight = y/2;
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
        
        term.previousLine(height/2)
        term().scrollUp(1);
        term.green('\n' + user + ': ')(message + '\n');
        term().moveTo(1, y);
      }
      catch(e){
        console.log('Invalid JSON: ', message.data);
      }
    }
    connection.onopen = function(event) {
      term().previousLine(4);
      term.yellow("\nPress 'A' to message all, 'D' for DM, 'L' for userlist, \n'M' to get username, and 'C' to close\n")
      term().nextLine(4);
      
      listenKeys();
    }
    })
  .catch(err => console.error(err))
}

connectionTasks();

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


function listenKeys(){
  // make `process.stdin` begin emitting "keypress" events
  term.grabInput();
  // listen for the "keypress" event
  term.on('key', function(name, matches, data) {
    if (name == 'A') {
      term.grabInput('false');
      setMessage('All')
    }
    else if (name == 'D') {
      term.grabInput('false');
      setMessage('DM')
    }
    else if (name == 'L') {
      term.grabInput('false');
      setMessage('UserList');
    }
    else if (name == 'M') {
      term.grabInput('false');
      setMessage('Me')
    }
    else if (name == 'C') {
      term.grabInput('false');
      setMessage('Close')
    }
    if (name == 'CTRL_C') {
      process.exit()    
    }
  });
  
  process.stdin.setRawMode(true);
  process.stdin.resume();
}