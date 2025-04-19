const db = firebase.database();

let map, clienteMarker, motoMarker, rota;
let idCliente = Date.now();
let idMoto = null;
let tipoUsuario = "";
let destinoSelecionado = null;

document.getElementById("btnMoto").onclick = () => {
  document.getElementById("loginMoto").classList.remove("oculto");
};

document.getElementById("btnCliente").onclick = () => {
  tipoUsuario = "cliente";
  document.getElementById("formCliente").classList.remove("oculto");
  iniciarLocalizacao();
};

document.getElementById("entrarMoto").onclick = () => {
  const senha = document.getElementById("senhaMoto").value;
  if (senha === "1234") {
    tipoUsuario = "moto";
    document.getElementById("loginMoto").classList.add("oculto");
    iniciarLocalizacao();
    monitorarClientes();
  } else {
    alert("Senha incorreta!");
  }
};

document.getElementById("enviarSolicitacao").onclick = () => {
  const tipo = document.getElementById("tipoServico").value;
  const valor = document.getElementById("valorDesejado").value;
  if (clienteMarker && valor) {
    db.ref("clientes/" + idCliente).set({
      lat: clienteMarker.getLatLng().lat,
      lng: clienteMarker.getLatLng().lng,
      tipo,
      valor,
      ativo: true
    });
    document.getElementById("formCliente").classList.add("oculto");
    document.getElementById("cancelarViagem").classList.remove("oculto");
  }
};

document.getElementById("cancelarViagem").onclick = () => {
  if (tipoUsuario === "cliente") {
    db.ref("clientes/" + idCliente).remove();
    document.getElementById("cancelarViagem").classList.add("oculto");
  }
  if (tipoUsuario === "moto" && destinoSelecionado) {
    db.ref("clientes/" + destinoSelecionado).update({ ativo: true });
    destinoSelecionado = null;
    if (rota) {
      map.removeControl(rota);
    }
    rota = null;
    document.getElementById("cancelarViagem").classList.add("oculto");
  }
};

document.getElementById("enviarMsg").onclick = () => {
  const msg = document.getElementById("chatInput").value;
  if (!msg) return;
  const sender = tipoUsuario === "cliente" ? "cliente" : "moto";
  const destino = tipoUsuario === "cliente" ? "chat_" + idCliente : "chat_" + destinoSelecionado;
  db.ref("chats/" + destino).push({ sender, msg });
  document.getElementById("chatInput").value = "";
};

function iniciarLocalizacao() {
  map = L.map("map").setView([0, 0], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);

  navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude } = pos.coords;

    if (tipoUsuario === "cliente") {
      if (!clienteMarker) {
        clienteMarker = L.marker([latitude, longitude], { draggable: true }).addTo(map);
      } else {
        clienteMarker.setLatLng([latitude, longitude]);
      }
      map.setView([latitude, longitude], 16);
    }

    if (tipoUsuario === "moto") {
      if (!motoMarker) {
        motoMarker = L.marker([latitude, longitude], { icon: iconMoto() }).addTo(map);
      } else {
        motoMarker.setLatLng([latitude, longitude]);
      }
      db.ref("moto/" + idCliente).set({ lat: latitude, lng: longitude });
    }
  }, console.error, { enableHighAccuracy: true });
}

function iconMoto() {
  return L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/2331/2331941.png",
    iconSize: [40, 40],
    iconAnchor: [20, 40]
  });
}

function monitorarClientes() {
  db.ref("clientes").on("value", snapshot => {
    const dados = snapshot.val();
    map.eachLayer(layer => {
      if (layer.options && layer.options.customTipo === "cliente") {
        map.removeLayer(layer);
      }
    });

    for (let id in dados) {
      const cliente = dados[id];
      if (cliente.ativo) {
        const cor = cliente.tipo === "viagem" ? "blue" : "green";
        const marker = L.circleMarker([cliente.lat, cliente.lng], {
          radius: 10,
          color: cor,
          fillColor: cor,
          fillOpacity: 0.6,
          customTipo: "cliente"
        })
          .addTo(map)
          .bindPopup(
            `Tipo: ${cliente.tipo}<br>Valor: R$${cliente.valor}<br><button onclick="buscarCliente('${id}', ${cliente.lat}, ${cliente.lng})">Buscar</button>`
          );
      }
    }
  });
}

function buscarCliente(id, lat, lng) {
  destinoSelecionado = id;
  db.ref("clientes/" + id).update({ ativo: false });
  if (rota) {
    map.removeControl(rota);
  }
  rota = L.Routing.control({
    waypoints: [
      motoMarker.getLatLng(),
      L.latLng(lat, lng)
    ],
    routeWhileDragging: false
  }).addTo(map);

  document.getElementById("chatContainer").classList.remove("oculto");
  document.getElementById("cancelarViagem").classList.remove("oculto");

  const chatRef = db.ref("chats/chat_" + id);
  chatRef.off();
  chatRef.on("child_added", snap => {
    const { sender, msg } = snap.val();
    const box = document.getElementById("chatBox");
    const div = document.createElement("div");
    div.innerHTML = `<b>${sender}:</b> ${msg}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  });
}