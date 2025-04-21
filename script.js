// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBaUW_ih2lxM9DRftochEBQUczXSPDx7vg",
  authDomain: "banco-40005.firebaseapp.com",
  databaseURL: "https://banco-40005-default-rtdb.firebaseio.com",
  projectId: "banco-40005",
  storageBucket: "banco-40005.appspot.com",
  messagingSenderId: "979660568413",
  appId: "1:979660568413:web:24e2510d5f840d45121ab4",
  measurementId: "G-TDHZS843JH"
};

// Inicializa Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// Variáveis globais
let mapCliente, mapMotorista;
let clienteMarker, motoristaMarker;
let clienteId = null;
let motoristaId = null;
let currentChatId = null;
let tipoServico = null;
let watchId = null;
let corridaAtiva = null;
let motoristaDisponivel = false;
let notificacaoTimeout = null;

// Elementos DOM
const elementos = {
  telaInicial: document.getElementById('telaInicial'),
  telaCliente: document.getElementById('telaCliente'),
  telaMotorista: document.getElementById('telaMotorista'),
  btnCliente: document.getElementById('btnCliente'),
  btnMotorista: document.getElementById('btnMotorista'),
  btnAtualizarLocalizacao: document.getElementById('btnAtualizarLocalizacao'),
  btnAtualizarLocalizacaoMotorista: document.getElementById('btnAtualizarLocalizacaoMotorista'),
  btnChat: document.getElementById('btnChat'),
  btnCancelar: document.getElementById('btnCancelar'),
  btnDisponibilidade: document.getElementById('btnDisponibilidade'),
  btnAceitarCorrida: document.getElementById('btnAceitarCorrida'),
  btnFinalizarCorrida: document.getElementById('btnFinalizarCorrida'),
  btnFecharChat: document.getElementById('btnFecharChat'),
  btnEnviarMensagem: document.getElementById('btnEnviarMensagem'),
  btnEnviarAvaliacao: document.getElementById('btnEnviarAvaliacao'),
  chatContainer: document.getElementById('chatContainer'),
  modalAvaliacao: document.getElementById('modalAvaliacao'),
  notificacao: document.getElementById('notificacao')
};

// Inicialização dos mapas
function initMap(elementId, center) {
  const map = L.map(elementId, {
    zoomControl: false,
    preferCanvas: true
  }).setView(center || [-22.9, -43.2], 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);

  return map;
}

// Função para mostrar notificação
function mostrarNotificacao(texto, tipo = 'info') {
  const notificacao = elementos.notificacao;
  const textoNotificacao = document.getElementById('notificationText');
  const icone = notificacao.querySelector('.notification-icon i');
  
  // Limpa timeout anterior
  if (notificacaoTimeout) {
    clearTimeout(notificacaoTimeout);
  }
  
  // Configura notificação
  notificacao.className = `notification ${tipo}`;
  textoNotificacao.textContent = texto;
  
  // Configura ícone
  switch (tipo) {
    case 'success':
      icone.className = 'fas fa-check-circle';
      break;
    case 'error':
      icone.className = 'fas fa-times-circle';
      break;
    case 'warning':
      icone.className = 'fas fa-exclamation-triangle';
      break;
    default:
      icone.className = 'fas fa-info-circle';
  }
  
  // Mostra notificação
  notificacao.classList.add('show');
  
  // Esconde após 5 segundos
  notificacaoTimeout = setTimeout(() => {
    notificacao.classList.remove('show');
  }, 5000);
}

// Função para obter localização
function obterLocalizacao(map, tipoUsuario) {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = [position.coords.latitude, position.coords.longitude];
          
          // Centraliza o mapa
          map.setView(userPos, 15);
          
          // Remove marcador anterior se existir
          if (tipoUsuario === 'cliente' && clienteMarker) {
            map.removeLayer(clienteMarker);
          } else if (tipoUsuario === 'motorista' && motoristaMarker) {
            map.removeLayer(motoristaMarker);
          }
          
          // Cria novo marcador
          const iconUrl = tipoUsuario === 'cliente' 
            ? 'https://cdn-icons-png.flaticon.com/512/447/447031.png' 
            : 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png';
            
          const marker = L.marker(userPos, {
            icon: L.icon({
              iconUrl: iconUrl,
              iconSize: [40, 40],
              iconAnchor: [20, 40]
            })
          }).addTo(map);
          
          marker.bindPopup(`<b>Você (${tipoUsuario === 'cliente' ? 'Cliente' : 'Motorista'})</b>`).openPopup();
          
          // Atualiza variável global
          if (tipoUsuario === 'cliente') {
            clienteMarker = marker;
          } else {
            motoristaMarker = marker;
          }
          
          resolve(userPos);
        },
        (error) => {
          console.error(`Erro ao obter localização do ${tipoUsuario}:`, error);
          mostrarNotificacao(`Erro de localização: ${error.message}`, 'error');
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      const error = new Error('Geolocalização não suportada');
      console.error(error.message);
      mostrarNotificacao(error.message, 'error');
      reject(error);
    }
  });
}

// Função para voltar à tela inicial
function voltarTelaInicial() {
  elementos.telaCliente.style.display = 'none';
  elementos.telaMotorista.style.display = 'none';
  elementos.telaInicial.style.display = 'flex';
  
  // Limpa marcadores
  if (mapCliente && clienteMarker) {
    mapCliente.removeLayer(clienteMarker);
    clienteMarker = null;
  }
  
  if (mapMotorista && motoristaMarker) {
    mapMotorista.removeLayer(motoristaMarker);
    motoristaMarker = null;
  }
  
  // Limpa geolocalização
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

// Função para alternar disponibilidade do motorista
function alternarDisponibilidade() {
  motoristaDisponivel = !motoristaDisponivel;
  const btn = elementos.btnDisponibilidade;
  
  if (motoristaDisponivel) {
    btn.classList.add('active');
    mostrarNotificacao('Você está disponível para corridas', 'success');
    
    // Simulação: depois de 5 segundos, mostra uma corrida disponível
    setTimeout(() => {
      if (motoristaDisponivel) {
        document.getElementById('painelCorrida').style.display = 'block';
        document.getElementById('clienteNome').textContent = 'Cliente #' + Math.floor(Math.random() * 1000);
        document.getElementById('clienteServico').textContent = 'Viagem';
        document.getElementById('clienteDistancia').textContent = (Math.random() * 5 + 1).toFixed(2) + ' km';
        document.getElementById('clienteTarifa').textContent = 'R$ ' + (Math.random() * 20 + 10).toFixed(2);
        
        mostrarNotificacao('Nova corrida disponível!', 'info');
      }
    }, 5000);
  } else {
    btn.classList.remove('active');
    document.getElementById('painelCorrida').style.display = 'none';
    mostrarNotificacao('Você está indisponível', 'warning');
  }
}

// Função para mostrar/ocultar chat
function toggleChat() {
  elementos.chatContainer.classList.toggle('show');
}

// Função para enviar mensagem no chat
function enviarMensagem() {
  const input = document.getElementById('chatInput');
  const texto = input.value.trim();
  
  if (texto) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message sent';
    messageElement.innerHTML = `
      ${texto}
      <span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
    `;
    messagesContainer.appendChild(messageElement);
    input.value = '';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

// Função para avaliar corrida
function avaliarCorrida(estrelas) {
  const stars = document.querySelectorAll('.rating-stars i');
  stars.forEach((star, index) => {
    if (index < estrelas) {
      star.classList.add('active');
      star.classList.remove('far');
      star.classList.add('fas');
    } else {
      star.classList.remove('active');
      star.classList.remove('fas');
      star.classList.add('far');
    }
  });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Inicializa mapas
  mapCliente = initMap('map');
  mapMotorista = initMap('mapMotorista');
  
  // Navegação
  elementos.btnCliente.addEventListener('click', async () => {
    elementos.telaInicial.style.display = 'none';
    elementos.telaCliente.style.display = 'flex';
    
    try {
      await obterLocalizacao(mapCliente, 'cliente');
      mostrarNotificacao('Localização obtida com sucesso', 'success');
    } catch (error) {
      console.error('Erro ao obter localização:', error);
    }
  });
  
  elementos.btnMotorista.addEventListener('click', async () => {
    // Simula autenticação
    const email = prompt('Digite o email do motorista:');
    if (!email) return;
    
    const senha = prompt('Digite a senha do motorista:');
    if (!senha) return;
    
    try {
      // Aqui você substituiria pela autenticação real com Firebase
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      elementos.telaInicial.style.display = 'none';
      elementos.telaMotorista.style.display = 'flex';
      
      await obterLocalizacao(mapMotorista, 'motorista');
      mostrarNotificacao('Motorista autenticado com sucesso', 'success');
    } catch (error) {
      mostrarNotificacao('Falha na autenticação', 'error');
      console.error('Erro na autenticação:', error);
    }
  });
  
  // Atualizar localização
  elementos.btnAtualizarLocalizacao.addEventListener('click', () => {
    if (mapCliente && elementos.telaCliente.style.display !== 'none') {
      obterLocalizacao(mapCliente, 'cliente');
    }
  });
  
  elementos.btnAtualizarLocalizacaoMotorista.addEventListener('click', () => {
    if (mapMotorista && elementos.telaMotorista.style.display !== 'none') {
      obterLocalizacao(mapMotorista, 'motorista');
    }
  });
  
  // Controles do motorista
  elementos.btnDisponibilidade.addEventListener('click', alternarDisponibilidade);
  
  elementos.btnAceitarCorrida.addEventListener('click', () => {
    document.getElementById('btnAceitarCorrida').style.display = 'none';
    document.getElementById('btnFinalizarCorrida').style.display = 'block';
    mostrarNotificacao('Corrida aceita com sucesso', 'success');
    
    // Simula motorista indo buscar o cliente
    setTimeout(() => {
      mostrarNotificacao('Você chegou ao local de partida', 'info');
    }, 3000);
  });
  
  elementos.btnFinalizarCorrida.addEventListener('click', () => {
    elementos.modalAvaliacao.classList.add('show');
  });
  
  // Chat
  elementos.btnChat.addEventListener('click', toggleChat);
  elementos.btnFecharChat.addEventListener('click', toggleChat);
  elementos.btnEnviarMensagem.addEventListener('click', enviarMensagem);
  
  // Avaliação
  document.querySelectorAll('.rating-stars i').forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.getAttribute('data-rating'));
      avaliarCorrida(rating);
    });
  });
  
  elementos.btnEnviarAvaliacao.addEventListener('click', () => {
    elementos.modalAvaliacao.classList.remove('show');
    mostrarNotificacao('Avaliação enviada com sucesso', 'success');
    setTimeout(() => {
      voltarTelaInicial();
    }, 2000);
  });
  
  // Tecla Enter no chat
  document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      enviarMensagem();
    }
  });
  
  // Seleção de serviço
  document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('click', () => {
      document.getElementById('selecaoServico').style.display = 'none';
      document.getElementById('painelCliente').style.display = 'block';
      tipoServico = card.getAttribute('data-service');
      mostrarNotificacao(`Serviço selecionado: ${tipoServico}`, 'info');
      
      // Simula busca por motorista
      setTimeout(() => {
        document.getElementById('infoMotorista').textContent = 'Motorista encontrado!';
        document.getElementById('infoTarifa').textContent = `R$ ${(Math.random() * 30 + 10).toFixed(2)}`;
        document.getElementById('infoTempo').textContent = `${Math.floor(Math.random() * 10 + 5)} min`;
        mostrarNotificacao('Motorista encontrado!', 'success');
      }, 2000);
    });
  });
  
  // Botão cancelar
  elementos.btnCancelar.addEventListener('click', () => {
    document.getElementById('selecaoServico').style.display = 'block';
    document.getElementById('painelCliente').style.display = 'none';
    mostrarNotificacao('Corrida cancelada', 'warning');
  });
});
// Funções para expor ao escopo global
window.voltarTelaInicial = voltarTelaInicial;
window.toggleChat = toggleChat;
window.enviarMensagem = enviarMensagem;

// Simulação de dados para demonstração
function simularDados() {
  // Atualiza estatísticas do motorista
  setInterval(() => {
    if (elementos.telaMotorista.style.display !== 'none') {
      document.getElementById('corridasHoje').textContent = Math.floor(Math.random() * 5);
      document.getElementById('avaliacao').textContent = (4.5 + Math.random() * 0.5).toFixed(1);
      document.getElementById('ganhosHoje').textContent = 
        'R$ ' + (Math.random() * 100 + 50).toFixed(2);
    }
  }, 5000);
}

// Inicia simulação
simularDados();

// Função para calcular rota (simulada)
function calcularRota(origem, destino) {
  return new Promise(resolve => {
    setTimeout(() => {
      const distancia = Math.sqrt(
        Math.pow(destino[0] - origem[0], 2) + 
        Math.pow(destino[1] - origem[1], 2)
      ) * 100;
      
      resolve({
        distancia: distancia.toFixed(2),
        tempo: (distancia * 2).toFixed(0),
        tarifa: (distancia * 1.5).toFixed(2)
      });
    }, 1500);
  });
}

// Função para simular movimento do motorista
function simularMovimentoMotorista(posicaoCliente) {
  if (!motoristaMarker) return;
  
  const posicaoAtual = motoristaMarker.getLatLng();
  const novoLat = posicaoAtual.lat + (posicaoCliente[0] - posicaoAtual.lat) * 0.1;
  const novoLng = posicaoAtual.lng + (posicaoCliente[1] - posicaoAtual.lng) * 0.1;
  
  motoristaMarker.setLatLng([novoLat, novoLng]);
  
  // Verifica se chegou perto do cliente
  const distancia = Math.sqrt(
    Math.pow(posicaoCliente[0] - novoLat, 2) + 
    Math.pow(posicaoCliente[1] - novoLng, 2)
  );
  
  if (distancia < 0.001) {
    mostrarNotificacao('Você chegou ao local do cliente', 'success');
  } else {
    setTimeout(() => simularMovimentoMotorista(posicaoCliente), 1000);
  }
}

// Função para mostrar modal de avaliação
function mostrarModalAvaliacao() {
  elementos.modalAvaliacao.classList.add('show');
}

// Função para fechar modal
function fecharModal() {
  elementos.modalAvaliacao.classList.remove('show');
}

// Adiciona evento de clique fora do modal para fechar
elementos.modalAvaliacao.addEventListener('click', (e) => {
  if (e.target === elementos.modalAvaliacao) {
    fecharModal();
  }
});

// Inicialização completa
function initApp() {
  // Verifica se há usuário autenticado (simulação)
  const user = localStorage.getItem('mototaxi_user');
  if (user) {
    try {
      const userData = JSON.parse(user);
      if (userData.tipo === 'motorista') {
        elementos.telaInicial.style.display = 'none';
        elementos.telaMotorista.style.display = 'flex';
        mostrarNotificacao('Login automático realizado', 'success');
      }
    } catch (e) {
      console.error('Erro ao analisar dados do usuário:', e);
    }
  }
}

// Inicia o aplicativo
initApp();

// Exemplo de como seria a autenticação real com Firebase
async function autenticarMotorista(email, senha) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, senha);
    motoristaId = userCredential.user.uid;
    
    // Salva dados do usuário
    localStorage.setItem('mototaxi_user', JSON.stringify({
      id: motoristaId,
      tipo: 'motorista',
      email: email
    }));
    
    return true;
  } catch (error) {
    console.error('Erro na autenticação:', error);
    mostrarNotificacao('Falha na autenticação: ' + error.message, 'error');
    return false;
  }
}

// Exemplo de como seria o logout
function logout() {
  auth.signOut().then(() => {
    localStorage.removeItem('mototaxi_user');
    voltarTelaInicial();
    mostrarNotificacao('Logout realizado com sucesso', 'success');
  }).catch(error => {
    console.error('Erro ao fazer logout:', error);
    mostrarNotificacao('Erro ao fazer logout', 'error');
  });
}

// Função para enviar solicitação de corrida (simulada)
async function enviarSolicitacao(tipoServico, posicao) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Corrida solicitada com sucesso',
        tempoEstimado: Math.floor(Math.random() * 10 + 5)
      });
    }, 2000);
  });
}

// Função para monitorar corrida (simulada)
function monitorarCorrida(corridaId) {
  let progresso = 0;
  const intervalo = setInterval(() => {
    progresso += 10;
    console.log(`Progresso da corrida: ${progresso}%`);
    
    if (progresso >= 100) {
      clearInterval(intervalo);
      mostrarNotificacao('Corrida finalizada', 'success');
      mostrarModalAvaliacao();
    }
  }, 2000);
}

// Exemplo de uso:
// document.getElementById('btnSolicitarCorrida').addEventListener('click', async () => {
//   const posicao = await obterLocalizacao(mapCliente, 'cliente');
//   const resultado = await enviarSolicitacao(tipoServico, posicao);
  
//   if (resultado.success) {
//     monitorarCorrida('corrida123');
//   }
// });