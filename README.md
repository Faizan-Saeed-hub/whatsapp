# 💬 WhatsApp Web Clone (React + Supabase + Real-Time)

A full-featured, real-time WhatsApp Web clone built with React, Supabase PostgreSQL, WebSockets Broadcast, and pure CSS design system matching official WhatsApp Web.

---

## ✨ Features

- ⚡ **Real-Time Messaging**: WebSockets broadcast channels & PostgreSQL real-time subscriptions across all clients.
- 🔒 **Direct 1-on-1 Chats (by 6-Digit ID)**: Unique `#680623` tag identification system with personal notes / saved messages.
- 👥 **Group Chats & Member Management**: Create groups, add registered members by ID or Email, and moderate members.
- 🛡️ **Exclusive Admin Panel**: Dedicated real-time chat monitor & group moderation for authorized administrator (`Faizan0687@gmail.com`).
- 🎬 **Video Attachment & Playback (Max 10 MB)**: Inline HTML5 video player with fullscreen mode and non-blocking downloader.
- 📄 **Interactive PDF Document Viewer**: Embedded PDF reader with download and open-in-tab actions.
- 📸 **Photo / Media Gallery**: Non-blocking binary blob downloader for zero-lag downloads.
- 🎙️ **Voice Notes**: In-chat recording and visual playback scrubbers.
- 🏷️ **Message Delivery & Seen Status**: Single tick (sent), double gray ticks (delivered), double blue ticks (read).
- 😃 **Message Reactions**: Top floating reaction bar with auto-close on blank area click.
- 🌓 **Light & Dark Themes**: Fully responsive, high-contrast WhatsApp Dark & Light palettes.
- ⌨️ **Keyboard Shortcuts**: Press `ESC` at any time to close active chat or modal.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://ruthfktdlchsvcwwtwef.supabase.co
VITE_SUPABASE_KEY=your_supabase_publishable_key
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## 🛡️ Admin Access

- **Admin Name**: Muhammad Faizan
- **Admin Email**: `Faizan0687@gmail.com`
- **Admin Password**: `Faizan@0687`

---

## 📦 Deployment

Deployable with 1-click on [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` to your deployment environment variables.
