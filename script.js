// script.js

// Configuração do Firebase const firebaseConfig = { apiKey: "AIzaSyBaUW_ih2lxM9DRftochEBQUczXSPDx7vg", authDomain: "banco-40005.firebaseapp.com", databaseURL: "https://banco-40005-default-rtdb.firebaseio.com", projectId: "banco-40005", storageBucket: "banco-40005.appspot.com", messagingSenderId: "979660568413", appId: "1:979660568413:web:24e2510d5f840d45121ab4" }; firebase.initializeApp(firebaseConfig); const db = firebase.database();

// API do Geoapify const GEOAPIFY_API_KEY = "7de2193e48404eb7aa0af1222a8d7bc4";

let map = L.map('map').setView([-23.55052, -46.633308], 13); L.tileLayer(https://maps.geoapify.com/v1/tile/dark-matter/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}, { attribution: 'Powered by Geoapify', maxZoom: 20 }).addTo(map);

let markers = {}; let userType = null; let userId = null;

// Obter localização em tempo real function startTracking() { if (navigator.geolocation) { navigator.geolocation.watchPosition(position => { const { latitude, longitude } = position.coords; if (!userId) userId = db.ref(userType).push().key; db.ref(${userType}/${userId}).set({ latitude, longitude }); }); } else { alert("Geolocalização não suportada"); } }

// Atualizar marcadores no mapa function updateMap() { db.ref().on('value', snapshot => { const data = snapshot.val(); Object.keys(markers).forEach(key => map.removeLayer(markers[key])); markers = {};

for (let type in data) {
  for (let id in data[type]) {
    const { latitude, longitude, tipo, valor } = data[type][id];
    const color = tipo === 'Entrega' ? 'blue' : tipo === 'Viagem' ? 'green' : 'red';
    const marker = L.circleMarker([latitude, longitude], {
      radius: 10,
      color
    }).addTo(map);

    if (tipo && valor) {
      marker.bindPopup(`<b>${tipo}</b><br>Valor: R$${valor}`);
    }
    marker.on('click', () => openChat(id));
    markers[id] = marker;
  }
}

}); }

// Cliente envia solicitação function enviarSolicitacao() { const tipo = document.getElementById('tipoServico').value; const valor = document.getElementById('valorDesejado').value; if (!userId) userId = db.ref('clientes').push().key;

navigator.geolocation.getCurrentPosition(position => { const { latitude, longitude } = position.coords; db.ref(clientes/${userId}).set({ tipo, valor, latitude, longitude }); }); }

// Abrir chat function openChat(clienteId) { const chatContainer = document.getElementById('chatContainer'); chatContainer.style.display = 'block'; document.getElementById('chat').innerHTML = '';

const chatRef = db.ref(chats/${clienteId}); chatRef.on('value', snapshot => { const mensagens = snapshot.val(); document.getElementById('chat').innerHTML = ''; for (let msg in mensagens) { const { texto, remetente } = mensagens[msg]; const div = document.createElement('div'); div.textContent = ${remetente}: ${texto}; document.getElementById('chat').appendChild(div); } });

document.getElementById('enviarMensagem').onclick = () => { const texto = document.getElementById('mensagem').value; db.ref(chats/${clienteId}).push({ texto, remetente: userType }); document.getElementById('mensagem').value = ''; }; }

// Botões de entrada function iniciar(tipo) { userType = tipo; startTracking(); updateMap(); if (tipo === 'clientes') { document.getElementById('formularioCliente').style.display = 'block'; } document.getElementById('entrada').style.display = 'none'; }

  
