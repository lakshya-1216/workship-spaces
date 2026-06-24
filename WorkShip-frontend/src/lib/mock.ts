import ws1 from "@/assets/ws-1.jpg";
import ws2 from "@/assets/ws-2.jpg";
import ws3 from "@/assets/ws-3.jpg";
import ws4 from "@/assets/ws-4.jpg";
import ws5 from "@/assets/ws-5.jpg";
import ws6 from "@/assets/ws-6.jpg";

export type Workspace = {
  id: string;
  title: string;
  city: string;
  country: string;
  category: string;
  pricePerHour: number;
  rating: number;
  reviewCount: number;
  capacity: number;
  amenities: string[];
  images: string[];
  host: { name: string; avatar: string; superhost: boolean };
  lat: number;
  lng: number;
  description: string;
};

export const categories = [
  { id: "all", label: "All", icon: "Sparkles" },
  { id: "private", label: "Private offices", icon: "DoorClosed" },
  { id: "coworking", label: "Coworking", icon: "Users" },
  { id: "meeting", label: "Meeting rooms", icon: "Presentation" },
  { id: "rooftop", label: "Rooftops", icon: "Sun" },
  { id: "cafe", label: "Café-style", icon: "Coffee" },
  { id: "loft", label: "Lofts", icon: "Building" },
  { id: "studio", label: "Studios", icon: "Mic" },
];

export const workspaces: Workspace[] = [
  {
    id: "ws-1",
    title: "Glasshouse Private Studio",
    city: "Lisbon",
    country: "Portugal",
    category: "private",
    pricePerHour: 12,
    rating: 4.95,
    reviewCount: 184,
    capacity: 2,
    amenities: ["Wi-Fi", "Monitor", "Coffee", "Quiet", "Standing desk"],
    images: [ws1, ws2, ws3],
    host: { name: "Marta", avatar: "https://i.pravatar.cc/120?img=47", superhost: true },
    lat: 38.72, lng: -9.14,
    description:
      "A bright, glass-enclosed private studio designed for deep work. Quiet, fast Wi-Fi, ergonomic chair, and unlimited specialty coffee.",
  },
  {
    id: "ws-2",
    title: "Atelier Coworking Lounge",
    city: "Berlin",
    country: "Germany",
    category: "coworking",
    pricePerHour: 7,
    rating: 4.82,
    reviewCount: 322,
    capacity: 8,
    amenities: ["Wi-Fi", "Phone booths", "Snacks", "Printer", "Lockers"],
    images: [ws2, ws1, ws4],
    host: { name: "Jonas", avatar: "https://i.pravatar.cc/120?img=15", superhost: true },
    lat: 52.52, lng: 13.405,
    description:
      "An airy loft with sofas, communal tables, and a community of designers, writers and engineers. Coffee and pastries on the house.",
  },
  {
    id: "ws-3",
    title: "Skyline Rooftop Desk",
    city: "Mumbai",
    country: "India",
    category: "rooftop",
    pricePerHour: 9,
    rating: 4.88,
    reviewCount: 96,
    capacity: 6,
    amenities: ["Wi-Fi", "Outdoor", "Power", "Shade", "Coffee"],
    images: [ws3, ws6, ws2],
    host: { name: "Aditi", avatar: "https://i.pravatar.cc/120?img=32", superhost: false },
    lat: 19.076, lng: 72.877,
    description:
      "Work above the city. A long communal table on a planted rooftop with string lights and golden-hour views.",
  },
  {
    id: "ws-4",
    title: "Boardroom No. 9",
    city: "New York",
    country: "USA",
    category: "meeting",
    pricePerHour: 28,
    rating: 4.91,
    reviewCount: 58,
    capacity: 12,
    amenities: ["4K Display", "Whiteboard", "Coffee", "AC", "Catering"],
    images: [ws4, ws1, ws2],
    host: { name: "Daniel", avatar: "https://i.pravatar.cc/120?img=12", superhost: true },
    lat: 40.7128, lng: -74.006,
    description:
      "An executive meeting room with seating for 12, premium AV and on-demand catering. Perfect for client pitches.",
  },
  {
    id: "ws-5",
    title: "The Reading Room",
    city: "Paris",
    country: "France",
    category: "cafe",
    pricePerHour: 6,
    rating: 4.78,
    reviewCount: 211,
    capacity: 4,
    amenities: ["Wi-Fi", "Books", "Tea", "Plants", "Quiet"],
    images: [ws5, ws2, ws6],
    host: { name: "Camille", avatar: "https://i.pravatar.cc/120?img=45", superhost: false },
    lat: 48.8566, lng: 2.3522,
    description:
      "A book-lined hideaway near the canal. Bottomless tea, soft jazz, and a no-calls policy.",
  },
  {
    id: "ws-6",
    title: "Brick & Bulb Loft",
    city: "London",
    country: "UK",
    category: "loft",
    pricePerHour: 14,
    rating: 4.86,
    reviewCount: 142,
    capacity: 10,
    amenities: ["Wi-Fi", "Projector", "Coffee", "Vinyl", "Bike storage"],
    images: [ws6, ws2, ws3],
    host: { name: "Sophie", avatar: "https://i.pravatar.cc/120?img=49", superhost: true },
    lat: 51.5074, lng: -0.1278,
    description:
      "A Shoreditch loft with exposed brick, Edison bulbs, and a long oak table — built for collaboration.",
  },
];

export const popularCities = [
  { name: "Lisbon", count: 142, emoji: "🇵🇹" },
  { name: "Berlin", count: 318, emoji: "🇩🇪" },
  { name: "New York", count: 482, emoji: "🇺🇸" },
  { name: "Tokyo", count: 207, emoji: "🇯🇵" },
  { name: "Bali", count: 96, emoji: "🇮🇩" },
  { name: "Mexico City", count: 134, emoji: "🇲🇽" },
];

// Chat mock
export type Message = {
  id: string;
  from: "me" | "them";
  text: string;
  at: number;
  status?: "sent" | "delivered" | "seen";
};

export type Conversation = {
  id: string;
  hostName: string;
  workspaceTitle: string;
  avatar: string;
  online: boolean;
  unread: number;
  messages: Message[];
};

const now = Date.now();

export const initialConversations: Conversation[] = [
  {
    id: "c1",
    hostName: "Marta",
    workspaceTitle: "Glasshouse Private Studio",
    avatar: "https://i.pravatar.cc/120?img=47",
    online: true,
    unread: 2,
    messages: [
      { id: "m1", from: "them", text: "Hey! Welcome to Workship 👋", at: now - 1000 * 60 * 60 * 3 },
      { id: "m2", from: "me", text: "Hi Marta — is the studio free Friday afternoon?", at: now - 1000 * 60 * 60 * 2, status: "seen" },
      { id: "m3", from: "them", text: "Yes, fully open from 1pm. Want me to hold it for you?", at: now - 1000 * 60 * 30 },
      { id: "m4", from: "them", text: "Also: fresh espresso machine just arrived ☕", at: now - 1000 * 60 * 12 },
    ],
  },
  {
    id: "c2",
    hostName: "Jonas",
    workspaceTitle: "Atelier Coworking Lounge",
    avatar: "https://i.pravatar.cc/120?img=15",
    online: false,
    unread: 0,
    messages: [
      { id: "m1", from: "me", text: "Booked for Tuesday — see you then!", at: now - 1000 * 60 * 60 * 24, status: "seen" },
      { id: "m2", from: "them", text: "Perfect, I'll keep your favourite spot 😉", at: now - 1000 * 60 * 60 * 23 },
    ],
  },
  {
    id: "c3",
    hostName: "Aditi",
    workspaceTitle: "Skyline Rooftop Desk",
    avatar: "https://i.pravatar.cc/120?img=32",
    online: true,
    unread: 0,
    messages: [
      { id: "m1", from: "them", text: "Sunset is around 6:42pm today — beautiful working light 🌇", at: now - 1000 * 60 * 60 * 5 },
    ],
  },
];
