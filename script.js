let socket = io.connect('localhost:8080');
let username = "";
let config = {
  iceServers: [
    { urls: "turn:18.220.153.122:3478", username: "riverway", credential: "Apollo13" }
  ]
};
function randomToken() {
  return Math.floor((1 + Math.random()) * 1e16).toString(16).substring(1);
}

if (localStorage.getItem('username')) {
  username = localStorage.getItem('username');
} else {
  username = randomToken();
  localStorage.setItem('username', username);
}

socket.emit("join", { clientID: username });

socket.on('client_connected', data => {
  console.log("Clients: ", data)
});

socket.emit('get_clients');

let localVideo = document.querySelector('#localVideo');
let remotePeer = document.querySelector('#remotePeer');

let localStream;

let startCall = document.querySelector('#startCall');

let peer_connection;
let peer_connection2;

startCall.addEventListener('click', e => {
  navigator.mediaDevices.getUserMedia({ audio: true, video: { height: { max: 200}} })
    .then(stream => {
      localVideo.srcObject = stream;
      localStream = stream;

      peer_connection = new RTCPeerConnection(config);

      peer_connection.onicecandidate = ice => {
        socket.emit('ice_candidate', { ice });
      }

      peer_connection.ontrack = track => {
        console.log("Got track local", track.streams[0])
        remotePeer.srcObject = track.streams[0];
      }

      localStream.getTracks().forEach(track => peer_connection.addTrack(track, stream));

      peer_connection.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true })
        .then(ld => {
          peer_connection.setLocalDescription(ld)
            .then(e => {
              console.log("local desc set success")
            })
            .catch(e => {
              console.log("local desc set failed");
            })

          socket.emit("local_description", { data: ld });
        })
        .catch(e => console.log(e.toString()))
    })
    .catch(error => {
      console.log(error.toString());
    })
})

socket.on('local_description', data => {

  navigator.mediaDevices.getUserMedia({ audio: true, video: { height: { max: 200}} })
    .then(stream => {
      localVideo.srcObject = stream;
      localStream = stream;

      let remote_desc = data.data;
      peer_connection2 = new RTCPeerConnection(config);

      peer_connection2.onicecandidate = ice => {
        socket.emit('ice_candidate', { ice });
      }

      peer_connection2.ontrack = track => {
        console.log("got track remote", track.streams[0])
        remotePeer.srcObject = track.streams[0];
      }

      localStream.getTracks().forEach( track => peer_connection2.addTrack(track, stream))

      peer_connection2.setRemoteDescription(remote_desc)
        .then(e => {
          peer_connection2.createAnswer(remote_desc)
            .then(ld2 => {
              peer_connection2.setLocalDescription(ld2)
                .then(d => {
                  console.log("Remote local desc set");
                })
                .catch(d => {
                  console.log("Remote local desc failed");
                })

              socket.emit("answer_description", { data: ld2 });
            })
            .catch(e => {
              console.log("created answer error");
            })
        })
        .catch(e => {
          console.log("remote desc set failed");
        })
    })
})

socket.on('answer_description', data => {
  peer_connection.setRemoteDescription(data.data)
    .then(d => {
      console.log("remote answer desc set");
    })
    .catch(e => {
      console.log("remote answer desc failed");
    })
});

socket.on('ice_candidate', ice => {
  peer_connection2.addIceCandidate(ice)
  .then(e => {
    console.log("ADding ICE success")
  })
  .catch(e => {
    console.log("Adding ICE failed")
  })
});