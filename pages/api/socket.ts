import { Server as SocketIOServer, Socket } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as HttpServer } from 'http';

// Interfaces from the client
interface Movie {
  id: number;
  title: string;
  year: number;
  genre: string[];
  description: string;
  poster: string;
}

interface RoomUser {
  id: string; // socket.id
  name: string;
}

interface Room {
  id: string;
  users: RoomUser[];
  movies: Movie[];
  votes: Record<number, { likes: string[], dislikes: string[] }>; // { movieId: { likes: [userId1, userId2], dislikes: [userId1, userId2] } }
}

// In-memory store for rooms
const rooms = new Map<string, Room & { finishedUsers?: string[] }>();

// Type augmentation for Next.js API response
interface NextApiResponseWithSocket extends NextApiResponse {
  socket: NextApiResponse['socket'] & {
    server: HttpServer & {
      io?: SocketIOServer;
    };
  };
}

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  console.log('SERVER SOCKET HANDLER LOADED');
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*', // In production, you should restrict this to your domain
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['polling', 'websocket']
    });
    res.socket.server.io = io;

    io.on('connection', (socket: Socket) => {
      console.log(`A user connected: ${socket.id}`);
      socket.onAny((event, ...args) => {
        console.log('[SOCKET EVENT]', event, args);
      });

      socket.on('createRoom', ({ userName }: { userName: string }) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const user: RoomUser = { id: socket.id, name: userName };

        const newRoom: Room = {
          id: roomId,
          users: [user],
          movies: [], // Movies will be synced later
          votes: {},
        };
        rooms.set(roomId, newRoom);

        socket.join(roomId);
        console.log(`User ${userName} (${socket.id}) created and joined room ${roomId}`);

        // Instead of emitting here, we'll fetch movies and then emit.
        // This logic will be moved to handleStartSession
        socket.emit('roomCreated', { roomId, user });
        socket.emit('roomState', rooms.get(roomId));
      });

      socket.on('joinRoom', ({ roomId, userName }: { roomId: string; userName: string }) => {
        const room = rooms.get(roomId.toUpperCase());
        if (room) {
          const user: RoomUser = { id: socket.id, name: userName };
          if (!room.users.find(u => u.id === socket.id)) {
            room.users.push(user);
          }
          rooms.set(roomId, room);

          socket.join(roomId);
          console.log(`User ${userName} (${socket.id}) joined room ${roomId}`);

          io.to(roomId).emit('userJoined', user);
          socket.emit('roomState', room);
        } else {
          socket.emit('roomNotFound', 'Room not found.');
        }
      });

      socket.on('startSession', async ({ roomId }: { roomId: string }) => {
        const room = rooms.get(roomId);
        if (room && room.users[0].id === socket.id) { // Only creator can start
          // Fetch movies from TMDB (or use a cached list)
          // This is a simplified example. In a real app, you'd use a proper API helper.
          const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
          const randomPage = Math.floor(Math.random() * 10) + 1; // 1-10
          console.log(`[startSession] Fetching TMDB popular movies, page ${randomPage}`);
          const movieResponse = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=de-DE&page=${randomPage}`);
          const movieData = await movieResponse.json();
          const genreResponse = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=de-DE`);
          const genreData = await genreResponse.json();
          const genresMap = new Map<number, string>(genreData.genres.map((g: any) => [g.id, g.name]));

          const movies: Movie[] = movieData.results.slice(0, 20).map((tmdbMovie: any) => ({
            id: tmdbMovie.id,
            title: tmdbMovie.title,
            year: parseInt(tmdbMovie.release_date?.split('-')[0] || "0"),
            genre: tmdbMovie.genre_ids.map((id: number) => genresMap.get(id) || `ID ${id}`).slice(0, 3),
            description: tmdbMovie.overview,
            poster: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : "/placeholder-brain.png",
          }));

          room.movies = movies;
          room.votes = {}; // Reset votes for new session
          room.finishedUsers = []; // Reset finished users for new session
          rooms.set(roomId, room);

          io.to(roomId).emit('sessionStarted', { movies });
        }
      });

      socket.on('submitVote', ({ roomId, movieId, vote }: { roomId: string; movieId: number; vote: 'like' | 'dislike' }) => {
        const room = rooms.get(roomId);
        if (room) {
          if (!room.votes[movieId]) {
            room.votes[movieId] = { likes: [], dislikes: [] };
          }
          // Remove from both arrays first (in case of re-vote)
          room.votes[movieId].likes = room.votes[movieId].likes.filter(id => id !== socket.id);
          room.votes[movieId].dislikes = room.votes[movieId].dislikes.filter(id => id !== socket.id);
          if (vote === 'like') {
            room.votes[movieId].likes.push(socket.id);
          } else {
            room.votes[movieId].dislikes.push(socket.id);
          }
        }

        // Track if this user has voted on all movies (regardless of like/dislike)
        const userVotedMoviesCount = Object.values(room?.votes || {}).filter(voteObj => 
          voteObj.likes.includes(socket.id) || voteObj.dislikes.includes(socket.id)
        ).length;
        
        if (room && userVotedMoviesCount === room.movies.length) {
          // Mark this user as finished
          if (!room.finishedUsers) room.finishedUsers = [];
          if (!room.finishedUsers.includes(socket.id)) {
            room.finishedUsers.push(socket.id);
          }
          console.log(`[submitVote] Room ${roomId}: User ${socket.id} finished voting. Finished users:`, room.finishedUsers, 'All users:', room.users.map(u => u.id));
          // If all users are finished, emit sessionEnded to all
          if (room.finishedUsers.length === room.users.length) {
            const matchedMovies = room.movies.filter(movie => 
              room.votes[movie.id] && room.votes[movie.id].likes.length === room.users.length
            );
            // Emit to all users in the room
            console.log(`[submitVote] Room ${roomId}: All users finished. Emitting sessionEnded with ${matchedMovies.length} matches.`);
            io.to(roomId).emit('sessionEnded', { matchedMovies });
          }
        }
      });

      socket.on('leaveRoom', ({ roomId }: { roomId: string }) => {
        const room = rooms.get(roomId);
        if (room) {
          socket.leave(roomId);
          room.users = room.users.filter(user => user.id !== socket.id);
          if (room.finishedUsers) {
            room.finishedUsers = room.finishedUsers.filter(id => id !== socket.id);
          }
          console.log(`[leaveRoom] Room ${roomId}: User ${socket.id} left. Remaining users:`, room.users.map(u => u.id), 'Finished users:', room.finishedUsers);
          
          if (room.users.length === 0) {
            rooms.delete(roomId);
            console.log(`Room ${roomId} is empty and has been deleted.`);
          } else {
            rooms.set(roomId, room);
            io.to(roomId).emit('userLeft', socket.id);
            console.log(`User ${socket.id} left room ${roomId}`);
          }
        }
      });

      socket.on('disconnect', () => {
        console.log(`[disconnect] User ${socket.id} disconnected.`);
        rooms.forEach((room, roomId) => {
          const userIndex = room.users.findIndex(user => user.id === socket.id);
          if (userIndex !== -1) {
            room.users.splice(userIndex, 1);
            if (room.finishedUsers) {
              room.finishedUsers = room.finishedUsers.filter(id => id !== socket.id);
            }
            console.log(`[disconnect] Room ${roomId}: User ${socket.id} removed. Remaining users:`, room.users.map(u => u.id), 'Finished users:', room.finishedUsers);
            if (room.users.length === 0) {
              rooms.delete(roomId);
              console.log(`Room ${roomId} deleted after user disconnect.`);
            } else {
              rooms.set(roomId, room);
              io.to(roomId).emit('userLeft', socket.id);
              console.log(`User ${socket.id} was removed from room ${roomId} on disconnect.`);
            }
          }
        });
      });

      socket.on('restartSession', async ({ roomId }: { roomId: string }) => {
        const room = rooms.get(roomId);
        if (room && room.users[0].id === socket.id) {
          const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
          const randomPage = Math.floor(Math.random() * 10) + 1; // 1-10
          console.log(`[restartSession] Host ${socket.id} restarting session for room ${roomId}, page ${randomPage}`);
          const movieResponse = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=de-DE&page=${randomPage}`);
          const movieData = await movieResponse.json();
          const genreResponse = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=de-DE`);
          const genreData = await genreResponse.json();
          const genresMap = new Map<number, string>(genreData.genres.map((g: any) => [g.id, g.name]));

          const movies: Movie[] = movieData.results.slice(0, 20).map((tmdbMovie: any) => ({
            id: tmdbMovie.id,
            title: tmdbMovie.title,
            year: parseInt(tmdbMovie.release_date?.split('-')[0] || "0"),
            genre: tmdbMovie.genre_ids.map((id: number) => genresMap.get(id) || `ID ${id}`).slice(0, 3),
            description: tmdbMovie.overview,
            poster: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : "/placeholder-brain.png",
          }));

          room.movies = movies;
          room.votes = {};
          room.finishedUsers = [];
          rooms.set(roomId, room);

          io.to(roomId).emit('sessionStarted', { movies });
        }
      });
    });
  }
  res.end();
};

export default SocketHandler;