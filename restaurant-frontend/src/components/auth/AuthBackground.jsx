// src/components/auth/AuthBackground.jsx
export default function AuthBackground({ children }) {
  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: "url('/background4.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
}