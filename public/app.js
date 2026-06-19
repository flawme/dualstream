const socket = io();

// Screens
const setupScreen = document.getElementById('setup-screen');
const laptopScreen = document.getElementById('laptop-screen');
const phoneScreen = document.getElementById('phone-screen');

// Laptop Elements
const localVideo = document.getElementById('local-video');
const remoteAudio = document.getElementById('remote-audio');
const statusBadge = document.getElementById('connection-status');
const recordBtn = document.getElementById('record-btn');
const downloadLink = document.getElementById('download-link');

// Phone Elements
const micAnimation = document.getElementById('mic-animation');

// WebRTC and Media
let peerConnection;
let localStream;
let remoteStream;
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

let currentRole = '';

async function selectRole(role) {
    setupScreen.classList.remove('active');

    if (role === 'laptop-camera' || role === 'laptop-screen') {
        currentRole = 'laptop';
        laptopScreen.classList.add('active');
        await initLaptop(role === 'laptop-screen');
    } else {
        currentRole = 'phone';
        phoneScreen.classList.add('active');
        await initPhone();
    }
}

// LAPTOP LOGIC (Receiver)
async function initLaptop(isScreen = false) {
    try {
        if (isScreen) {
            localStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        } else {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        localVideo.srcObject = localStream;
    } catch (e) {
        console.error("Camera error:", e);
        alert("Could not access camera. Please ensure permissions are granted.");
        return;
    }

    socket.emit('join', 'laptop');

    socket.on('user-joined', async (role) => {
        if (role === 'phone') {
            updateStatus('connected', 'Phone Connected!');
            createPeerConnection(false);
        }
    });

    socket.on('offer', async (offer) => {
        updateStatus('connected', 'Phone Connected!');
        if (!peerConnection) createPeerConnection(false);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer);
    });

    socket.on('candidate', async (candidate) => {
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    });

    recordBtn.addEventListener('click', toggleRecording);
}

// PHONE LOGIC (Sender)
async function initPhone() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    } catch (e) {
        console.error("Mic error:", e);
        alert("Could not access microphone.");
        return;
    }

    socket.emit('join', 'phone');
    
    // Create offer
    createPeerConnection(true);

    socket.on('user-joined', (role) => {
        if (role === 'laptop') {
            // Laptop refreshed or joined late, resend offer
            createPeerConnection(true);
        }
    });

    socket.on('answer', async (answer) => {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('candidate', async (candidate) => {
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    });
}

function createPeerConnection(isInitiator = false) {
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };

    if (currentRole === 'laptop') {
        peerConnection.ontrack = (event) => {
            if (!remoteStream) {
                remoteStream = new MediaStream();
                remoteAudio.srcObject = remoteStream;
            }
            remoteStream.addTrack(event.track);
            console.log("Received remote audio track");
            recordBtn.classList.remove('disabled');
            recordBtn.disabled = false;
        };
    }

    if (currentRole === 'phone' && localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }

    if (isInitiator) {
        peerConnection.createOffer()
            .then(offer => {
                return peerConnection.setLocalDescription(offer);
            })
            .then(() => {
                socket.emit('offer', peerConnection.localDescription);
            });
    }
}

// RECORDING LOGIC (Laptop)
function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    recordedChunks = [];
    
    // Combine video from localStream and audio from remoteStream
    const combinedStream = new MediaStream([
        ...localStream.getVideoTracks()
    ]);

    if (remoteStream && remoteStream.getAudioTracks().length > 0) {
        combinedStream.addTrack(remoteStream.getAudioTracks()[0]);
    }

    const options = { mimeType: 'video/webm; codecs=vp9,opus' };
    try {
        mediaRecorder = new MediaRecorder(combinedStream, options);
    } catch (e) {
        console.error("MediaRecorder error:", e);
        mediaRecorder = new MediaRecorder(combinedStream); // fallback
    }

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = saveRecording;

    mediaRecorder.start();
    isRecording = true;
    
    recordBtn.innerHTML = '<i class="fa-solid fa-square"></i> <span>Stop Recording</span>';
    recordBtn.classList.add('recording');
}

function stopRecording() {
    mediaRecorder.stop();
    isRecording = false;
    
    recordBtn.innerHTML = '<i class="fa-solid fa-circle"></i> <span>Start Recording</span>';
    recordBtn.classList.remove('recording');
}

function saveRecording() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    
    downloadLink.href = url;
    downloadLink.download = `DualStream_${new Date().getTime()}.webm`;
    downloadLink.click();
    
    URL.revokeObjectURL(url);
}

function updateStatus(status, text) {
    statusBadge.className = `status-badge ${status}`;
    statusBadge.innerHTML = `<i class="fa-solid fa-${status === 'connected' ? 'check-circle' : 'circle'}"></i> ${text}`;
}
