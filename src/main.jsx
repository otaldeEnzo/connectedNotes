import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Importa APENAS o nosso estilo.
// Certifica-te que o caminho './styles/global.css' corresponde 
// a onde guardaste o ficheiro de CSS que te dei.
import './styles/global.css' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)