import { useState } from "react";

export default function TestPage() {
  const [count, setCount] = useState(0);
  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>
        React Test Page
      </h1>
      <p style={{ marginBottom: "12px", color: "#666" }}>
        If you can see this, React is mounting correctly.
      </p>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{
          padding: "8px 24px",
          background: "#6366f1",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Count: {count}
      </button>
    </div>
  );
}
