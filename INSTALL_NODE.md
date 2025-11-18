# How to Install Node.js and npm on macOS

npm comes bundled with Node.js, so you only need to install Node.js.

## Option 1: Official Installer (Recommended - Easiest)

1. **Go to the official Node.js website:**
   - Visit: https://nodejs.org/
   - Click the "LTS" (Long Term Support) version button
   - This downloads the macOS installer (.pkg file)

2. **Run the installer:**
   - Open the downloaded `.pkg` file
   - Follow the installation wizard
   - It will install both Node.js and npm

3. **Verify installation:**
   Open Terminal and run:
   ```bash
   node --version
   npm --version
   ```

## Option 2: Using Homebrew (If you have it)

If you have Homebrew installed:

```bash
brew install node
```

Then verify:
```bash
node --version
npm --version
```

## Option 3: Using nvm (Node Version Manager) - Advanced

This allows you to manage multiple Node.js versions:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.zshrc

# Install latest LTS Node.js
nvm install --lts
nvm use --lts
```

## After Installation

Once Node.js and npm are installed, you can:

1. **Navigate to your project:**
   ```bash
   cd /Users/mathildeanitathierry/Desktop/adscroll-rewards-main
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Start the dev server:**
   ```bash
   npm run dev
   ```

## Troubleshooting

- **If `npm` command not found after installation:**
  - Restart your terminal
  - Or run: `source ~/.zshrc` (if using zsh)
  - Or run: `source ~/.bash_profile` (if using bash)

- **Check if already installed:**
  ```bash
   which node
   which npm
   ```

## Alternative: Use Bun (Faster)

If you prefer a faster alternative to npm:

1. **Install Bun:**
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Use Bun instead of npm:**
   ```bash
   bun install    # instead of npm install
   bun dev        # instead of npm run dev
   ```

Bun is compatible with npm packages but much faster!

