# Chessboard Magic Open Source

I started my chess programming journey in October 2023. At the time, I was about three years into learning chess, and I also wanted to get back into programming. Chess felt like the right place to begin — something I cared about, something I was already studying, and something that gave me endless small ideas to build.

The first version of Chessboard Magic was released in May 2024 with five small applications. Since then, it has grown far beyond what I originally expected. I have now built more than 60 chess applications, ranging from small experiments to much more complex tools.

I have also written several Lichess blogs about programming in chess, but I recently started thinking about going one step further. Instead of only writing about the ideas, why not extract and document part of the codebase so that other people could use it as a reference?

So that is what I have done.

This repository contains 30 items from Chessboard Magic, released under the MIT license. The code is free to use, copy, modify, and adapt in your own projects — personal, educational, open-source, or commercial.

## Motivation

I do not believe every chess app needs to become big, polished, or commercial. Most ideas will remain small. Some will be experiments. Some will only be useful to a handful of people. But if hundreds or thousands of chess apps are created, there is always a chance that one of them becomes genuinely useful, original, or even transformational.

Chess has benefited enormously from open tools — public databases, engines, analysis boards, study platforms, and community projects. My hope is that this repository helps someone build their own chess idea faster, or at least gives them a useful reference point when starting out.

Because the more people building chess tools, the more likely it is that the chess community discovers applications we truly love.

## Tech Stack

A React-based chess app built with Vite, React, React-Chessboard, Stockfish.js, TypeScript, Tailwind CSS 4, shadcn/ui, React Router, Zustand, Vitest, ESLint, and Prettier.

## Prerequisites

- Node.js 20+
- npm 10+

## Getting Started

This project is a Vite + React application. You do not need any special setup beyond Node.js and npm.

### 1. Install Node.js

Make sure you have Node.js installed.

This project expects:

- Node.js 20 or newer
- npm 10 or newer

You can check your installed versions with:

```bash
node -v
npm -v
```

### 2. Clone the repository

```bash
git clone https://github.com/HollowLeaf1981/chessboardmagic-os.git
cd chessboardmagic-os
```

### 3. Install the dependencies

From inside the project folder, run:

```bash
npm install
```

This downloads everything the project needs to run locally.

### 4. Start the development server

```bash
npm run dev
```

After the command runs, Vite will show a local development URL in the terminal, usually something like:

```bash
http://localhost:5173
```

Open that URL in your browser to view the application.

## Project Structure

Most of the project lives inside the `src` folder.

```bash
src/
├── components/   Shared layout and UI components
├── config/       Application configuration
├── data/         Data files used by the various chess applications
├── lib/          Shared helper functions, utilities, and library-style code
├── pages/        Self-contained chess applications, each with its own README
├── stores/       Shared application state and storage logic
├── test/         Test setup and test scripts
├── App.tsx       Main application routing
└── main.tsx      Application entry point
```

## Scripts

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Start development server         |
| `npm run build`        | Production build                 |
| `npm run preview`      | Preview production build locally |
| `npm run lint`         | Run ESLint                       |
| `npm run lint:fix`     | Run ESLint and auto-fix issues   |
| `npm run format`       | Format all files with Prettier   |
| `npm run format:check` | Check formatting without writing |
| `npm test`             | Run unit tests (watch mode)      |
| `npm run test:run`     | Run tests once (CI mode)         |
| `npm run test:ui`      | Run tests with Vitest UI         |

## License

MIT — see [LICENSE](./LICENSE) for details.
