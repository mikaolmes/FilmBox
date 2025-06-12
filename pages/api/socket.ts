import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';

// Define the MovieForRoom interface if you're using it in socket events
interface MovieForRoom {
  id: number;
  title: string;
  // ... other relevant movie properties
}

// This is the crucial part: We augment the existing HttpServer type
// to tell TypeScript that our server instance might have an 'io' property.
interface ExtendedHttpServer extends HttpServer {
  io?: SocketIOServer;
}

// And we use this augmented type for the server property within the socket object.
interface NextApiResponseWithSocket extends NextApiResponse {
  socket: NextApiResponse['socket'] & { // Intersect with the original socket type
    server: ExtendedHttpServer;
  };
}

const rooms: Record<string, any> = {}; // Example: Store room data

export default function SocketHandler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    // The 'as any' here might be acceptable if the type augmentation above is correctly picked up.
    // Or, more strictly, ensure res.socket.server is treated as ExtendedHttpServer.
    const httpServer = res.socket.server as ExtendedHttpServer;
    const io = new SocketIOServer(httpServer, {
      path: '/api/socket_io',
      addTrailingSlash: false,
      // Optional: Configure CORS if your client is on a different port during development
      cors: {
        origin: "*", // Be more specific in production
        methods: ["GET", "POST"]
      }
    });
    httpServer.io = io; // Assign the io instance to our augmented server type

    io.on('connection', (socket: Socket) => {
      console.log(`Socket connected: ${socket.id}`);

      socket.on('createRoom', ({ movies }: { movies: MovieForRoom[] }) => {
        const roomId = Math.random().toString(36).substring(2, 8); // Generate a simple room ID
        rooms[roomId] = {
          users: [socket.id],
          movies: movies, // The initial 20 movies for the room
          votes: {}, // { movieId: { userId: 'like'/'dislike' } }
          userStates: { [socket.id]: { currentIndex: 0, likedMovies: [] } } // Track individual progress
        };
        socket.join(roomId);
        socket.emit('roomCreated', { roomId, movies }); // Send movies to creator
        console.log(`Room ${roomId} created by ${socket.id} with ${movies.length} movies`);
      });

      socket.on('joinRoom', ({ roomId }: { roomId: string }) => {
        if (rooms[roomId]) {
          if (!rooms[roomId].users.includes(socket.id)) {
            rooms[roomId].users.push(socket.id);
            rooms[roomId].userStates[socket.id] = { currentIndex: 0, likedMovies: [] };
          }
          socket.join(roomId);
          // Send the existing room movies to the joining user
          socket.emit('roomJoined', { roomId, movies: rooms[roomId].movies, users: rooms[roomId].users.length });
          io.to(roomId).emit('userJoined', { userId: socket.id, userCount: rooms[roomId].users.length });
          console.log(`User ${socket.id} joined room ${roomId}. Total users: ${rooms[roomId].users.length}`);
        } else {
          socket.emit('error', { message: 'Room not found' });
        }
      });

      socket.on('vote', ({ roomId, movieId, voteType }: { roomId: string; movieId: number; voteType: 'like' | 'dislike' }) => {
        if (rooms[roomId] && rooms[roomId].userStates[socket.id]) {
          const userState = rooms[roomId].userStates[socket.id];
          if (voteType === 'like') {
            userState.likedMovies.push(movieId);
          }
          userState.currentIndex++;

          // Store the vote (optional, if you need to track individual votes beyond just liked movies)
          if (!rooms[roomId].votes[movieId]) rooms[roomId].votes[movieId] = {};
          rooms[roomId].votes[movieId][socket.id] = voteType;

          console.log(`User ${socket.id} in room ${roomId} voted ${voteType} for movie ${movieId}. New index: ${userState.currentIndex}`);

          // Check if all users have voted on all movies or this user has finished
          const roomMoviesCount = rooms[roomId].movies.length;
          if (userState.currentIndex >= roomMoviesCount) {
            socket.emit('votingFinished', { likedMovies: userState.likedMovies });
            console.log(`User ${socket.id} finished voting in room ${roomId}.`);
          }

          // Check if all users in the room have finished
          let allFinished = true;
          for (const userId of rooms[roomId].users) {
            if (rooms[roomId].userStates[userId].currentIndex < roomMoviesCount) {
              allFinished = false;
              break;
            }
          }

          if (allFinished) {
            console.log(`All users in room ${roomId} have finished voting.`);
            // Calculate common liked movies
            const allLikedMoviesInRoom: Record<number, number> = {};
            rooms[roomId].users.forEach((userId: string) => {
              rooms[roomId].userStates[userId].likedMovies.forEach((likedMovieId: number) => {
                allLikedMoviesInRoom[likedMovieId] = (allLikedMoviesInRoom[likedMovieId] || 0) + 1;
              });
            });

            const commonLikedMovieIds = Object.entries(allLikedMoviesInRoom)
              .filter(([_, count]) => count === rooms[roomId].users.length)
              .map(([movieId, _]) => parseInt(movieId));
            
            const commonMovies = rooms[roomId].movies.filter((movie: MovieForRoom) => commonLikedMovieIds.includes(movie.id));

            io.to(roomId).emit('allUsersFinished', { commonMovies });
            console.log(`Room ${roomId} results (common movies):`, commonMovies);
          }
        } else {
          socket.emit('error', { message: 'Room or user state not found for voting.' });
        }
      });
      
      socket.on('resetRoom', ({ roomId, movies }: { roomId: string; movies: MovieForRoom[] }) => {
        if (rooms[roomId]) {
          rooms[roomId].movies = movies; // Reset with new movies
          rooms[roomId].votes = {};
          rooms[roomId].users.forEach((userId: string) => {
            rooms[roomId].userStates[userId] = { currentIndex: 0, likedMovies: [] };
          });
          io.to(roomId).emit('roomReset', { movies }); // Notify all users in the room
          console.log(`Room ${roomId} has been reset with new movies.`);
        } else {
          socket.emit('error', { message: 'Room not found for reset.' });
        }
      });

      socket.on('leaveRoom', (roomId: string) => {
        if (rooms[roomId]) {
          socket.leave(roomId);
          rooms[roomId].users = rooms[roomId].users.filter((id: string) => id !== socket.id);
          delete rooms[roomId].userStates[socket.id];
          if (rooms[roomId].users.length === 0) {
            delete rooms[roomId]; // Delete room if empty
            console.log(`Room ${roomId} deleted as it's empty.`);
          } else {
            io.to(roomId).emit('userLeft', { userId: socket.id, userCount: rooms[roomId].users.length });
            console.log(`User ${socket.id} left room ${roomId}. Remaining users: ${rooms[roomId].users.length}`);
          }
        }
      });

      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        // Handle user leaving rooms they were in
        for (const roomId in rooms) {
          if (rooms[roomId].users.includes(socket.id)) {
            rooms[roomId].users = rooms[roomId].users.filter((id: string) => id !== socket.id);
            delete rooms[roomId].userStates[socket.id];
            if (rooms[roomId].users.length === 0) {
              delete rooms[roomId];
              console.log(`Room ${roomId} deleted due to user disconnect.`);
            } else {
              io.to(roomId).emit('userLeft', { userId: socket.id, userCount: rooms[roomId].users.length });
              console.log(`User ${socket.id} auto-left room ${roomId} on disconnect. Remaining users: ${rooms[roomId].users.length}`);
            }
          }
        }
      });
    });
  }
  res.end();
}