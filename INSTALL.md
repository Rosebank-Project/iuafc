## Installation and Setup

Follow the steps below to install and run the Church Management System locally.

### Prerequisites

Before installing the project, make sure you have the following software installed:

- **Node.js** — required to run the Next.js application
- **npm** — Node.js package manager
- **Git** — required to clone the repository

You can verify that they are installed by running:

```bash
node --version
npm --version
git --version
```

### 1. Clone the Repository

Clone the project repository from GitHub:

```bash
git clone https://github.com/Rosebank-Project/iuafc.git
```

Navigate to the project directory:

```bash
cd iuafc
```

### 2. Install Dependencies

Install all project dependencies using npm:

```bash
npm install
```

This will install the dependencies defined in `package.json`, including Next.js, React, TypeScript, Tailwind CSS, Radix UI and other libraries used by the application.

### 3. Run the Development Server

Start the Next.js development server:

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

Open the address in a web browser to access the application.

### 4. Available Commands

The project provides the following npm scripts:

#### Development

Starts the application in development mode:

```bash
npm run dev
```

#### Production Build

Creates an optimized production build:

```bash
npm run build
```

#### Production Server

Starts the application using the production build:

```bash
npm start
```

#### Lint

Checks the project for ESLint issues:

```bash
npm run lint
```

### 5. Building for Production

To create a production-ready version of the application, run:

```bash
npm run build
```

After the build completes successfully, start the production server with:

```bash
npm start
```

The application will then be available at:

```text
http://localhost:3000
```

### Troubleshooting

If you experience dependency-related issues during installation, remove the existing dependencies and reinstall them.

On Linux or macOS:

```bash
rm -rf node_modules
rm -f package-lock.json
npm install
```

On Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

If the application does not start, verify that:

- Node.js is installed and available in the terminal.
- All project dependencies were installed successfully.
- Port `3000` is not being used by another application.
- You are running the commands from the project root directory.
