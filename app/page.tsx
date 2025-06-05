import FilmBoxApp from './FilmBoxApp';

export default function HomePage() {
  return (
    <main>
      <FilmBoxApp />
      <footer>
        © {new Date().getFullYear()} FilmBox
      </footer>
    </main>
  );
}