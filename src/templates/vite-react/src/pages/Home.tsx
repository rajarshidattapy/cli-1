import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="container">
      <h1>{{PROJECT_NAME}}</h1>
      <p>Your Unlayer email editor is ready!</p>
      <Link to="/editor" className="btn">
        Open Email Editor
      </Link>
      <div className="links">
        <a href="https://docs.unlayer.com" target="_blank" rel="noopener noreferrer">
          Documentation
        </a>
        <a href="https://examples.unlayer.com" target="_blank" rel="noopener noreferrer">
          Examples
        </a>
      </div>
    </div>
  );
}
