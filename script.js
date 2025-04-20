import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, off, serverTimestamp, remove } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Configuração do Firebase
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

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Variáveis globais
let mapCliente, mapMotorista;
let clienteId = null;
let motoristaId = null;
let currentChatId = null;
let tipoServico = null;
let watchId = null;
let clienteMarker = null;
let motoristaMarker = null;
let corridaAtiva = null;
let motoristaDisponivel = false;
let modalAcao = null;
let avaliacaoAtual = 0;
let listeners = {};

// Funções de inicialização
function initMap(elementId, center) {
  const map = L.map(elementId).setView(center || [-22.9, -43.2], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  return map;
}

// Funções de autenticação
async function autenticarMotorista(email, senha) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    return userCredential.user.uid;
  } catch (error) {
    console.error("Erro na autenticação:", error);
    throw error;
  }
}

// Funções de login
function entrarComoCliente() {
  clienteId = 'cliente_' + Math.random().toString(36).substring(2, 9);
  localStorage.setItem('clienteId', clienteId);
  
  document.getElementById('telaInicial').style.display = 'none';
  document.getElementById('telaCliente').style.display = 'block';
  document.getElementById('selecaoServico').style.display = 'block';
  document.getElementById('painelCliente').style.display = 'none';
  
  if (!mapCliente) {
    mapCliente = initMap('map');
  }
}

async function entrarComoMotorista() {
  const email = prompt("Digite o email do motorista:");
  const senha = prompt("Digite a senha do motorista:");
  
  try {
    motoristaId = await autenticarMotorista(email, senha);
    localStorage.setItem('motoristaId', motoristaId);
    
    document.getElementById('telaInicial').style.display = 'none';
    document.getElementById('telaMotorista').style.display = 'block';
    
    if (!mapMotorista) {
      mapMotorista = initMap('mapMotorista');
      iniciarLocalizacaoMotorista();
    }
    
    alternarDisponibilidade();
  } catch (error) {
    alert("Falha na autenticação: " + error.message);
  }
}

// Funções do cliente
function selecionarServico(tipo) {
  tipoServico = tipo;
  document.getElementById('selecaoServico').style.display = 'none';
  document.getElementById('painelCliente').style.display = 'block';
  
  iniciarLocalizacaoCliente();
  enviarSolicitacao();
}

function iniciarLocalizacaoCliente() {
  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        
        if (!clienteMarker) {
          clienteMarker = L.marker([lat, lng], {
            icon: L.icon({
              iconUrl: 'https://cdn-icons-png.flaticon.com/512/447/447031.png',
              iconSize: [32, 32]
            })
          }).addTo(mapCliente);
          clienteMarker.bindPopup("Você (Cliente)").openPopup();
        } else {
          clienteMarker.setLatLng([lat, lng]);
        }
        
        mapCliente.setView([lat, lng], 15);
        
        set(ref(db, `clientes/${clienteId}`), {
          lat,
          lng,
          tipoServico,
          timestamp: serverTimestamp()
        });
      },
      (err) => {
        console.error("Erro na geolocalização:", err);
        alert("Erro ao obter localização: " + err.message);
      },
      { enableHighAccuracy: true }
    );
  } else {
    alert("Geolocalização não suportada pelo navegador.");
  }
}

function enviarSolicitacao() {
  set(ref(db, `solicitacoes/${clienteId}`), {
    clienteId,
    tipoServico,
    status: "pendente",
    timestamp: serverTimestamp()
  });
  
  listenForMotoristas();
}

function listenForMotoristas() {
  const motoristasRef = ref(db, 'motoristas');
  
  listeners['motoristas'] = onValue(motoristasRef, (snapshot) => {
    const motoristas = snapshot.val();
    if (motoristas) {
      for (const id in motoristas) {
        if (motoristas[id].disponivel) {
          document.getElementById('infoMotorista').textContent = "Motorista disponível encontrado!";
          setTimeout(() => {
            simularAceitacaoMotorista(id);
          }, 3000);
          break;
        }
      }
    }
  });
}

function simularAceitacaoMotorista(motoristaId) {
  set(ref(db, `solicitacoes/${clienteId}`), {
    clienteId,
    tipoServico,
    status: "aceita",
    motoristaId,
    timestamp: serverTimestamp()
  });
  
  document.getElementById('infoMotorista').textContent = `Motorista: ${motoristaId}`;
  const tarifa = calcularTarifa(5, tipoServico);
  document.getElementById('infoTarifa').textContent = `Tarifa estimada: R$ ${tarifa}`;
  
  iniciarChat(motoristaId);
  
  if (mapCliente && clienteMarker) {
    const clientePos = clienteMarker.getLatLng();
    const motoristaLat = clientePos.lat + 0.01;
    const motoristaLng = clientePos.lng + 0.01;
    
    motoristaMarker = L.marker([motoristaLat, motoristaLng], {
      icon: L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png',
        iconSize: [32, 32]
      })
    }).addTo(mapCliente);
    
    simularMovimentoMotorista(clientePos);
  }
}

// Funções do motorista
function iniciarLocalizacaoMotorista() {
  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        
        if (!motoristaMarker) {
          motoristaMarker = L.marker([lat, lng], {
            icon: L.icon({
              iconUrl: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png',
              iconSize: [32, 32]
            })
          }).addTo(mapMotorista);
          motoristaMarker.bindPopup("Você (Motorista)").openPopup();
        } else {
          motoristaMarker.setLatLng([lat, lng]);
        }
        
        set(ref(db, `motoristas/${motoristaId}`), {
          lat,
          lng,
          disponivel: motoristaDisponivel,
          timestamp: serverTimestamp()
        });
      },
      (err) => {
        console.error("Erro na geolocalização:", err);
        alert("Erro ao obter localização: " + err.message);
      },
      { enableHighAccuracy: true }
    );
  } else {
    alert("Geolocalização não suportada pelo navegador.");
  }
}

function alternarDisponibilidade() {
  motoristaDisponivel = !motoristaDisponivel;
  
  const btn = document.getElementById('btnDisponibilidade');
  const status = document.getElementById('statusText');
  
  if (motoristaDisponivel) {
    btn.textContent = "Indisponível";
    btn.style.backgroundColor = "#e74c3c";
    status.textContent = "Status: Disponível (Aguardando corridas)";
    document.getElementById('painelCorrida').style.display = 'none';
    escutarSolicitacoes();
  } else {
    btn.textContent = "Disponível";
    btn.style.backgroundColor = "#2ecc71";
    status.textContent = "Status: Indisponível";
    if (listeners['solicitacoes']) {
      off(ref(db, 'solicitacoes'), listeners['solicitacoes']);
    }
  }
  
  set(ref(db, `motoristas/${motoristaId}/disponivel`), motoristaDisponivel);
}

function escutarSolicitacoes() {
  const solicitacoesRef = ref(db, 'solicitacoes');
  
  listeners['solicitacoes'] = onValue(solicitacoesRef, (snapshot) => {
    const solicitacoes = snapshot.val();
    if (solicitacoes) {
      for (const id in solicitacoes) {
        if (solicitacoes[id].status === "pendente" && motoristaDisponivel) {
          mostrarSolicitacao(solicitacoes[id]);
          break;
        }
      }
    }
  });
}

// Funções de chat
function iniciarChat(otherUserId) {
  const myId = clienteId || motoristaId;
  const sortedIds = [myId, otherUserId].sort();
  currentChatId = `chat_${sortedIds[0]}_${sortedIds[1]}`;
  
  document.getElementById('chatContainer').style.display = 'block';
  document.getElementById('chatMessages').innerHTML = '';
  
  const chatRef = ref(db, `chats/${currentChatId}/mensagens`);
  
  listeners[`chats/${currentChatId}/mensagens`] = onValue(chatRef, (snapshot) => {
    const mensagens = snapshot.val();
    if (mensagens) {
      document.getElementById('chatMessages').innerHTML = '';
      Object.values(mensagens).forEach(msg => {
        adicionarMensagemNoChat(msg);
      });
    }
  });
}

function adicionarMensagemNoChat(msg) {
  const msgElement = document.createElement('div');
  msgElement.className = msg.remetente === (clienteId || motoristaId) ? 'msg-enviada' : 'msg-recebida';
  msgElement.textContent = msg.texto;
  document.getElementById('chatMessages').appendChild(msgElement);
  document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
}

function enviarMensagem() {
  const input = document.getElementById('chatInput');
  const texto = input.value.trim();
  
  if (texto && currentChatId) {
    const myId = clienteId || motoristaId;
    
    push(ref(db, `chats/${currentChatId}/mensagens`), {
      remetente: myId,
      texto: texto,
      timestamp: serverTimestamp()
    });
    
    input.value = '';
  }
}

// Funções auxiliares
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calcularTarifa(distanciaKm, tipo) {
  const tarifas = {
    viagem: { base: 5, km: 2.5 },
    entrega: { base: 7, km: 3.5 }
  };
  const tarifa = tarifas[tipo] || tarifas.viagem;
  return (tarifa.base + (distanciaKm * tarifa.km)).toFixed(2);
}

function sair() {
  // Limpa todos os listeners
  Object.keys(listeners).forEach(path => {
    const pathParts = path.split('/');
    const mainRef = ref(db, pathParts[0]);
    off(mainRef, listeners[path]);
  });
  listeners = {};
  
  // Limpa geolocalização
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  
  // Limpa dados do Firebase
  if (clienteId) {
    remove(ref(db, `clientes/${clienteId}`));
    remove(ref(db, `solicitacoes/${clienteId}`));
    localStorage.removeItem('clienteId');
  }
  
  if (motoristaId) {
    remove(ref(db, `motoristas/${motoristaId}`));
    signOut(auth);
    localStorage.removeItem('motoristaId');
  }
  
  // Limpa UI
  document.getElementById('telaCliente').style.display = 'none';
  document.getElementById('telaMotorista').style.display = 'none';
  document.getElementById('telaInicial').style.display = 'block';
  document.getElementById('modalAvaliacao').style.display = 'none';
  document.getElementById('modalConfirmacao').style.display = 'none';
  document.getElementById('chatContainer').style.display = 'none';
  
  // Limpa mapas
  if (mapCliente) {
    mapCliente.remove();
    mapCliente = null;
  }
  if (mapMotorista) {
    mapMotorista.remove();
    mapMotorista = null;
  }
  
  clienteMarker = null;
  motoristaMarker = null;
  clienteId = null;
  motoristaId = null;
}

// Exporta funções para o escopo global
window.entrarComoCliente = entrarComoCliente;
window.entrarComoMotorista = entrarComoMotorista;
window.selecionarServico = selecionarServico;
window.sair = sair;
window.cancelarServico = cancelarServico;
window.alternarDisponibilidade = alternarDisponibilidade;
window.aceitarCorrida = aceitarCorrida;
window.finalizarCorrida = finalizarCorrida;
window.iniciarChatComMotorista = iniciarChatComMotorista;
window.fecharChat = fecharChat;
window.enviarMensagem = enviarMensagem;
window.confirmarAcao = confirmarAcao;
window.avaliar = avaliar;
window.enviarAvaliacao = enviarAvaliacao;

// Função para mostrar solicitação ao motorista
function mostrarSolicitacao(solicitacao) {
  document.getElementById('painelCorrida').style.display = 'block';
  document.getElementById('clienteNome').textContent = `Cliente: ${solicitacao.clienteId}`;
  document.getElementById('clienteServico').textContent = `Serviço: ${solicitacao.tipoServico === 'viagem' ? 'Viagem' : 'Entrega'}`;
  
  get(ref(db, `clientes/${solicitacao.clienteId}`)).then((clienteSnap) => {
    const cliente = clienteSnap.val();
    if (cliente && mapMotorista) {
      if (clienteMarker) {
        mapMotorista.removeLayer(clienteMarker);
      }
      
      clienteMarker = L.marker([cliente.lat, cliente.lng], {
        icon: L.icon({
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/447/447031.png',
          iconSize: [32, 32]
        })
      }).addTo(mapMotorista);
      
      const distancia = calcularDistancia(
        motoristaMarker.getLatLng().lat,
        motoristaMarker.getLatLng().lng,
        cliente.lat,
        cliente.lng
      );
      
      document.getElementById('clienteDistancia').textContent = `Distância: ${distancia.toFixed(2)} km`;
      
      const bounds = L.latLngBounds(
        [cliente.lat, cliente.lng],
        motoristaMarker.getLatLng()
      );
      mapMotorista.fitBounds(bounds);
    }
  });
}

// Função para aceitar corrida
function aceitarCorrida() {
  get(ref(db, 'solicitacoes')).then((snapshot) => {
    const solicitacoes = snapshot.val();
    for (const id in solicitacoes) {
      if (solicitacoes[id].status === "pendente") {
        set(ref(db, `solicitacoes/${id}`), {
          ...solicitacoes[id],
          status: "aceita",
          motoristaId,
          timestamp: serverTimestamp()
        });
        
        document.getElementById('btnAceitarCorrida').style.display = 'none';
        document.getElementById('btnFinalizarCorrida').style.display = 'block';
        document.getElementById('statusText').textContent = "Status: Em corrida";
        
        iniciarChat(id);
        simularMovimentoParaCliente(id);
        break;
      }
    }
  });
}

// Função para simular movimento do motorista para o cliente
function simularMovimentoParaCliente(clienteId) {
  const clienteRef = ref(db, `clientes/${clienteId}`);
  
  listeners[`clientes/${clienteId}`] = onValue(clienteRef, (snapshot) => {
    const cliente = snapshot.val();
    if (cliente && clienteMarker && motoristaMarker) {
      const destino = L.latLng(cliente.lat, cliente.lng);
      const origem = motoristaMarker.getLatLng();
      
      const novaPos = L.latLng(
        origem.lat + (destino.lat - origem.lat) * 0.1,
        origem.lng + (destino.lng - origem.lng) * 0.1
      );
      
      motoristaMarker.setLatLng(novaPos);
      
      // Atualiza posição no Firebase
      set(ref(db, `motoristas/${motoristaId}`), {
        lat: novaPos.lat,
        lng: novaPos.lng,
        disponivel: false,
        timestamp: serverTimestamp()
      });
      
      // Se chegou perto do cliente
      if (novaPos.distanceTo(destino) < 0.001) { // ~100 metros
        mostrarModal(
          "Cliente no Veículo", 
          "Você já pegou o cliente?",
          "confirmarClienteNoVeiculo"
        );
      }
    }
  });
}

// Função para confirmar cliente no veículo
function confirmarClienteNoVeiculo(confirmado) {
  if (confirmado) {
    mostrarModal(
      "Corrida em Andamento", 
      "Você chegou ao destino?",
      "finalizarCorrida"
    );
  }
}

// Função para finalizar corrida
function finalizarCorrida() {
  const tarifa = calcularTarifa(5, tipoServico); // 5km simulados
  mostrarModal(
    "Finalizar Corrida", 
    `Corrida finalizada. Valor: R$ ${tarifa}`,
    "confirmarFinalizacaoCorrida"
  );
}

// Função para confirmar finalização
function confirmarFinalizacaoCorrida(confirmado) {
  if (confirmado) {
    get(ref(db, 'solicitacoes')).then((snapshot) => {
      const solicitacoes = snapshot.val();
      for (const id in solicitacoes) {
        if (solicitacoes[id].motoristaId === motoristaId) {
          remove(ref(db, `solicitacoes/${id}`));
          break;
        }
      }
    });
    
    document.getElementById('btnFinalizarCorrida').style.display = 'none';
    document.getElementById('painelCorrida').style.display = 'none';
    if (clienteMarker) {
      mapMotorista.removeLayer(clienteMarker);
      clienteMarker = null;
    }
    
    alternarDisponibilidade();
  }
}

// Função para cancelar serviço
function cancelarServico() {
  mostrarModal(
    "Cancelar Serviço", 
    "Deseja realmente cancelar o serviço?",
    "confirmarCancelamento"
  );
}

// Função para confirmar cancelamento
function confirmarCancelamento(confirmado) {
  if (confirmado) {
    remove(ref(db, `solicitacoes/${clienteId}`));
    
    if (motoristaMarker) {
      mapCliente.removeLayer(motoristaMarker);
      motoristaMarker = null;
    }
    
    document.getElementById('selecaoServico').style.display = 'block';
    document.getElementById('painelCliente').style.display = 'none';
    
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    
    remove(ref(db, `clientes/${clienteId}`));
  }
}

// Função para mostrar modal
function mostrarModal(titulo, mensagem, callback) {
  document.getElementById('modalTitulo').textContent = titulo;
  document.getElementById('modalMensagem').textContent = mensagem;
  modalAcao = callback;
  document.getElementById('modalConfirmacao').style.display = 'flex';
}

// Função para confirmar ação no modal
function confirmarAcao(confirmado) {
  document.getElementById('modalConfirmacao').style.display = 'none';
  if (modalAcao && confirmado) {
    window[modalAcao](confirmado);
  }
  modalAcao = null;
}

// Função para avaliar serviço
function avaliar(nota) {
  avaliacaoAtual = nota;
  const estrelas = document.querySelectorAll('.estrelas span');
  estrelas.forEach((estrela, index) => {
    estrela.style.color = index < nota ? '#f1c40f' : '#ddd';
  });
}

// Função para enviar avaliação
function enviarAvaliacao() {
  const comentario = document.getElementById('comentarioAvaliacao').value;
  
  if (avaliacaoAtual > 0) {
    push(ref(db, `avaliacoes/${corridaAtiva.motoristaId}`), {
      clienteId,
      nota: avaliacaoAtual,
      comentario,
      timestamp: serverTimestamp()
    });
    
    alert("Obrigado pela sua avaliação!");
    document.getElementById('modalAvaliacao').style.display = 'none';
    sair();
  } else {
    alert("Por favor, selecione uma nota para avaliar.");
  }
}

// Função para fechar chat
function fecharChat() {
  document.getElementById('chatContainer').style.display = 'none';
  if (currentChatId) {
    off(ref(db, `chats/${currentChatId}/mensagens`), listeners[`chats/${currentChatId}/mensagens`]);
    delete listeners[`chats/${currentChatId}/mensagens`];
    currentChatId = null;
  }
}

// Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  // Verifica se há usuário autenticado
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Motorista já logado
      motoristaId = user.uid;
      localStorage.setItem('motoristaId', motoristaId);
      document.getElementById('telaInicial').style.display = 'none';
      document.getElementById('telaMotorista').style.display = 'block';
      
      if (!mapMotorista) {
        mapMotorista = initMap('mapMotorista');
        iniciarLocalizacaoMotorista();
      }
      
      alternarDisponibilidade();
    } else if (localStorage.getItem('clienteId')) {
      // Cliente já logado
      clienteId = localStorage.getItem('clienteId');
      document.getElementById('telaInicial').style.display = 'none';
      document.getElementById('telaCliente').style.display = 'block';
      document.getElementById('selecaoServico').style.display = 'block';
      document.getElementById('painelCliente').style.display = 'none';
      
      if (!mapCliente) {
        mapCliente = initMap('map');
      }
    }
  });
});