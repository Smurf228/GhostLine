import { useEffect, useRef, useState } from 'react';
import socket from '../socket';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // публичный TURN (без регистрации)
    { urls: 'turn:numb.viagenie.ca', username: 'webrtc@live.com', credential: 'muazkh' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  ]
};

const VoiceRoom = ({ channelId, user, onLeave }) => {
  const [participants, setParticipants] = useState([]);
  const [muted, setMuted] = useState(false);
  const [iceState, setIceState] = useState('new');  // for diagnosis
  const localStreamRef = useRef(null);
  const peersRef = useRef({});        // socketId -> RTCPeerConnection
  const audioEls = useRef({});        // socketId -> HTMLAudioElement
  const iceQueues = useRef({});       // socketId -> candidate[] (queued before remoteDesc)

  const addAudio = (socketId, stream) => {
    if (audioEls.current[socketId]) {
      audioEls.current[socketId].pause();
      audioEls.current[socketId].srcObject = null;
      audioEls.current[socketId].remove();
    }
    const audio = document.createElement('audio');
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audio.play()
      .then(() => console.log('[Voice] audio playing for', socketId.slice(0,6)))
      .catch(err => console.error('[Voice] audio play failed:', err));
    audioEls.current[socketId] = audio;
  };

  useEffect(() => {
    let cancelled = false;

    const makePeer = (targetSocketId, localStream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          console.log(`[Voice] candidate gathered for ${targetSocketId.slice(0,6)}: ${candidate.type} ${candidate.protocol}`);
          socket.emit('voice_ice', { to: targetSocketId, candidate });
        } else {
          console.log(`[Voice] gathering done for ${targetSocketId.slice(0,6)}`);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[Voice] ICE ${targetSocketId.slice(0,6)}: ${pc.iceConnectionState}`);
        setIceState(pc.iceConnectionState);
      };

      pc.onicegatheringstatechange = () => {
        console.log(`[Voice] gathering ${targetSocketId.slice(0,6)}: ${pc.iceGatheringState}`);
      };

      pc.onconnectionstatechange = () => {
        console.log(`[Voice] conn ${targetSocketId.slice(0,6)}: ${pc.connectionState}`);
      };

      pc.ontrack = ({ track, streams }) => {
        console.log(`[Voice] ontrack from ${targetSocketId.slice(0,6)}, streams:`, streams?.length);
        const stream = streams && streams[0] ? streams[0] : new MediaStream([track]);
        addAudio(targetSocketId, stream);
      };

      return pc;
    };

    const init = async () => {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch {
        alert('// MICROPHONE ACCESS DENIED');
        onLeave();
        return;
      }

      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
      localStreamRef.current = stream;

      // Обработчики сокета
      const onParticipants = (existingList) => {
        setParticipants([...existingList, { socketId: socket.id, username: user.username }]);
        // Мы инициируем соединение к каждому существующему участнику
        existingList.forEach(({ socketId }) => {
          const pc = makePeer(socketId, stream);
          peersRef.current[socketId] = pc;
          pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .then(() => socket.emit('voice_offer', { to: socketId, offer: pc.localDescription }))
            .catch(console.error);
        });
      };

      const onUserJoined = ({ socketId, username }) => {
        console.log('[Voice] voice_user_joined:', username, socketId.slice(0,6));
        setParticipants(prev =>
          prev.find(p => p.socketId === socketId) ? prev : [...prev, { socketId, username }]
        );
        // НЕ создаём peer заранее — создадим когда придёт offer
      };

      const flushIce = async (socketId) => {
        const pc = peersRef.current[socketId];
        const queue = iceQueues.current[socketId] || [];
        delete iceQueues.current[socketId];
        for (const c of queue) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
        }
      };

      const onOffer = async ({ from, offer }) => {
        console.log('[Voice] voice_offer from', from.slice(0,6));
        let pc = peersRef.current[from];
        if (!pc) {
          console.log('[Voice] creating fresh peer for', from.slice(0,6));
          pc = makePeer(from, stream);
          peersRef.current[from] = pc;
        } else {
          console.log('[Voice] reusing existing peer for', from.slice(0,6));
        }
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          console.log('[Voice] remoteDescription set for', from.slice(0,6));
          await flushIce(from);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log('[Voice] localDescription set (answer) for', from.slice(0,6));
          socket.emit('voice_answer', { to: from, answer: pc.localDescription });
          console.log('[Voice] voice_answer sent to', from.slice(0,6));
        } catch (err) {
          console.error('[Voice] onOffer error:', err);
        }
      };

      const onAnswer = async ({ from, answer }) => {
        const pc = peersRef.current[from];
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            await flushIce(from);
          } catch (err) {
            console.error('voice_answer handling error:', err);
          }
        }
      };

      const onIce = async ({ from, candidate }) => {
        if (!candidate) return;
        const pc = peersRef.current[from];
        if (!pc) {
          console.log('[Voice] onIce: no peer for', from.slice(0,6), '— queueing');
          if (!iceQueues.current[from]) iceQueues.current[from] = [];
          iceQueues.current[from].push(candidate);
          return;
        }
        if (!pc.remoteDescription || !pc.remoteDescription.type) {
          if (!iceQueues.current[from]) iceQueues.current[from] = [];
          iceQueues.current[from].push(candidate);
        } else {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('[Voice] addIceCandidate failed:', e.message);
          }
        }
      };

      const onUserLeft = ({ socketId }) => {
        setParticipants(prev => prev.filter(p => p.socketId !== socketId));
        if (peersRef.current[socketId]) { peersRef.current[socketId].close(); delete peersRef.current[socketId]; }
        if (audioEls.current[socketId]) { audioEls.current[socketId].pause(); delete audioEls.current[socketId]; }
      };

      socket.on('voice_participants', onParticipants);
      socket.on('voice_user_joined', onUserJoined);
      socket.on('voice_offer', onOffer);
      socket.on('voice_answer', onAnswer);
      socket.on('voice_ice', onIce);
      socket.on('voice_user_left', onUserLeft);

      socket.emit('join_voice', { channelId, userId: user.id, username: user.username });
    };

    init();

    return () => {
      cancelled = true;
      socket.emit('leave_voice', { channelId });
      socket.off('voice_participants');
      socket.off('voice_user_joined');
      socket.off('voice_offer');
      socket.off('voice_answer');
      socket.off('voice_ice');
      socket.off('voice_user_left');
      Object.values(peersRef.current).forEach(pc => pc.close());
      peersRef.current = {};
      iceQueues.current = {};
      Object.values(audioEls.current).forEach(a => { a.pause(); a.srcObject = null; a.remove(); });
      audioEls.current = {};
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [channelId, user.id, user.username, onLeave]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const newMuted = !muted;
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
      setMuted(newMuted);
    }
  };

  return (
    <div className="voice-room">
      <div className="voice-left">
        <span className="voice-live">◉ VOICE</span>
        <span className={`voice-ice-state voice-ice-${iceState}`}>[{iceState}]</span>
        <div className="voice-users">
          {participants.map(p => (
            <span key={p.socketId} className={`voice-chip ${p.socketId === socket.id && muted ? 'voice-muted' : ''}`}>
              @{p.username}{p.socketId === socket.id && muted ? ' [M]' : ''}
            </span>
          ))}
        </div>
      </div>
      <div className="voice-controls">
        <button className="voice-ctrl-btn" onClick={toggleMute}>
          {muted ? '[UNMUTE]' : '[MUTE]'}
        </button>
        <button className="voice-ctrl-btn voice-leave" onClick={onLeave}>[LEAVE]</button>
      </div>
    </div>
  );
};

export default VoiceRoom;
