// src/components/FilmBoxApp.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import Lobby from './Lobby'; // Import the Lobby component
import Room from './Room';   // Import the Room component

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[]; // TMDB provides genre IDs, you might need to map them to names
}

// Updated Movie interface to better match what we'll use internally
interface Movie {
  id: number;
  title: string;
  year: number; // Or string, depending on how you format release_date
  genre: string[]; // We'll need to map genre_ids to names
  description: string;
  poster: string; // This will be the full URL to the poster
  // image?: string; // We can derive this from poster_path
}

// const initialMovies: Movie[] = [ ... ]; // We will remove or comment this out

interface TmdbGenre {
  id: number;
  name: string;
}

// Add room interfaces if needed
interface RoomUser {
  id: string;
  name: string;
}

interface RoomState {
  roomId: string;
  users: RoomUser[];
  movies: Movie[];
  votes: Record<number, string[]>;
}

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

// Helper function to shuffle an array (Fisher-Yates shuffle)
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Remove duplicate declaration and keep only one FilmBoxApp component
// Rename FilmBoxAppComponent to FilmBoxApp if you haven't already
const FilmBoxApp: React.FC = () => {
  const [allFetchedMovies, setAllFetchedMovies] = useState<Movie[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genresMap, setGenresMap] = useState<Map<number, string>>(new Map());
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [likedMovies, setLikedMovies] = useState<Movie[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [isDescriptionVisible, setIsDescriptionVisible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Socket and Room State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [isInRoom, setIsInRoom] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');
  const [sessionStarted, setSessionStarted] = useState<boolean>(false);
  const [matchedMovies, setMatchedMovies] = useState<Movie[]>([]);
  const [waitingForOthers, setWaitingForOthers] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  const handleCreateRoom = () => {
    if (socket) {
      const finalUserName = userName.trim() || `User_${Math.random().toString(36).substr(2, 5)}`;
      if (!userName.trim()) setUserName(finalUserName);
      socket.emit('createRoom', { userName: finalUserName });
    }
  };



  const handleJoinRoom = (roomIdToJoin: string) => {
    if (socket && roomIdToJoin) {
      const finalUserName = userName.trim() || `User_${Math.random().toString(36).substr(2, 5)}`;
      if (!userName.trim()) setUserName(finalUserName);
      socket.emit('joinRoom', { roomId: roomIdToJoin, userName: finalUserName });
    }
  };

  const handleLeaveRoom = () => {
    if (socket && roomId) {
      socket.emit('leaveRoom', { roomId });
      setIsInRoom(false);
      setRoomId('');
      setRoomUsers([]);
      setSessionStarted(false); // Reset session state on leaving
    }
  };

  const handleStartSession = () => {
    if (socket && roomId) {
      socket.emit('startSession', { roomId });
    }
  };

  // Initialize Socket Connection
  useEffect(() => {
    // The socket connection is now simplified.
    // It will connect to the server and the server will handle the one-time initialization.
    const newSocket = io({ path: '/api/socket' });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to socket server with ID:', newSocket.id);
      setConnectionStatus('connected');
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error);
      setConnectionStatus('error');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setConnectionStatus('disconnected');
    });

    newSocket.on('roomState', (updatedRoomState: any) => {
      console.log('Received room state:', updatedRoomState);
      setRoomId(updatedRoomState.id); // Corrected from roomId to id
      setRoomUsers(updatedRoomState.users);
      setIsInRoom(true);
    });

    newSocket.on('sessionStarted', ({ movies: newMovies }: { movies: Movie[] }) => {
      console.log('Session started, received movies:', newMovies);
      setMovies(newMovies);
      setAllFetchedMovies(newMovies); // Also update the source of truth
      setCurrentIndex(0);
      setSessionStarted(true);
    });

    newSocket.on('sessionEnded', ({ matchedMovies }: { matchedMovies: Movie[] }) => {
      console.log('Session ended, received matches:', matchedMovies);
      setMatchedMovies(matchedMovies);
      setShowResults(true);
      setWaitingForOthers(false);
    });

    newSocket.on('userJoined', (user: RoomUser) => {
      console.log('User joined:', user);
      setRoomUsers(prevUsers => {
        // Avoid adding duplicate users if this event is received multiple times
        if (prevUsers.find(u => u.id === user.id)) return prevUsers;
        return [...prevUsers, user];
      });
    });

    newSocket.on('userLeft', (userId: string) => {
      console.log('User left:', userId);
      setRoomUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
    });

    newSocket.on('roomNotFound', (message: string) => {
      alert(message);
      setIsInRoom(false);
      setRoomId('');
    });

    newSocket.on('roomCreated', (data: { roomId: string, user: RoomUser }) => {
      console.log('Room created:', data.roomId, 'by user:', data.user);
      setRoomId(data.roomId);
      setRoomUsers([data.user]); // Creator is the first user
      setIsInRoom(true);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []); // Removed userName dependency as it's not directly used for connection anymore

  // Fetch genres and movies (existing useEffect - keep as is)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
      if (!apiKey) {
        setError("API key is missing. Please set NEXT_PUBLIC_TMDB_API_KEY in your .env.local file.");
        setIsLoading(false);
        return;
      }

      try {
        // Fetch Genres
        const genreResponse = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=de-DE`);
        if (!genreResponse.ok) {
          throw new Error(`API request for genres failed with status ${genreResponse.status}`);
        }
        const genreData = await genreResponse.json();
        const newGenresMap = new Map<number, string>();
        genreData.genres.forEach((genre: TmdbGenre) => {
          newGenresMap.set(genre.id, genre.name);
        });
        setGenresMap(newGenresMap);

        // Fetch Popular Movies from multiple pages to get a larger pool
        let fetchedTmdbMovies: TmdbMovie[] = [];
        // Fetching from 3 pages to get up to 60 movies for a better random selection pool
        // You can adjust the number of pages or use different endpoints (e.g., top_rated, upcoming)
        for (let page = 1; page <= 3; page++) {
          const movieResponse = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=de-DE&page=${page}`);
          if (!movieResponse.ok) {
            // If one page fails, we can either stop or continue with what we have
            console.warn(`API request for movies (page ${page}) failed with status ${movieResponse.status}`);
            continue; // Continue to next page or handle error more gracefully
          }
          const movieData = await movieResponse.json();
          fetchedTmdbMovies = fetchedTmdbMovies.concat(movieData.results);
        }

        if (fetchedTmdbMovies.length === 0) {
          throw new Error("No movies fetched from TMDB.");
        }
        
        const transformedMovies: Movie[] = fetchedTmdbMovies.map((tmdbMovie: TmdbMovie) => ({
          id: tmdbMovie.id,
          title: tmdbMovie.title,
          year: parseInt(tmdbMovie.release_date?.split('-')[0] || "0"),
          genre: tmdbMovie.genre_ids.map(id => newGenresMap.get(id) || `ID ${id}`).slice(0, 3),
          description: tmdbMovie.overview,
          poster: tmdbMovie.poster_path ? `${TMDB_IMAGE_BASE_URL}${tmdbMovie.poster_path}` : "/placeholder-brain.png",
        }));

        setAllFetchedMovies(transformedMovies); // Store all fetched movies
        setMovies(shuffleArray(transformedMovies).slice(0, 20)); // Set the first 20 shuffled movies for the session

      } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError("An unknown error occurred");
        }
        console.error("Failed to fetch data:", err);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []); // Empty dependency array means this runs once on mount

  const totalCount = movies.length; // This will now be 20 (or less if fewer were fetched)
  const progress = totalCount > 0 ? ((currentIndex + 1) / totalCount) * 100 : 0;
  const currentMovie = movies[currentIndex];

  const handleNextMovie = useCallback(() => {
    setIsDescriptionVisible(false); // Hide description for next movie
    if (currentIndex < movies.length - 1) {
      setCurrentIndex(prevIndex => prevIndex + 1);
    } else {
      console.log('[CLIENT] All movies voted, setting waitingForOthers to true');
      setWaitingForOthers(true);
    }
  }, [currentIndex, movies.length]);

  const handleLike = useCallback(() => {
    if (socket && roomId && currentMovie) {
      console.log('[CLIENT] Emitting submitVote (like):', { roomId, movieId: currentMovie.id, vote: 'like' });
      socket.emit('submitVote', { roomId, movieId: currentMovie.id, vote: 'like' });
    }
    console.log('[CLIENT] handleNextMovie called (like)');
    handleNextMovie();
  }, [socket, roomId, currentMovie, handleNextMovie]);

  const handleDislike = useCallback(() => {
    if (socket && roomId && currentMovie) {
      console.log('[CLIENT] Emitting submitVote (dislike):', { roomId, movieId: currentMovie.id, vote: 'dislike' });
      socket.emit('submitVote', { roomId, movieId: currentMovie.id, vote: 'dislike' });
    }
    console.log('[CLIENT] handleNextMovie called (dislike)');
    handleNextMovie();
  }, [socket, roomId, currentMovie, handleNextMovie]);

  const handleShowDescription = useCallback(() => {
    setIsDescriptionVisible(prev => !prev);
  }, []);

  const restartSession = useCallback(() => {
    setMovies(shuffleArray(allFetchedMovies).slice(0, 20));
    setCurrentIndex(0);
    setLikedMovies([]);
    setShowResults(false);
    setIsDescriptionVisible(false);
  }, [allFetchedMovies]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (showResults) {
      if (event.key === ' ' || event.key === 'Enter') { // Allow restart from results with Space/Enter
        event.preventDefault();
        restartSession();
      }
      return;
    }

    switch(event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        handleDislike();
        break;
      case 'ArrowRight':
        event.preventDefault();
        handleLike();
        break;
      case 'ArrowDown':
        event.preventDefault();
        handleShowDescription();
        break;
      case ' ':
      case 'Enter': // Assuming space or enter might be used for restart if no other primary action
        // This was 'restart' in the original, but there's no always-visible restart button
        // We can map it to 'like' or another action if preferred, or keep for a potential future restart button
        // For now, let's make space also like the movie if not showing results
        event.preventDefault();
        handleLike(); 
        break;
    }
  }, [handleDislike, handleLike, handleShowDescription, restartSession, showResults]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (isLoading) {
    return <div className="app-container"><p>Filme werden geladen...</p></div>;
  }

  if (error) {
    return <div className="app-container"><p>Fehler beim Laden der Filme: {error}</p></div>;
  }

  if (movies.length === 0 && !isLoading) {
    return <div className="app-container"><p>Keine Filme gefunden. Versuchen Sie es später erneut.</p></div>;
  }

  if (!isInRoom) {
    return <Lobby 
        userName={userName} 
        setUserName={setUserName} 
        handleCreateRoom={handleCreateRoom} 
        handleJoinRoom={handleJoinRoom} 
    />;
  }

  if (isInRoom && !sessionStarted) {
    const isCreator = roomUsers.length > 0 && roomUsers[0].id === socket?.id;
    return <Room 
        roomId={roomId} 
        users={roomUsers} 
        isCreator={isCreator}
        handleLeaveRoom={handleLeaveRoom} 
        handleStartSession={handleStartSession} 
    />;
  }

  if (waitingForOthers) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Warte auf andere Nutzer...</h2>
        <p>Du hast alle Filme bewertet. Bitte warte, bis alle anderen Nutzer fertig sind.</p>
        <div className="loader" style={{ margin: '30px auto', width: '60px', height: '60px', border: '8px solid #eee', borderTop: '8px solid #2196f3', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (showResults) {
    return (
        <div className="app-container results-container" lang="de">
            <h3>🎉 Perfekte Matches gefunden!</h3>
            <div id="matched-movies">
              {matchedMovies.length === 0 ? (
                <>
                  <p>😕 Keine gemeinsamen Film-Matches gefunden.</p>
                  <p>Startet eine neue Runde, um es erneut zu versuchen!</p>
                </>
              ) : (
                <>
                  <p>Ihr habt euch auf <strong>{matchedMovies.length}</strong> Film(e) geeinigt:</p>
                  <div className="liked-movies-grid" style={{ marginTop: '15px' }}>
                    {matchedMovies.map(movie => (
                      <div key={movie.id} className="liked-movie-item" style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', margin: '10px', borderRadius: '10px', textAlign: 'center' }}>
                        <img 
                          src={movie.poster} 
                          alt={movie.title} 
                          style={{ width: '100px', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '5px' }} 
                          onError={(e) => (e.currentTarget.src = '/placeholder-brain.png')}
                        />
                        <strong style={{ display: 'block', color: '#fff' }}>{movie.title}</strong> 
                        <span style={{ fontSize: '0.9em', color: '#ccc' }}>({movie.year})</span>
                        <br />
                        <small style={{ fontSize: '0.8em', color: '#bbb' }}>{movie.genre.join(', ')}</small>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button id="restart" className="restart-btn" onClick={restartSession}>🔄 Neue Runde starten</button>
        </div>
    );
  }

  let statusColor = '#aaa', statusText = '';
  if (connectionStatus === 'connected') { statusColor = '#28a745'; statusText = 'Verbunden'; }
  else if (connectionStatus === 'disconnected') { statusColor = '#dc3545'; statusText = 'Getrennt'; }
  else if (connectionStatus === 'error') { statusColor = '#ff9800'; statusText = 'Fehler'; }

  return (
    <div lang="de" role="main">
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, display: 'flex', alignItems: 'center' }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: statusColor, display: 'inline-block', marginRight: 8, border: '1px solid #222' }}></span>
        <span style={{ color: statusColor, fontWeight: 600 }}>{statusText}</span>
      </div>
      <div className="app-container">
        {!showResults ? (
          <>
            {currentMovie && (
              <>
                <div className="session-info">
                  <div>Film <span id="current-count">{currentIndex + 1}</span> von <span id="total-count">{totalCount}</span></div>
                  <div className="progress-bar">
                    <div className="progress" id="progress" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                <div className="card-container">
                  <div className='movie-card active'>
                    <div className="movie-poster">
                      {/* Updated to use currentMovie.poster which is now a full URL or placeholder */}
                      <img src={currentMovie.poster} alt={currentMovie.title} onError={(e) => (e.currentTarget.src = '/placeholder-brain.png')} />
                    </div>
                    <div className="movie-content">
                      <h2>{currentMovie.title}</h2>
                      <div className="movie-meta">
                        <span>{currentMovie.year}</span>
                        {/* Now displays actual genre names */}
                        {currentMovie.genre.map(g => <span key={g} className="genre">{g}</span>)}
                      </div>
                      {/* Make description scrollable - CSS will handle this */}
                      {isDescriptionVisible && 
                        <div className="description visible" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                          {currentMovie.description}
                        </div>
                      }
                    </div>
                  </div>
                </div>

                <div className="button-container">
                  <button id="dislike" className="btn-dislike" onClick={handleDislike}>👎 Nein</button>
                  <button id="show-description" onClick={handleShowDescription}>
                    {isDescriptionVisible ? "🙈 Info Aus" : "ℹ️ Info Ein"}
                  </button>
                  <button id="like" className="btn-like" onClick={handleLike}>👍 Ja</button>
                </div>
              </>
            )}
            {!currentMovie && totalCount > 0 && <p>Lade nächsten Film...</p>}
            {totalCount === 0 && <p>Keine Filme zum Anzeigen vorhanden.</p>}
          </>
        ) : (
          <div className="results-container show" id="results">
            <h3>🎉 Perfekte Matches gefunden!</h3>
            <div id="matched-movies">
              {likedMovies.length === 0 ? (
                <>
                  <p>😕 Keine Filme gefunden, die dir gefallen haben.</p>
                  <p>Vielleicht beim nächsten Mal!</p>
                </>
              ) : (
                <>
                  <p>Du hast <strong>{likedMovies.length}</strong> Film(e) ausgewählt:</p>
                  <div className="liked-movies-grid" style={{ marginTop: '15px' }}>
                    {likedMovies.map(movie => (
                      <div key={movie.id} className="liked-movie-item" style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', margin: '10px', borderRadius: '10px', textAlign: 'center' }}>
                        <img 
                          src={movie.poster} 
                          alt={movie.title} 
                          style={{ width: '100px', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '5px' }} 
                          onError={(e) => (e.currentTarget.src = '/placeholder-brain.png')}
                        />
                        <strong style={{ display: 'block', color: '#fff' }}>{movie.title}</strong> 
                        <span style={{ fontSize: '0.9em', color: '#ccc' }}>({movie.year})</span>
                        <br />
                        <small style={{ fontSize: '0.8em', color: '#bbb' }}>{movie.genre.join(', ')}</small>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button id="restart" className="restart-btn" onClick={restartSession}>🔄 Neue Runde starten</button>
          </div>
        )}
      </div>
    </div>
  );
};



// Make sure this is the ONLY default export in the entire file
export default FilmBoxApp;