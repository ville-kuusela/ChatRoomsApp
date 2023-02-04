const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

server.listen(3000);
console.log('Serveri käynnistyi portissa 3000');

// Objekti johon säilötään kaikkien huoneiden ID:t ja käyttäjät
const rooms = {};

// Etusivun renderöinti
app.get('/', (req, res) => {
  res.render('index');
});

//  Huoneeseen liittyminen url:n perusteella
app.get('/:room', (req, res) => {
  // Liitytään huoneeseen jos se löytyy, muuten etusivulle
  if (rooms[req.params.room] !== undefined) {
    return res.render('room', { roomName: req.params.room });
  } else {
    return res.redirect('/');
  }
});

io.on('connection', (socket) => {
  // Uuden huoneen luominen
  socket.on('create-room', () => {
    // Arvotaan uudelle huoneelle 6-numeroinen, uniikki koodi
    let newRoomID;
    do {
      newRoomID = Math.floor(100000 + Math.random() * 900000);
      if (rooms[newRoomID] == undefined) break;
    } while (true);

    // Lisätään uuden huoneen tiedot taulukkoon
    rooms[newRoomID] = {
      room: newRoomID,
      users: {},
    };
    // Lähetetään klientille tieto huoneen luomisen onnistumisesta.
    socket.emit('room-create-success', rooms[newRoomID].room);
  });

  // Uusi käyttäjä liittyy huoneeseen.
  socket.on('new-user', (roomData, name) => {
    if (rooms[roomData] !== undefined) {
      console.log('Uusi käyttäjä ' + name + ' liittyi huoneeseen ' + roomData);
      socket.join(roomData);

      // Lisätään huoneeseen id:n käyttäjänimi
      rooms[roomData].users[socket.id] = name;
    } else {
      console.log('Huonetta ' + roomData + ' ei löytynyt');
    }
  });

  socket.on('send-message', (room, message) => {
    // Lähetetään viesti eteenpäin kaikille tietyssä huoneessa oleville
    io.sockets.in(room).emit('add-message', {
      message: message,
      name: rooms[room].users[socket.id],
    });
  });

  // Käytetään lähettämään automaattisia viestejä huoneisiin
  // Esim. käyttäjän liittyminen
  socket.on('send-message-auto', (room, message) => {
    io.sockets.in(room).emit('add-message-auto', {
      message: message,
      name: rooms[room].users[socket.id],
    });
  });

  // Toteutetaan kun käyttäjä disconnectaa
  socket.on('disconnect', () => {
    // Poistetaan käyttäjän ID jokaisesta huoneesta, jossa hän on.
    Object.entries(rooms).forEach((room) => {
      if (
        room[1].users !== undefined &&
        room[1].users[socket.id] !== undefined
      ) {
        // Lähetetään huoneeseen viesti käyttäjän poistumisesta
        io.sockets.in(room[1].room).emit('add-message-auto', {
          message: ' poistui huoneesta',
          name: room[1].users[socket.id],
        });

        // Käyttäjän tietojen poistaminen huoneet-objektista
        delete room[1].users[socket.id];

        // Jos huone tyhjenee kokonaan, se poistetaan
        if (Object.keys(room[1].users).length === 0) {
          delete rooms[room[1].room];
        }
      }
    });
  });
});
