let localstream;
let remoteStream;
let init = async () => {
  localstream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });
  document.getElementById("user-1").srcObject = localstream;
};
init();
