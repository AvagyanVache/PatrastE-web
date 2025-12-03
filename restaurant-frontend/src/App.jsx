import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginScreen from './components/auth/LoginScreen';
import SignupStep1 from './components/auth/SignupStep1';
import SignupStep2 from './components/auth/SignupStep2';

// Optional: if you want a home or test route
// import Home from './components/Home';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* This is your login page — it will show first */}
        <Route path="/" element={<LoginScreen />} />
        
        {/* Signup pages */}
        <Route path="/signup" element={<SignupStep1 />} />
        <Route path="/signup/step2" element={<SignupStep2 />} />
        
        {/* You can add more routes later */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;