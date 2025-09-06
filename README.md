# 🎬 FilmBox

**FilmBox** is a collaborative movie discovery application that helps groups of friends find the perfect movie to watch together. Users can create or join rooms, swipe through movie recommendations together, and discover films that everyone in the group likes.

## ✨ Features

### 🏠 **Room-Based Collaboration**
- Create private rooms with shareable room IDs
- Join existing rooms using room codes
- Real-time user management with Socket.IO
- Host controls for starting sessions

### 🎭 **Movie Discovery**
- Integration with The Movie Database (TMDB) API
- 20 curated movies per session from popular films
- Rich movie information including posters, genres, descriptions, and ratings
- German language support (de-DE)

### 👍 **Interactive Voting System**
- Tinder-style swipe interface for movie selection
- Like/dislike voting with keyboard shortcuts
- Real-time vote synchronization across all users
- Progress tracking for each user

### 🎯 **Smart Matching**
- Algorithm to find movies liked by ALL users in the room
- Beautiful results display with matched films
- Host-controlled session restart functionality

### 🎨 **Modern UI/UX**
- Responsive design with glassmorphism effects
- Beautiful gradient backgrounds
- Smooth animations and transitions
- Mobile-friendly interface
- Keyboard navigation support

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- NPM or Yarn
- TMDB API Key (free from [themoviedb.org](https://www.themoviedb.org/settings/api))

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mikaolmes/FilmBox.git
   cd FilmBox
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Visit [http://localhost:3000](http://localhost:3000)

## 🎮 How to Use

### 1. **Enter the Lobby**
- Set your username (optional, auto-generated if empty)
- Choose to create a new room or join an existing one

### 2. **Room Management**
- **Host**: Create a room and share the generated room ID
- **Guests**: Join using a room ID
- Wait for all participants to join

### 3. **Movie Session**
- Host starts the session when ready
- All users see the same 20 movies in randomized order
- Vote on each movie: 👍 (Like) or 👎 (Dislike)
- Wait for all users to complete their voting

### 4. **Results & Matching**
- View movies that ALL users liked
- Host can start a new session with fresh movies

### 🎯 **Keyboard Controls**
- `←` (Left Arrow): Dislike current movie
- `→` (Right Arrow): Like current movie  
- `↓` (Down Arrow): Toggle movie description
- `Space` or `Enter`: Like movie (during voting) / Restart session (on results, host only)

## 🛠️ Tech Stack

### **Frontend**
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety and better development experience
- **Tailwind CSS** - Utility-first CSS framework
- **React Hooks** - Modern state management

### **Backend & Real-time**
- **Socket.IO** - Real-time bidirectional communication
- **Next.js API Routes** - Serverless backend functions
- **In-memory data storage** - Room and vote management

### **External APIs**
- **TMDB (The Movie Database)** - Movie data, posters, and metadata

### **Development Tools**
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **TypeScript** - Static type checking

## 🔧 Configuration

### **Environment Variables**
| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_TMDB_API_KEY` | Your TMDB API key for fetching movie data | ✅ Yes |

### **TMDB API Setup**
1. Visit [TMDB](https://www.themoviedb.org/)
2. Create a free account
3. Go to Settings → API
4. Request an API key (choose "Developer" option)
5. Copy your API key to `.env.local`

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [The Movie Database (TMDB)](https://www.themoviedb.org/) for providing the movie API
- [Next.js](https://nextjs.org/) for the amazing React framework
- [Socket.IO](https://socket.io/) for real-time communication
- [Tailwind CSS](https://tailwindcss.com/) for the styling system


**Made with ❤️ for movie lovers who can't decide what to watch!**
