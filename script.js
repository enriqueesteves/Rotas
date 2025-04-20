const firebaseConfig = {
  apiKey: "AIzaSyBaUW_ih2lxM9DRftochEBQUczXSPDx7vg",
  authDomain: "banco-40005.firebaseapp.com",
  databaseURL: "https://banco-40005-default-rtdb.firebaseio.com",
  projectId: "banco-40005",
  storageBucket: "banco-40005.firebasestorage.app",
  messagingSenderId: "979660568413",
  appId: "1:979660568413:web:24e2510d5f840d45121ab4",
  measurementId: "G-TDHZS843JH"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let map;
let clienteMarker = null;
let motoristaMarker = null;
let watchClienteId = null;
let watchMotoristaId = null;
let tipoServico = null;

function initMap() {
  map = L.map('map').setView([-22.9, -43.2], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

function selecionarServico(tipo) {
  tipoServico = tipo;
  document.getElementById("painelTitulo").innerText = `Painel do Cliente - ${tipo === 'viagem' ? 'Viagem' : 'Entrega'}`;
  document.getElementById("opcoesServico").style.display = 'none';
  document.getElementById("map").style.display = 'block';
  initMap();
  iniciarLocalizacaoCliente();
}

function iniciarLocalizacaoCliente() {
  if (navigator.geolocation) {
    watchClienteId = navigator.geolocation.watchPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      db.ref("cliente/localizacao").set({ lat, lng });
      db.ref("cliente/servico").set(tipoServico); // Salva o tipo de serviço

      if (!clienteMarker) {
        clienteMarker = L.marker([lat, lng], { title: "Você (Cliente)", icon: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png', iconSize: [30, 30] }) }).addTo(map);
        map.setView([lat, lng], 15);
      } else {
        clienteMarker.setLatLng([lat, lng]);
      }
    }, (error) => {
      alert(`Erro na geolocalização: ${error.message}`);
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });

    db.ref("motorista/localizacao").on("value", (snap) => {
      const data = snap.val();
      if (data) {
        if (!motoristaMarker) {
          motoristaMarker = L.marker([data.lat, data.lng], { title: "Moto Táxi", icon: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', iconSize: [30, 30] }) }).addTo(map);
        } else {
          motoristaMarker.setLatLng([data.lat, data.lng]);
        }
      }
    });
  } else {
    alert("Geolocalização não suportada pelo seu navegador.");
  }
}

function pararLocalizacaoCliente() {
  if (watchClienteId) {
    navigator.geolocation.clearWatch(watchClienteId);
    watchClienteId = null;
    db.ref("cliente/localizacao").remove();
    db.ref("cliente/servico").remove();
    if (clienteMarker) {
      map.removeLayer(clienteMarker);
      clienteMarker = null;
    }
  }
  document.getElementById("painelTitulo").innerText = "Selecione uma função";
  document.getElementById("opcoesServico").style.display = 'flex';
  document.getElementById("map").style.display = 'none';
  if (motoristaMarker) {
    map.removeLayer(motoristaMarker);
    motoristaMarker = null;
  }
}

function entrarComoCliente() {
  document.getElementById("topBar").style.display = 'none';
  document.getElementById("opcoesServico").style.display = 'flex';
  document.getElementById("map").style.display = 'none';
  // Inicialização do chat poderia ser aqui também, ao entrar como cliente
}

function iniciarLocalizacaoMotorista() {
  if (navigator.geolocation) {
    watchMotoristaId = navigator.geolocation.watchPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      db.ref("motorista/localizacao").set({ lat, lng });

      if (!motoristaMarker) {
        motoristaMarker = L.marker([lat, lng], { title: "Você (Motorista)", icon: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', iconSize: [30, 30] }) }).addTo(map);
        map.setView([lat, lng], 15);
      } else {
        motoristaMarker.setLatLng([lat, lng]);
      }
    }, (error) => {
      alert(`Erro na geolocalização: ${error.message}`);
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });

    db.ref("cliente/localizacao").on("value", (snap) => {
      const data = snap.val();
      if (data) {
        if (!clienteMarker) {
          clienteMarker = L.marker([data.lat, data.lng], { title: "Cliente", icon: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png', iconSize: [30, 30] }) }).addTo(map);
        } else {
          clienteMarker.setLatLng([data.lat, data.lng]);
        }
      }
    });
  } else {
    alert("Geolocalização não suportada pelo seu navegador.");
  }
}

function pararLocalizacaoMotorista() {
  if (watchMotoristaId) {
    navigator.geolocation.clearWatch(watchMotoristaId);
    watchMotoristaId = null;
    db.ref("motorista/localizacao").remove();
    if (motoristaMarker) {
      map.removeLayer(motoristaMarker);
      motoristaMarker = null;
    }
  }
  document.getElementById("painelTitulo").innerText = "Painel do Motorista";
  if (clienteMarker) {
    map.removeLayer(clienteMarker);
    clienteMarker = null;
  }
}

function entrarComoMotorista() {
  const senha = prompt("Digite a senha do motorista:");
  if (senha !== "1234") return alert("Senha incorreta.");

  document.getElementById("topBar").style.display = 'none';
  document.getElementById("painelTitulo").innerText = "Painel do Motorista";
  document.getElementById("map").style.display = 'block';
  initMap();
  iniciarLocalizacaoMotorista();
  // Inicialização do chat poderia ser aqui também
}

// --- Funcionalidade de Chat (Lado do Cliente) ---
const chatMessagesCliente = document.createElement('div');
chatMessagesCliente.classList.add('chat-messages');
const chatInputCliente = document.createElement('input');
chatInputCliente.type = 'text';
const chatButtonCliente = document.createElement('button');
chatButtonCliente.innerText = 'Enviar';
const chatContainerCliente = document.createElement('div');
chatContainerCliente.classList.add('chat-container');
chatContainerCliente.style.display = 'none'; // Inicialmente escondido

const chatRefCliente = db.ref('chat'); // Referência para o nó de chat

chatButtonCliente.addEventListener('click', () => {
  const mensagem = chatInputCliente.value.trim();
  if (mensagem) {
    chatRefCliente.push({
      remetente: 'cliente',
      texto: mensagem,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    chatInputCliente.value = '';
  }
});

chatRefCliente.on('child_added', (snapshot) => {
  const mensagem = snapshot.val();
  const mensagemElement = document.createElement('p');
  mensagemElement.innerText = `${mensagem.remetente}: ${mensagem.texto}`;
  chatMessagesCliente.appendChild(mensagemElement);
  chatMessagesCliente.scrollTop = chatMessagesCliente.scrollHeight; // Manter a rolagem no fundo
});

function mostrarChatCliente() {
  document.body.appendChild(chatContainerCliente);
  chatContainerCliente.appendChild(chatMessagesCliente);
  const inputContainer = document.createElement('div');
  inputContainer.classList.add('chat-input');
  inputContainer.appendChild(chatInputCliente);
  inputContainer.appendChild(chatButtonCliente);
  chatContainerCliente.appendChild(inputContainer);
  chatContainerCliente.style.display = 'flex';
  document.getElementById("map").style.display = 'none';
  document.getElementById("opcoesServico").style.display = 'none';
  document.getElementById("painelTitulo").innerText = "Chat com o Motorista";
}

function voltarParaMapaCliente() {
  document.body.removeChild(chatContainerCliente);
  document.getElementById("map").style.display = 'block';
  document.getElementById("opcoesServico").style.display = 'none';
  document.getElementById("painelTitulo").innerText = `Painel do Cliente - ${tipoServico === 'viagem' ? 'Viagem' : 'Entrega'}`;
}

// Adicionando os elementos de seleção de serviço ao HTML
const opcoesServicoDiv = document.createElement('div');
opcoesServicoDiv.id = 'opcoesServico';
opcoesServicoDiv.className = 'cliente-options';
opcoesServicoDiv.style.display = 'none'; // Inicialmente escondido

const botaoViagem = document.createElement('button');
botaoViagem.innerText = 'Solicitar Viagem';
botaoViagem.onclick = () => selecionarServico('viagem');

const botaoEntrega = document.createElement('button');
botaoEntrega.innerText = 'Solicitar Entrega';
botaoEntrega.onclick = () => selecionarServico('entrega');

const botaoChat = document.createElement('button');
botaoChat.innerText = 'Abrir Chat';
botaoChat.onclick = mostrarChatCliente;

const botaoVoltarMapa = document.createElement('button');
botaoVoltarMapa.innerText = 'Voltar para o Mapa';
botaoVoltarMapa.onclick = voltarParaMapaCliente;
botaoVoltarMapa.style.display = 'block'; // Sempre visível no painel do cliente

opcoesServicoDiv.appendChild(botaoViagem);
opcoesServicoDiv.appendChild(botaoEntrega);
opcoesServicoDiv.appendChild(botaoChat);

document.body.insertBefore(opcoesServicoDiv, document.getElementById('map'));
document.body.appendChild(botaoVoltarMapa);

// Modificando a função entrarComoCliente para mostrar as opções de serviço
function entrarComoCliente() {
  document.getElementById("topBar").style.display = 'none';
  document.getElementById("opcoesServico").style.display = 'flex';
    document.getElementById("map").style.display = 'none';
  document.getElementById("painelTitulo").innerText = "Selecione o tipo de serviço";
}

// Inicialização do mapa (ocorre apenas quando um dos botões de função é clicado)
// initMap(); // Removi a inicialização inicial para que o mapa só carregue quando necessário
            
