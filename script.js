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
let clienteId = null; // Simulação do ID do cliente após autenticação
let motoristaId = null; // Simulação do ID do motorista após autenticação
let currentChatId = null;
let chatMessagesDiv;
let chatInput;
let chatButton;
let tipoServico = null;
let watchClienteId = null;
let watchMotoristaId = null;

function initMap() {
  map = L.map('map').setView([-22.9, -43.2], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

function simularLoginCliente() {
  clienteId = 'cliente_' + Math.random().toString(36).substring(7); // Simulação de ID único
  console.log("Cliente logado com ID:", clienteId);
  document.getElementById("topBar").style.display = 'none';
  document.getElementById("opcoesServico").style.display = 'flex';
  document.getElementById("map").style.display = 'none';
  document.getElementById("painelTitulo").innerText = "Selecione o tipo de serviço";
}

function simularLoginMotorista() {
  const senha = prompt("Digite a senha do motorista:");
  if (senha !== "1234") return alert("Senha incorreta.");
  motoristaId = 'motorista_' + Math.random().toString(36).substring(7); // Simulação de ID único
  console.log("Motorista logado com ID:", motoristaId);
  document.getElementById("topBar").style.display = 'none';
  document.getElementById("painelTitulo").innerText = "Painel do Motorista";
  document.getElementById("map").style.display = 'block';
  initMap();
  iniciarLocalizacaoMotorista();
  // Lógica para visualizar solicitações pendentes e aceitar
}

function selecionarServico(tipo) {
  tipoServico = tipo;
  document.getElementById("painelTitulo").innerText = `Painel do Cliente - ${tipo === 'viagem' ? 'Viagem' : 'Entrega'}`;
  document.getElementById("opcoesServico").style.display = 'none';
  document.getElementById("map").style.display = 'block';
  initMap();
  iniciarLocalizacaoCliente();
  // Lógica para enviar solicitação de serviço para o Firebase
}

function iniciarLocalizacaoCliente() {
  if (navigator.geolocation) {
    watchClienteId = navigator.geolocation.watchPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      db.ref("cliente/localizacao").set({ lat, lng, clienteId, tipoServico }); // Inclui ID e tipo de serviço
      // db.ref("cliente/servico").set(tipoServico); // Não precisa mais aqui

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

    // Motorista escuta por clientes (simplificado - precisaria de lógica de proximidade/aceitação)
    db.ref("cliente/localizacao").on("child_added", (snap) => {
      const data = snap.val();
      if (data && data.clienteId !== clienteId && data.tipoServico === tipoServico) {
        // Exibir cliente no mapa do motorista (com lógica de filtro)
        if (motoristaId && !map.hasLayer(clienteMarker)) {
          clienteMarker = L.marker([data.lat, data.lng], { title: `Cliente (${data.clienteId})`, icon: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png', iconSize: [30, 30] }) }).addTo(map);
        } else if (motoristaId && map.hasLayer(clienteMarker) && clienteMarker._latlng.lat !== data.lat && clienteMarker._latlng.lng !== data.lng) {
          clienteMarker.setLatLng([data.lat, data.lng]);
        }
      }
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
    db.ref("cliente/localizacao").off(); // Remove todos os listeners
    db.ref("cliente/localizacao").child(clienteId).remove(); // Remove a própria localização
    // db.ref("cliente/servico").remove(); // Não precisa remover o serviço globalmente
    if (clienteMarker && map.hasLayer(clienteMarker)) {
      map.removeLayer(clienteMarker);
      clienteMarker = null;
    }
  }
  document.getElementById("painelTitulo").innerText = "Selecione uma função";
  document.getElementById("opcoesServico").style.display = 'flex';
  document.getElementById("map").style.display = 'none';
  if (motoristaMarker && map.hasLayer(motoristaMarker)) {
    map.removeLayer(motoristaMarker);
    motoristaMarker = null;
  }
}

function entrarComoCliente() {
  simularLoginCliente();
}

function iniciarLocalizacaoMotorista() {
  if (navigator.geolocation) {
    watchMotoristaId = navigator.geolocation.watchPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      db.ref("motorista/localizacao").set({ lat, lng, motoristaId }); // Inclui ID do motorista

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

    // Motorista escuta por clientes (já implementado em iniciarLocalizacaoCliente)

  } else {
    alert("Geolocalização não suportada pelo seu navegador.");
  }
}

function pararLocalizacaoMotorista() {
  if (watchMotoristaId) {
    navigator.geolocation.clearWatch(watchMotoristaId);
    watchMotoristaId = null;
    db.ref("motorista/localizacao").off(); // Remove todos os listeners
    db.ref("motorista/localizacao").child(motoristaId).remove(); // Remove a própria localização
    if (motoristaMarker && map.hasLayer(motoristaMarker)) {
      map.removeLayer(motoristaMarker);
      motoristaMarker = null;
    }
    if (clienteMarker && map.hasLayer(clienteMarker)) {
      map.removeLayer(clienteMarker);
      clienteMarker = null;
    }
  }
  document.getElementById("painelTitulo").innerText = "Painel do Motorista";
}

function entrarComoMotorista() {
  simularLoginMotorista();
}

function iniciarChat(otherUserId) {
  if (!clienteId && !motoristaId) {
    alert("Usuário não logado.");
    return;
  }
  const myId = clienteId || motoristaId;
  const sortedIds = [myId, otherUserId].sort();
  currentChatId = `chat_${sortedIds[0]}_${sortedIds[1]}`;
  console.log("Iniciando chat com ID:", currentChatId);
  mostrarInterfaceChat();
  escutarMensagensChat();
}

function enviarMensagem() {
  const myId = clienteId || motoristaId;
  if (currentChatId && myId && chatInput.value.trim()) {
    db.ref(`chats/${currentChatId}/mensagens`).push({
      remetente: myId,
      texto: chatInput.value.trim(),
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    chatInput.value = '';
  } else {
    alert("Não é possível enviar a mensagem.");
  }
}

function escutarMensagensChat() {
  if (currentChatId) {
    const chatMessagesRef = db.ref(`chats/${currentChatId}/mensagens`);
    chatMessagesRef.off('child_added'); // Remove listeners anteriores
    chatMessagesRef.on('child_added', (snapshot) => {
      const mensagem = snapshot.val();
      const mensagemElement = document.createElement('p');
      mensagemElement.innerText = `${mensagem.remetente}: ${mensagem.texto}`;
      chatMessagesDiv.appendChild(mensagemElement);
      chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    });
  }
}

function mostrarInterfaceChat() {
  if (!chatMessagesDiv) {
    chatMessagesDiv = document.createElement('div');
    chatMessagesDiv.classList.add('chat-messages');
    chatInput = document.createElement('input');
    chatInput.type = 'text
            chatButton = document.createElement('button');
    chatButton.innerText = 'Enviar';
    chatButton.onclick = enviarMensagem;
    const chatContainer = document.createElement('div');
    chatContainer.classList.add('chat-container');
    chatContainer.appendChild(chatMessagesDiv);
    const inputContainer = document.createElement('div');
    inputContainer.classList.add('chat-input');
    inputContainer.appendChild(chatInput);
    inputContainer.appendChild(chatButton);
    chatContainer.appendChild(inputContainer);
    document.body.appendChild(chatContainer);
  } else {
    chatMessagesDiv.innerHTML = ''; // Limpa mensagens antigas
    const chatContainer = chatMessagesDiv.parentNode;
    chatContainer.style.display = 'flex';
  }
  document.getElementById("map").style.display = 'none';
  document.getElementById("opcoesServico").style.display = 'none';
  document.getElementById("painelTitulo").innerText = "Chat";
}

function voltarParaMapa() {
  if (chatMessagesDiv && chatMessagesDiv.parentNode) {
    chatMessagesDiv.parentNode.style.display = 'none';
  }
  document.getElementById("map").style.display = 'block';
  if (clienteId) {
    document.getElementById("opcoesServico").style.display = 'flex';
    document.getElementById("painelTitulo").innerText = `Painel do Cliente - ${tipoServico === 'viagem' ? 'Viagem' : 'Entrega'}`;
  } else if (motoristaId) {
    document.getElementById("painelTitulo").innerText = "Painel do Motorista";
  }
  currentChatId = null;
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

const botaoChatComMotorista = document.createElement('button');
botaoChatComMotorista.innerText = 'Chat com Motorista (Teste)';
botaoChatComMotorista.onclick = () => {
  // Lógica real envolveria selecionar um motorista da lista
  const motoristaSimuladoId = 'motorista_abc123';
  iniciarChat(motoristaSimuladoId);
};
botaoChatComMotorista.style.display = 'none'; // Só aparece após selecionar o serviço

opcoesServicoDiv.appendChild(botaoViagem);
opcoesServicoDiv.appendChild(botaoEntrega);
opcoesServicoDiv.appendChild(botaoChatComMotorista);

const botaoVoltarMapaChat = document.createElement('button');
botaoVoltarMapaChat.innerText = 'Voltar para o Mapa';
botaoVoltarMapaChat.onclick = voltarParaMapa;
botaoVoltarMapaChat.style.display = 'none'; // Inicialmente escondido

document.body.insertBefore(opcoesServicoDiv, document.getElementById('map'));
document.body.appendChild(botaoVoltarMapaChat);

// Atualiza a visibilidade do botão de chat após a seleção do serviço
function selecionarServico(tipo) {
  tipoServico = tipo;
  document.getElementById("painelTitulo").innerText = `Painel do Cliente - ${tipo === 'viagem' ? 'Viagem' : 'Entrega'}`;
  document.getElementById("opcoesServico").style.display = 'none';
  document.getElementById("map").style.display = 'block';
  botaoChatComMotorista.style.display = 'block'; // Mostra o botão de chat
  botaoVoltarMapaChat.style.display = 'block'; // Mostra o botão de voltar
  initMap();
  iniciarLocalizacaoCliente();
}

function voltarParaMapa() {
  if (chatMessagesDiv && chatMessagesDiv.parentNode) {
    chatMessagesDiv.parentNode.style.display = 'none';
  }
  document.getElementById("map").style.display = 'block';
  if (clienteId) {
    document.getElementById("opcoesServico").style.display = 'flex';
    document.getElementById("painelTitulo").innerText = "Selecione o tipo de serviço";
    botaoChatComMotorista.style.display = 'none'; // Esconde o botão de chat ao voltar
    botaoVoltarMapaChat.style.display = 'none'; // Esconde o botão de voltar
  } else if (motoristaId) {
    document.getElementById("painelTitulo").innerText = "Painel do Motorista";
  }
  currentChatId = null;
      }
