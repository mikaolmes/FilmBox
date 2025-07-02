// app/Lobby.tsx
"use client";

import React, { useState } from 'react';

interface LobbyProps {
  userName: string;
  setUserName: (name: string) => void;
  handleCreateRoom: () => void;
  handleJoinRoom: (roomId: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({ userName, setUserName, handleCreateRoom, handleJoinRoom }) => {
  const [inputRoomId, setInputRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const onJoin = () => {
    if (inputRoomId.trim()) {
      setIsJoining(true);
      handleJoinRoom(inputRoomId.trim().toUpperCase());
    }
  };

  return (
    <div className="app-container" lang="de">
      <h1>🎬 FilmBox - Lobby</h1>
      <div className="room-management" style={{ margin: '20px auto', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', maxWidth: '400px' }}>
        <input 
          type="text" 
          placeholder="Benutzername (optional)"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          style={{ display: 'block', width: 'calc(100% - 22px)', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #555' }}
        />
        <button onClick={handleCreateRoom} style={{ padding: '10px 15px', width: '100%', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '10px' }}>
          Neuen Raum erstellen
        </button>
        <hr style={{ border: 'none', borderTop: '1px solid #444', margin: '20px 0' }} />
        <input 
          type="text" 
          placeholder="Raum-ID eingeben zum Beitreten"
          value={inputRoomId}
          onChange={(e) => setInputRoomId(e.target.value)}
          style={{ display: 'block', width: 'calc(100% - 22px)', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #555' }}
        />
        <button onClick={onJoin} disabled={!inputRoomId.trim() || isJoining} style={{ padding: '10px 15px', width: '100%', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {isJoining ? 'Beitreten...' : 'Raum beitreten'}
        </button>
      </div>
    </div>
  );
};

export default Lobby;