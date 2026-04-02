import { useState, useEffect } from 'react'
import MatrixRain from './components/MatrixRain'
import Login from './components/Login'
import Register from './components/Register'
import Chat from './components/Chat'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [isLogin, setIsLogin] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('user')
    if (saved) {
      setUser(JSON.parse(saved))
    }
  }, [])

  const handleAuth = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <div className="app">
      {!user && <MatrixRain />}
      <div className="scanlines" />

      {!user ? (
        isLogin ? (
          <Login onSwitch={() => setIsLogin(false)} onAuth={handleAuth} />
        ) : (
          <Register onSwitch={() => setIsLogin(true)} onAuth={handleAuth} />
        )
      ) : (
        <Chat user={user} onLogout={handleLogout} />
      )}
    </div>
  )
}

export default App
