import React from 'react';
import MakeupTryOn from './components/MakeupTryOn';
import './styles/App.css';

function App() {
  return (
      <div className="App">
        <header className="App-header">
          <h1>Virtual Makeup Try-On</h1>
        </header>
        <main>
          <MakeupTryOn />
        </main>
        <footer>
          <p>Virtual Makeup Try-On POC</p>
        </footer>
      </div>
  );
}

export default App;
