// Configuração Firebase
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

let map, userMarker, routingControl;
let tipoUsuario = null;
let usuarioId = null;
let destinoSelecionado = null;
let corridaAtiva = null;
let solicitacoesAtivas = {}; // Para rastrear os marcadores de solicitação no mapa

// Inicializar o mapa com um estilo mais moderno (OpenStreetMap CartoDB Voyager)
map = L.map('map').setView([-15.8, -47.9], 13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20,
  detectRetina: true
}).addTo(map);

// Ocultar o formulário de cliente inicialmente
document.getElementById('clienteForm').style.display = 'none';

// Atualiza localização em tempo real
function iniciarLocalizacao() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(pos => {
      const { latitude, longitude } = pos.coords;
      const latLng = [latitude, longitude];
      if (!userMarker) {
        userMarker = L.marker(latLng, { draggable: false }).addTo(map);
        map.setView(latLng, 15);
      } else {
        userMarker.setLatLng(latLng);
      }

      firebase.database().ref(`usuarios/${usuarioId}`).update({
        lat: latitude,
        lng: longitude,
        tipo: tipoUsuario
      });

      if (tipoUsuario === 'mototaxi') {
        escutarSolicitacoes();
      }
    }, (error) => {
      console.error("Erro ao obter a localização:", error);
      alert("Não foi possível obter sua localização. Verifique as permissões do seu navegador.");
    });
  } else {
    alert("Geolocalização não suportada pelo seu navegador!");
  }
}

// Entrar como cliente
function entrarComoCliente() {
  tipoUsuario = 'cliente';
  usuarioId = 'cliente_' + Date.now();
  document.getElementById('loginPanel').style.display = 'none';
  document.getElementById('clienteForm').style.display = 'block';
  iniciarLocalizacao();
}

// Entrar como mototáxi
function entrarComoMotoTaxi() {
  const senha = prompt("Digite a senha do mototáxi:");
  if (senha === '1234') {
    tipoUsuario = 'mototaxi';
    usuarioId = 'mototaxi_' + Date.now();
    document.getElementById('loginPanel').style.display = 'none';
    iniciarLocalizacao();
  } else {
    alert("Senha incorreta!");
  }
}

// Enviar solicitação
function enviarSolicitacao() {
  const tipo = document.getElementById("tipoCorrida").value;
  const valor = document.getElementById("valor").value;

  if (!userMarker) return alert("Localização não disponível");

  const pos = userMarker.getLatLng();
  const id = Date.now();
  db.ref(`corridas/${id}`).set({
    id,
    clienteId: usuarioId,
    tipo,
    valor,
    lat: pos.lat,
    lng: pos.lng,
    status: 'pendente'
  });

  document.getElementById("clienteForm").style.display = 'none';
  document.getElementById("infoCorrida").classList.remove("hidden");
  document.getElementById("infoCorrida").innerHTML = `
    Aguardando mototáxi... <br>Tipo: ${tipo} <br>Valor: R$ ${valor} <br>
    <button onclick="cancelarCorrida('${id}')">Cancelar</button>
  `;

  corridaAtiva = id;
  // O bug de não remover o marcador de solicitação ao cancelar será corrigido na função cancelarCorrida
}

// Cancelar corrida
function cancelarCorrida(id) {
  db.ref(`corridas/${id}`).remove()
    .then(() => {
      document.getElementById("infoCorrida").classList.add("hidden");
      document.getElementById("chatBox").classList.add("hidden");
      corridaAtiva = null;
      // Remove o marcador de solicitação do mapa, se existir
      for (const key in solicitacoesAtivas) {
        if (solicitacoesAtivas[key].corridaId === id) {
          map.removeLayer(solicitacoesAtivas[key].marker);
          delete solicitacoesAtivas[key];
          break;
        }
      }
    })
    .catch((error) => {
      console.error("Erro ao cancelar a corrida:", error);
      alert("Houve um erro ao cancelar a corrida.");
    });
}

// Mototaxi escuta novas corridas
function escutarSolicitacoes() {
  db.ref('corridas').on('child_added', snap => {
    const corrida = snap.val();
    if (corrida && corrida.status === 'pendente' && !solicitacoesAtivas[corrida.id]) {
      const marker = L.marker([corrida.lat, corrida.lng], {
        icon: L.divIcon({ className: 'solicitacao-marker', html: corrida.tipo === 'entrega' ? '📦' : '🛵' })
      }).addTo(map);

      solicitacoesAtivas[corrida.id] = { marker: marker, corridaId: corrida.id, clienteId: corrida.clienteId };

      marker.on('click', () => {
        const popupContent = `
          Tipo: ${corrida.tipo}<br>
          Valor: R$${corrida.valor}<br>
          <button onclick="iniciarChatComCliente('${corrida.clienteId}', '${corrida.id}')">Iniciar Chat</button>
        `;
        marker.bindPopup(popupContent).openPopup();
      });
    }
  });

  // Escuta por alterações no status das corridas (para remover marcadores de corridas aceitas por outros)
  db.ref('corridas').on('child_changed', snap => {
    const corrida = snap.val();
    if (corrida && corrida.status === 'aceita' && solicitacoesAtivas[corrida.id] && corrida.mototaxiId !== usuarioId) {
      // Remove o marcador da solicitação que foi aceita por outro mototáxi
      if (solicitacoesAtivas[corrida.id] && solicitacoesAtivas[corrida.id].marker) {
        map.removeLayer(solicitacoesAtivas[corrida.



                        id].marker);
}
delete solicitacoesAtivas[corrida.id];
} else if (corrida && corrida.status === 'cancelada' && solicitacoesAtivas[corrida.id]) {
// Remove o marcador da solicitação que foi cancelada
if (solicitacoesAtivas[corrida.id] && solicitacoesAtivas[corrida.id].marker) {
map.removeLayer(solicitacoesAtivas[corrida.id].marker);
}
delete solicitacoesAtivas[corrida.id];
} else if (corrida && corrida.status === 'aceita' && corrida.mototaxiId === usuarioId && solicitacoesAtivas[corrida.id]) {
// Remove o marcador da solicitação aceita pelo próprio mototaxi
if (solicitacoesAtivas[corrida.id] && solicitacoesAtivas[corrida.id].marker) {
map.removeLayer(solicitacoesAtivas[corrida.id].marker);
}
delete solicitacoesAtivas[corrida.id];
corridaAtiva = corrida.id;
iniciarRota([corrida.lat, corrida.lng]);
iniciarChat(corrida.clienteId, corrida.id);
document.getElementById("chatBox").classList.remove("hidden");
}
});
// Escuta por corridas removidas (canceladas)
db.ref('corridas').on('child_removed', snap => {
const corridaIdRemovida = snap.key;
if (solicitacoesAtivas[corridaIdRemovida] && solicitacoesAtivas[corridaIdRemovida].marker) {
map.removeLayer(solicitacoesAtivas[corridaIdRemovida].marker);
delete solicitacoesAtivas[corridaIdRemovida];
}
if (corridaAtiva === corridaIdRemovida) {
corridaAtiva = null;
if (routingControl) {
map.removeControl(routingControl);
routingControl = null;
}
document.getElementById("chatBox").classList.add("hidden");
if (tipoUsuario === 'cliente') {
document.getElementById("infoCorrida").classList.add("hidden");
}
}
});
}
// Função para iniciar o chat com o cliente ao clicar no marcador
function iniciarChatComCliente(clienteId, corridaId) {
iniciarChat(clienteId, corridaId);
document.getElementById("chatBox").classList.remove("hidden");
// Opcional: Aqui você pode adicionar lógica para marcar a corrida como "em contato" ou algo similar
// db.ref(corridas/${corridaId}).update({ status: 'em_contato' });
}
// Rota entre motorista e cliente
function iniciarRota(destino) {
if (routingControl) map.removeControl(routingControl);
routingControl = L.Routing.control({
waypoints: [
userMarker.getLatLng(),
L.latLng(destino[0], destino[1])
],
routeWhileDragging: false,
language: 'pt-BR', // Define o idioma para português
showAlternatives: false, // Oculta rotas alternativas
fitSelectedRoutes: true // Ajusta o mapa para exibir a rota
}).addTo(map);
}
// Chat
function iniciarChat(destinatarioId, corridaId) {
const chatRef = db.ref(chats/${corridaId});
const chatMensagensDiv = document.getElementById("chatMensagens");
chatMensagensDiv.innerHTML = ''; // Limpa mensagens antigas
chatRef.on('child_added', snap => {
const msg = snap.val();
const el = document.createElement("div");
el.textContent = ${msg.user === usuarioId ? 'Você' : destinatarioId.startsWith('cliente_') ? 'Cliente' : 'Moto Táxi'}: ${msg.texto};
chatMensagensDiv.appendChild(el);
chatMensagensDiv.scrollTop = chatMensagensDiv.scrollHeight;
});
document.getElementById("chatBox").classList.remove("hidden");
window.enviarMensagem = () => {
const input = document.getElementById("mensagem");
const texto = input.value.trim();
if (texto === "") return;
chatRef.push({
user: usuarioId,
texto
});
input.value = "";
};
}
