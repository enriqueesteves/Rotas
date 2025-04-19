let map;
let userMarker;
let motoMarker;
let motoId;
let isMoto = false;
let isCliente = false;

const db = firebase.database();

document.getElementById('btnMoto').addEventListener('click', () => {
  isMoto = true;
  isCliente = false;
  document.getElementById('buttons').style.display = 'none';
  iniciarLocalizacao();
});

document.getElementById('btnCliente').addEventListener('click', () => {
  isCliente = true;
  isMoto = false;
  document.getElementById('buttons').style.display = 'none';
  document.getElementById('buscarMoto').style.display = 'block';
  iniciarLocalizacao();
});

document.getElementById('buscarMoto').addEventListener('click', () => {
  buscarMotoTaxiMaisProximo();
});

function iniciarLocalizacao() {
  map = L.map('map').setView([0, 0], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (userMarker) {
          userMarker.setLatLng([lat, lng]);
        } else {
          userMarker = L.marker([lat, lng]).addTo(map);
        }

        map.setView([lat, lng], 15);

        if (isMoto) {
          motoId = motoId || gerarIdUnico();
          db.ref('motos/' + motoId).set({
            lat, lng, timestamp: Date.now()
          });
        }

      },
      err => {
        alert('Erro ao obter localização: ' + err.message);
      },
      {
        enableHighAccuracy: true
      }
    );
  } else {
    alert("Geolocalização não suportada pelo seu navegador.");
  }
}

function gerarIdUnico() {
  return 'moto_' + Math.random().toString(36).substr(2, 9);
}

function buscarMotoTaxiMaisProximo() {
  db.ref('motos').once('value', snapshot => {
    const motos = snapshot.val();
    if (!motos) {
      alert('Nenhum moto táxi encontrado.');
      return;
    }

    const minhaLat = userMarker.getLatLng().lat;
    const minhaLng = userMarker.getLatLng().lng;

    let motoMaisProxima = null;
    let menorDistancia = Infinity;

    for (let id in motos) {
      const moto = motos[id];
      const dist = calcularDistancia(minhaLat, minhaLng, moto.lat, moto.lng);
      if (dist < menorDistancia) {
        menorDistancia = dist;
        motoMaisProxima = moto;
      }
    }

    if (motoMaisProxima) {
      if (motoMarker) {
        motoMarker.setLatLng([motoMaisProxima.lat, motoMaisProxima.lng]);
      } else {
        motoMarker = L.marker([motoMaisProxima.lat, motoMaisProxima.lng], {
          icon: L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/2983/2983213.png',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        }).addTo(map);
      }

      L.Routing.control({
        waypoints: [
          L.latLng(minhaLat, minhaLng),
          L.latLng(motoMaisProxima.lat, motoMaisProxima.lng)
        ],
        routeWhileDragging: false
      }).addTo(map);
    }
  });
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value) {
  return value * Math.PI / 180;
}