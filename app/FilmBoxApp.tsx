// src/components/FilmBoxApp.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
// You would also import your styles here, e.g.:
// import './FilmBoxApp.css'; // Make sure to create this CSS file

interface Movie {
  id: number;
  title: string;
  year: number;
  genre: string[];
  description: string;
  poster: string; // This can be an emoji or a character for the icon
  image?: string; // Optional: for actual image URLs
}

const initialMovies: Movie[] = [
  {
    id: 1,
    title: "Der Abenteuerfilm",
    year: 2023,
    genre: ["Abenteuer", "Action"],
    description: "Ein spannender Film über eine verlorene Welt und mutige Entdecker.",
    poster: "🗺️",
    image: "/placeholder-brain.png" // Example image path
  },
  {
    id: 2,
    title: "Die Komödie des Jahres",
    year: 2022,
    genre: ["Komödie"],
    description: "Lachen garantiert bei dieser urkomischen Verwechslungsgeschichte.",
    poster: "😂",
    image: "/placeholder-brain.png"
  },
  {
    id: 3,
    title: "Sci-Fi Epos",
    year: 2024,
    genre: ["Science Fiction", "Drama"],
    description: "Eine Reise zu den Sternen, die alles verändert.",
    poster: "🚀",
    image: "/placeholder-brain.png"
  },
  {
    id: 4,
    title: "Das rührende Drama",
    year: 2023,
    genre: ["Drama", "Romanze"],
    description: "Eine Geschichte über Liebe, Verlust und Hoffnung.",
    poster: "😢",
    image: "/placeholder-brain.png"
  },
  {
    id: 5,
    title: "Fantasy-Spektakel",
    year: 2022,
    genre: ["Fantasy", "Abenteuer"],
    description: "Magische Kreaturen und epische Schlachten erwarten dich.",
    poster: "🧙",
    image: "/placeholder-brain.png"
  }
];

const FilmBoxApp: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>(initialMovies);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [likedMovies, setLikedMovies] = useState<Movie[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [isDescriptionVisible, setIsDescriptionVisible] = useState<boolean>(false);

  const totalCount = movies.length;
  const progress = totalCount > 0 ? ((currentIndex + 1) / totalCount) * 100 : 0;
  const currentMovie = movies[currentIndex];

  const handleNextMovie = useCallback(() => {
    setIsDescriptionVisible(false); // Hide description for next movie
    if (currentIndex < movies.length - 1) {
      setCurrentIndex(prevIndex => prevIndex + 1);
    } else {
      setShowResults(true);
    }
  }, [currentIndex, movies.length]);

  const handleLike = () => {
    if (currentMovie) {
      setLikedMovies(prevLikedMovies => [...prevLikedMovies, currentMovie]);
    }
    handleNextMovie();
  };

  const handleDislike = () => {
    handleNextMovie();
  };

  const handleShowDescription = () => {
    setIsDescriptionVisible(prev => !prev);
  };

  const restartSession = () => {
    setCurrentIndex(0);
    setLikedMovies([]);
    setShowResults(false);
    setIsDescriptionVisible(false);
    // Optional: Shuffle movies or fetch new ones
    // setMovies(initialMovies); // Reset to initial set if they could change
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showResults) {
        if (e.key === ' ' || e.key === 'Enter') { // Allow restart from results with Space/Enter
          e.preventDefault();
          restartSession();
        }
        return;
      }

      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handleDislike();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleLike();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleShowDescription();
          break;
        case ' ':
        case 'Enter': // Assuming space or enter might be used for restart if no other primary action
          // This was 'restart' in the original, but there's no always-visible restart button
          // We can map it to 'like' or another action if preferred, or keep for a potential future restart button
          // For now, let's make space also like the movie if not showing results
          e.preventDefault();
          handleLike(); 
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDislike, handleLike, handleShowDescription, restartSession, showResults]); // Add all handlers that are used

  return (
    <div lang="de" role="main">
      <div className="app-container">
        <h1>
          {/* You can add an SVG icon here if you have one */}
          {/* Example: <svg>...</svg> */}
          🎬 FilmBox
        </h1>

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
                      {currentMovie.image ? 
                        <img src={currentMovie.image} alt={currentMovie.title} /> :
                        currentMovie.poster
                      }
                    </div>
                    <div className="movie-content">
                      <h2>{currentMovie.title}</h2>
                      <div className="movie-meta">
                        <span>{currentMovie.year}</span>
                        {currentMovie.genre.map(g => <span key={g} className="genre">{g}</span>)}
                      </div>
                      {isDescriptionVisible && <div className="description visible">{currentMovie.description}</div>}
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
                  <div style={{ textAlign: 'left', marginTop: '15px' }}>
                    {likedMovies.map(movie => (
                      <div key={movie.id} style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', margin: '10px 0', borderRadius: '10px' }}>
                        <strong>{movie.poster} {movie.title}</strong> ({movie.year})
                        <br /><small>{movie.genre.join(', ')}</small>
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

export default FilmBoxApp;