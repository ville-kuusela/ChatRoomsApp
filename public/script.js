const socket = io('http://localhost:3000');
const messageForm = document.getElementById('send-form');
const messageInput = document.getElementById('msg-input');

// Aktivoituu kun messageForm tulee oleviin, eli käyttäjä saapuu huoneeseen
if (messageForm !== null) {
  let nicknameIsValid = false;
  while (!nicknameIsValid) {
    // Pyydetään käyttäjältä nimimerkkiä.
    // While loopin ansiosta sitä kysytään niin kauan että se on validi.
    const nickname = prompt('Valitse käyttäjänimi (1-15 merkkiä)');
    if (nickname !== null && nickname.length >= 1 && nickname.length <= 15) {
      // Napataan huoneen ID url-osoitteesta.
      const roomId = window.location.href.split('/').pop();
      socket.emit('new-user', roomId, nickname); // Lähetetään tieto liittymisestä

      // Lähetetään ilmoitus liittymisestä kaikille huoneessa oleville.
      socket.emit('send-message-auto', roomId, ' liittyi huoneeseen');

      // Lisätään eventListener, joka hoitaa viestien lähettämisen.
      messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = messageInput.value;
        messageInput.value = '';
        if (msg !== '' && msg !== undefined) {
          socket.emit('send-message', roomId, msg);
        }
      });

      // Vaihdetaan, jotta päästään pois loopista.
      nicknameIsValid = true;
    }

    // Jos käyttäjä painaa promptissa Peruuta-nappia, nimimerkki jää nulliksi.
    // Näin ei saa käydä, joten käyttäjä on heitettävä takaisin etusivulle.
    if (nickname === null) {
      window.location.href = '/';
    }
  }
}

socket.on('room-create-success', (room) => {
  // Siirretään käyttäjä luotuun huoneeseen
  window.location.href = '/' + room;
});

socket.on('add-message', (data) => {
  document.getElementById('chat').innerHTML =
    '<br>' +
    '<span class="bold">' +
    data.name +
    ': </span>' +
    data.message +
    document.getElementById('chat').innerHTML;
});

socket.on('add-message-auto', (data) => {
  document.getElementById('chat').innerHTML =
    '<br>' +
    '<span class="bold colored"> Käyttäjä ' +
    data.name +
    data.message +
    '</span>' +
    document.getElementById('chat').innerHTML;
});
