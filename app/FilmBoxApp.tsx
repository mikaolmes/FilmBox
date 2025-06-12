// src/components/FilmBoxApp.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';

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

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"; // Base URL for posters

// Helper function to shuffle an array (Fisher-Yates shuffle)
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; // Swap elements
  }
  return newArray;
}

const FilmBoxApp: React.FC = () => {
  const [allFetchedMovies, setAllFetchedMovies] = useState<Movie[]>([]); // Store all movies fetched
  const [movies, setMovies] = useState<Movie[]>([]); // Current 20 movies for the session
  const [genresMap, setGenresMap] = useState<Map<number, string>>(new Map());
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [likedMovies, setLikedMovies] = useState<Movie[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [isDescriptionVisible, setIsDescriptionVisible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch genres and movies
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
    // Re-shuffle from all fetched movies and take a new set of 20
    if (allFetchedMovies.length > 0) {
        setMovies(shuffleArray(allFetchedMovies).slice(0, 20));
    } else {
        // Optionally, trigger a re-fetch if allFetchedMovies is empty, though initial fetch should handle this.
        // For now, if allFetchedMovies is empty, it implies an initial fetch issue.
        console.warn("Attempted to restart session with no movies in the pool.");
    }
  };

  // Keyboard event handling (useEffect)
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
  // Ensure all dependencies used in handleKeyDown are listed if they can change
  }, [handleDislike, handleLike, handleShowDescription, restartSession, showResults]);

  if (isLoading) {
    return <div className="app-container"><p>Filme werden geladen...</p></div>;
  }

  if (error) {
    return <div className="app-container"><p>Fehler beim Laden der Filme: {error}</p></div>;
  }

  if (movies.length === 0 && !isLoading) {
    return <div className="app-container"><p>Keine Filme gefunden. Versuchen Sie es später erneut.</p></div>;
  }

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

export default FilmBoxApp;