# Hannaford Shopping List Manager

⚠️ **WARNING: This project is currently a work in progress and is not functional in its current state** ⚠️

## Overview
This application is designed to help manage shopping lists for Hannaford supermarket, allowing users to access their Hannaford account data programmatically.

## Prerequisites
- Node.js (Latest LTS version recommended)
- npm
- A Hannaford online account

## Setup Instructions

1. Clone this repository:
```bash
git clone [repository-url]
cd [repository-name]
```

2. Install dependencies:
```bash
npm install
```

3. Start the application with your Hannaford credentials:
```bash
npm run start:hannaford
```
This will prompt you for your Hannaford username and password, which will be stored locally in a `.env.local` file.

## Security Note
Your credentials are stored locally in `.env.local` and are only used to authenticate with Hannaford's services. Never commit this file to version control.

## Development Status
This project is currently under active development. Many features are not yet implemented or may not work as expected. Please check back later for updates.

## Contributing
As this is a work in progress, contributions are welcome. Please feel free to submit issues and pull requests.
