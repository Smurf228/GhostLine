import { useEffect, useRef, useState } from 'react';
import socket from '../socket';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

const VoiceRoom = ({ channelId, user, onLeave }) => {
  const [participants, setParticipants] = useState([]);
  const [muted, setMuted] = useState(false);
  const localStreamRef = useRef(null);
  const peersRef = useRef({});     // socketId -> RTCPeerConnection
  const audioEls = useRef({});     // socketId -> HTMLAudioElement

  const addAudio = (socketId, stream) => {
    if (audioEls.current[socketId]) {
      audioEls.current[socketId].pause();
      audioEls.current[socketId].srcObject = null;
    }
    const audio = new Audio();
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.play().catch(() => {});
    audioEls.current[socketId] = audio;
  };

  useEffect(() => {
    let cancelled = false;

    const makePeer = (targetSocketId, localStream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) socket.emit('voice_ice', { to: targetSocketId, candidate });
      };

      pc.ontrack = ({ streams }) => {
        addAudio(targetSocketId, streams[0]);
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
        setParticipants(prev =>
          prev.find(p => p.socketId === socketId) ? prev : [...prev, { socketId, username }]
        );
        // Новый участник сам пришлёт нам offer, мы просто готовим peer
        if (!peersRef.current[socketId]) {
          peersRef.current[socketId] = makePeer(socketId, stream);
        }
      };

      const onOffer = async ({ from, offer }) => {
        let pc = peersRef.current[from];
        if (!pc) {
          pc = makePeer(from, stream);
          peersRef.current[from] = pc;
        }
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('voice_answer', { to: from, answer: pc.localDescription });
        } catch (err) {
          console.error('voice_offer handling error:', err);
        }
      };

      const onAnswer = async ({ from, answer }) => {
        const pc = peersRef.current[from];
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (err) {
            console.error('voice_answer handling error:', err);
          }
        }
      };

      const onIce = async ({ from, candidate }) => {
        const pc = peersRef.current[from];
        if (pc && candidate) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* ignore */ }
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
      Object.values(audioEls.current).forEach(a => { a.pause(); a.srcObject = null; });
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
