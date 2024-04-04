let APP_ID = "a6aa72a958d54e37baf5dce1c15e0c84";

let token = null;
let uid = String(Math.floor(Math.random() * 10000));

let client;
let channel;

let localstream;
let a;
let remoteStream;
let peerConnection;

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};

// Function to initialize the WebRTC connection
let init = async () => {
  client = await AgoraRTM.createInstance(APP_ID);
  await client.login({ uid, token });

  //index.html?roomID=12345
  channel = client.createChannel("roomID");
  await channel.join();

  channel.on("MemberJoined", handleUserJoined);

  channel.on("MemberLeft", handleUserLeft);

  client.on("MessageFromPeer", handleMessageFromPeer);

  // Get user media (video only)
  localstream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });

  // Display local video stream on user-1 element
  document.getElementById("user-1").srcObject = localstream;

  // Call function to create offer
  createOffer();
};

let handleUserLeft = (MemberId) => {
  console.log("User left:", MemberId);
  document.getElementById("user-2").style.display = "none";
};

let handleMessageFromPeer = async (message, MemberId) => {
  message = JSON.parse(message.text);
  if (message.type === "offer") {
    createAnswer(MemberId, message.offer);
  }
  if (message.type === "answer") {
    addAnswer(message.answer);
  }
  if (message.type === "candidate") {
    if (peerConnection) {
      peerConnection.addIceCandidate(message.candidate);
    }
  }
};

let handleUserJoined = async (MemberId) => {
  console.log("User joined:", MemberId);
  createOffer(MemberId);
};

let createPeerConnection = async (MemberId) => {
  peerConnection = new RTCPeerConnection(servers);

  // Create MediaStream object for remote stream
  remoteStream = new MediaStream();

  // Display remote video stream on user-2 element
  document.getElementById("user-2").srcObject = remoteStream;

  document.getElementById("user-2").style.display = "block";

  if (!localstream) {
    localstream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    document.getElementById("user-1").srcObject = localstream;
  }

  localstream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localstream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      client.sendMessageToPeer(
        {
          text: JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
          }),
        },
        MemberId
      );
    }
  };
};

// Function to create offer
let createOffer = async (MemberId) => {
  await createPeerConnection(MemberId);

  // Create offer
  let offer = await peerConnection.createOffer();

  // Set local description with the offer
  await peerConnection.setLocalDescription(offer);

  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "offer", offer: offer }) },
    MemberId
  );
};

let createAnswer = async (MemberId, offer) => {
  await createPeerConnection(MemberId);

  await peerConnection.setRemoteDescription(offer);

  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "answer", answer: answer }) },
    MemberId
  );
};

let addAnswer = async (answer) => {
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.setRemoteDescription(answer);
  }
};

let leaveChannel = async () => {
  await channel.leave();
  await client.logout();
};

window.addEventListener("beforeunload", leaveChannel);

// Initialize the WebRTC connection
init();
