"use client";

import { useEffect } from "react";

export default function Heartbeat() {
  useEffect(() => {
    // Determine backend URL, same as other requests
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
    
    const sendHeartbeat = () => {
      fetch(`${baseUrl}/api/v1/system/heartbeat`, { method: "POST" })
        .catch(err => console.error("Heartbeat failed", err));
    };

    // Send immediately 
    sendHeartbeat();

    // Then every 5 seconds
    const interval = setInterval(sendHeartbeat, 5000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
