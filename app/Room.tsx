// app/Room.tsx
"use client";

import React from 'react';

interface RoomUser {
  id: string;
  name: string;
}

interface RoomProps {
  roomId: string;
  users: RoomUser[];
  isCreator: boolean;
  handleLeaveRoom: () => void;
  handleStartSession: () => void;
}

const Room: React.FC<RoomProps> = ({ roomId, users, isCreator, handleLeaveRoom, handleStartSession }) => {
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      alert('Raum-ID in die Zwischenablage kopiert!');
    }, (err) => {
      console.error('Could not copy text: ', err);
    });
  };

  return (
    <div className="app-container" lang="de">
      <div className="room-container" style={{ margin: '20px auto', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', maxWidth: '500px', textAlign: 'center' }}>
        <h2>Raum beigetreten</h2>
        <p>Teile diese ID mit deinen Freunden:</p>
        <div 
          onClick={copyRoomId} 
          style={{ 
            background: '#333', 
            padding: '15px', 
            borderRadius: '8px', 
            fontSize: '24px', 
            fontWeight: 'bold', 
            letterSpacing: '3px',
            cursor: 'pointer',
            marginBottom: '20px',
            fontFamily: 'monospace'
          }}
        >
          {roomId}
        </div>
        
        <h3>Benutzer im Raum ({users.length}):</h3>
        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '20px' }}>
          {users.map(user => (
            <li key={user.id} style={{ background: '#444', margin: '5px 0', padding: '8px', borderRadius: '4px' }}>
              {user.name}
            </li>
          ))}
        </ul>

        {isCreator && (
          <button onClick={handleStartSession} style={{ padding: '12px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', marginTop: '10px' }}>
            Session starten
          </button>
        )}
        {!isCreator && <p>Warte auf den Host, um die Session zu starten...</p>}
        <button onClick={handleLeaveRoom} style={{ padding: '12px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}>
          Raum verlassen
        </button>
      </div>
    </div>
  );
};

export default Room;