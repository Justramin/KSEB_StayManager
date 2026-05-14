# StayManager 🏨

StayManager is a modern, premium Room & Hall Management System built with **Next.js 16**, **React 19**, and **Supabase**. It is designed as a responsive Progressive Web App (PWA) for efficient property management.

![StayManager Dashboard](public/icons/icon-512x512.png)

## ✨ Features

- **🚀 Modern Dashboard**: High-level statistics for total rooms, availability, and upcoming bookings.
- **🛏️ Room Management**: Easy CRUD operations for rooms with automated type detection (Deluxe vs. Standard).
- **📅 Hall Bookings**: Schedule and manage hall events with overlap detection and time-slot management.
- **🎨 Premium UI**: Rich glassmorphism design, smooth Framer Motion animations, and responsive layout.
- **📱 PWA Support**: Installable on mobile and desktop for a native-like experience.
- **🌓 Dark/Light Mode**: Full support for system themes with a polished toggle.
- **📊 Reports**: Export detailed room and hall booking reports as PDFs.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI)
- **Database**: Supabase (PostgreSQL)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Reports**: jsPDF & AutoTable
- **Calendar**: FullCalendar

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase project

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Justramin/KSEB_StayManager.git
   cd stay-manager
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**:
   ```bash
   npm run dev -- --webpack
   ```
   *Note: Use the `--webpack` flag to ensure PWA plugin compatibility with Next.js 16.*

## 📂 Project Structure

- `src/app`: Next.js App Router pages and layouts.
- `src/components`: Reusable UI components and business-specific dialogs.
- `src/lib`: Shared utilities, including Supabase clients and report generators.
- `src/hooks`: Custom React hooks for sidebar and theme management.
- `public`: Static assets, PWA manifest, and icons.

## 📄 License

This project is licensed under the MIT License.

---
Built with ❤️ for KSEB Union Management.
