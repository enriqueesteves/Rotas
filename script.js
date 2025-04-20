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

function initMap() {
  map = L.map('map').setView([-22.9, -43.2], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

function entrarComoCliente() {
  document.getElementById("painelTitulo").innerText = "Painel do Cliente";
  initMap();

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      db.ref("cliente").set({ lat, lng });

      if (!clienteMarker) {
        clienteMarker = L.marker([lat, lng], { title: "Você (Cliente)" }).addTo(map);
        map.setView([lat, lng], 15);
      } else {
        clienteMarker.setLatLng([lat, lng]);
      }
    });

    db.ref("motorista").on("value", (snap) => {
      const data = snap.val();
      if (data) {
        if (!motoristaMarker) {
          motoristaMarker = L.marker([data.lat, data.lng], { title: "Moto Táxi", icon: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', iconSize: [30, 30] }) }).addTo(map);
        } else {
          motoristaMarker.setLatLng([data.lat, data.lng]);
        }
      }
    });
  }
}

function entrarComoMotorista() {
  const senha = prompt("Digite a senha do motorista:");
  if (senha !== "1234") return alert("Senha incorreta.");

  document.getElementById("painelTitulo").innerText = "Painel do Motorista";
  initMap();

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      db.ref("motorista").set({ lat, lng });

      if (!motoristaMarker) {
        motoristaMarker = L.marker([lat, lng], { title: "Você (Motorista)" }).addTo(map);
        map.setView([lat, lng], 15);
      } else {
        motoristaMarker.setLatLng([lat, lng]);
      }
    });

    db.ref("cliente").on("value", (snap) => {
      const data = snap.val();
      if (data) {
        if (!clienteMarker) {
          clienteMarker = L.marker([data.lat, data.lng], { title: "Cliente", icon: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png', iconSize: [30, 30] }) }).addTo(map);
        } else {
          clienteMarker.setLatLng([data.lat, data.lng]);
        }
      }
    });
  }
    }
