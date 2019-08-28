/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require('./Room');

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** make chat: store connection-device, rooom */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** send msgs to this client using underlying connection-send-function */

  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** handle joining: add to room members, announce join */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: 'note',
      text: `${this.name} joined "${this.room.name}".`
    });
  }

  /** handle a chat: broadcast to room. */

  handleChat(text) {
    this.room.broadcast({
      name: this.name,
      type: 'chat',
      text: text
    });
  }

  handleJoke(text) {
    this.send(JSON.stringify({
      name: this.name,
      type: 'chat',
      text: text
    }));
  }
  
  showMembers() {
    let memberArr = Array.from(this.room.members);
    let nameArr = memberArr.map(chatUser => chatUser.name);
    let text = "Members in this chat room: " + nameArr.join(', ');

    this.send(JSON.stringify({
      name: this.name,
      type: 'chat',
      text: text
    }));
  }

  sendPM(text) {
    let words = text.split(' ');
    let userToSend = words[1];
    let msg = words.slice(2).join(' ');
    let user = this.room.getMember(userToSend);

    console.log(user);

    user.send(JSON.stringify({
      name: userToSend,
      text: msg,
      type: "chat"
    }));
  }

  changeUsername(text) {
    let textArr = text.split(' ');
    let newUsername = textArr[1];
    let oldName = this.name;

    this.name = newUsername;
    this.room.broadcast({
      name: this.name,
      type: 'chat',
      text: `${oldName} is now ${this.name}.`
    });
  }

  /** Handle messages from client:
   *
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   */

  handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);

    if (msg.type === 'join') this.handleJoin(msg.name);
    else if (msg.type === 'chat') {
      if (msg.text === "/joke") {
        this.handleJoke(msg.text);
      } else if (msg.text === "/members") {
        this.showMembers();
      } else if (msg.text.startsWith("/priv")) {
        this.sendPM(msg.text);
      }  else if (msg.text.startsWith("/name")) {
        this.changeUsername(msg.text);
      } else {
        this.handleChat(msg.text);
      }
    }
    else throw new Error(`bad message: ${msg.type}`);
  }

  /** Connection was closed: leave room, announce exit to others */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: 'note',
      text: `${this.name} left ${this.room.name}.`
    });
  }
}

module.exports = ChatUser;
