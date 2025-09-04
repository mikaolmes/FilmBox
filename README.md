# 🎬 FilmBox

**FilmBox** is a collaborative movie recommendation web application that helps groups of friends decide what to watch together. Using a Tinder-like voting interface, users can vote on movies in real-time and discover films that everyone will enjoy.

## ✨ Features

- **🏠 Room-based Multiplayer**: Create or join rooms with friends using simple room IDs
- **🎭 Movie Voting**: Swipe-like interface to like or dislike movies
- **🎯 Smart Matching**: Find movies that all participants liked
- **⚡ Real-time Sync**: Live updates using Socket.io for seamless collaboration  
- **🎬 Rich Movie Data**: Movie posters, descriptions, genres, and ratings from TMDB
- **🌍 German Interface**: Localized user interface in German
- **📱 Responsive Design**: Works on desktop and mobile devices

## 🎮 How to Use

1. **Start a Session**: 
   - Enter your username (optional)
   - Create a new room or join existing one with room ID

2. **Vote on Movies**:
   - View movie poster, title, year, and genres
   - Press ℹ️ to see movie description
   - Click 👍 (Ja) to like or 👎 (Nein) to dislike
   - Use keyboard shortcuts: ← (dislike), → (like), ↓ (show description)

3. **Get Results**:
   - Wait for all participants to finish voting
   - See movies that everyone liked
   - Start a new round with fresh movies

## 🛠️ Technical Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: TailwindCSS
- **Real-time**: Socket.io
- **Movie Data**: TMDB (The Movie Database) API
- **Build Tools**: ESLint, PostCSS

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- TMDB API key (free registration at [themoviedb.org](https://www.themoviedb.org/))

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mikaolmes/FilmBox.git
   cd FilmBox
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   Create `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 🎯 API Integration

FilmBox integrates with The Movie Database (TMDB) API to fetch:
- Popular movies with posters and metadata
- Movie genres and descriptions
- High-quality movie images

Get your free API key at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)

## 🏗️ Project Structure

```
FilmBox/
├── app/                    # Next.js app directory
│   ├── FilmBoxApp.tsx     # Main application component
│   ├── Lobby.tsx          # Room creation/joining interface
│   ├── Room.tsx           # Pre-session room management
│   └── page.tsx           # Root page component
├── pages/api/             # API routes
│   └── socket.ts          # Socket.io server configuration
└── public/                # Static assets
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎬 About

FilmBox makes group movie selection fun and democratic. No more endless debates about what to watch - let everyone vote and find movies you'll all enjoy!
