# 🚀 WorkShip

### Discover. Compare. Book. Work.

WorkShip is a full-stack workspace discovery and booking platform designed for people who need a reliable place to work outside their home.

Instead of searching across multiple platforms for cafés, coworking spaces, private offices, and other workspaces, WorkShip brings discovery, intelligent search, location-based exploration, booking, recommendations, and communication into one platform.

---

## 🌟 Why WorkShip?

As someone who does freelance work, I often needed a quiet and reliable place to work outside my home. Cafés could be noisy, libraries had restrictions, and finding a suitable coworking space within my budget often required checking multiple sources.

That led to a simple question:

> **If platforms like Airbnb exist for accommodation, why isn't there a similar platform dedicated to workspaces?**

WorkShip was built around that idea.

The platform allows users to discover workspaces based on their **location, budget, workspace type, amenities, availability, and personal preferences**, while hosts can list and manage their own spaces.

---

## ✨ Features

### 👤 User Features

- 🔐 Secure authentication using JWT
- 📝 User registration and login
- 🔑 Forgot password using OTP-based email verification
- 🔍 Workspace search and filtering
- 🤖 AI-powered natural-language search
- 🧠 Personalized workspace recommendations
- 📍 Interactive workspace maps
- ❤️ Wishlist functionality
- 📅 Workspace booking
- 📖 Booking history
- 💬 Real-time chat with hosts
- 📱 Responsive user interface

---

### 🏢 Host Features

- 🏠 Create and manage workspace listings
- ✏️ Edit workspace details
- 🗑️ Delete listings
- 🖼️ Upload workspace images
- 💰 Set workspace pricing
- 📍 Add workspace location
- 📅 Manage workspace availability
- 📋 View bookings
- 💬 Communicate with users in real time
- 📊 Host dashboard

---

### 🤖 Smart Search & Recommendations

WorkShip goes beyond traditional keyword-based searching.

Users can describe what they need naturally, for example:

> "I need a quiet workspace near college with Wi-Fi and a budget of ₹200 per hour."

The platform can use this information to provide more relevant workspace results.

The recommendation system also uses user activity/preferences when available to provide personalized recommendations.

For users without enough history, the system falls back to trending/popular workspaces.

---

### 💬 Real-Time Communication

WorkShip uses **Socket.IO** for real-time communication between users and hosts.

Each conversation is associated with a dedicated conversation room.

This allows:

- Real-time message delivery
- Conversation-specific communication
- Typing indicators
- Persistent chat history
- Message synchronization

Messages are stored in MongoDB for persistence while Socket.IO handles real-time delivery.

---

### 📍 Maps & Location

WorkShip integrates **OpenStreetMap** and **Leaflet** to provide interactive workspace maps.

The workspace address is converted into geographic coordinates using geocoding.

The coordinates are then stored with the workspace and used to display its location on an interactive map.

---

## 🏗️ System Architecture

WorkShip currently follows a **modular monolithic architecture**.

```text
                         ┌─────────────────────┐
                         │       User          │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   React Frontend    │
                         │ TypeScript + Vite   │
                         │ Tailwind CSS        │
                         └──────────┬──────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     │                             │
                 REST API                    Socket.IO
                     │                             │
                     ▼                             ▼
          ┌─────────────────────────────────────────────┐
          │            Node.js + Express                │
          │                                             │
          │  ┌────────────┐    ┌────────────────────┐  │
          │  │    Auth    │    │ Workspace Management│ │
          │  └────────────┘    └────────────────────┘  │
          │                                             │
          │  ┌────────────┐    ┌────────────────────┐  │
          │  │  Booking   │    │ Recommendation     │  │
          │  └────────────┘    │ & Smart Search     │  │
          │                    └────────────────────┘  │
          │                                             │
          │  ┌────────────┐    ┌────────────────────┐  │
          │  │  Wishlist  │    │ Real-Time Chat     │  │
          │  └────────────┘    └────────────────────┘  │
          └───────────────────────┬─────────────────────┘
                                  │
                                  ▼
                         ┌─────────────────────┐
                         │    MongoDB Atlas    │
                         └─────────────────────┘

        External Services
        ┌──────────────────────────────────────────────┐
        │                                              │
        │  OpenStreetMap + Leaflet → Maps & Location  │
        │  Cloudinary              → Image Storage    │
        │  Email Service           → OTP / Password   │
        │  Geocoding Service       → Coordinates      │
        │                                              │
        └──────────────────────────────────────────────┘
