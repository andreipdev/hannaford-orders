# Hannaford Shopping List Manager

This application helps manage shopping lists for Hannaford supermarket, allowing users to access their Hannaford account data programmatically.

## Features

- Securely store Hannaford account credentials locally
- Fetch and display Hannaford shopping list data
- Categorize and analyze shopping list items
- View monthly breakdowns of spending by category
- Customize category mappings and default prices

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
This project is under active development but is functional in its current state. Some planned features may not yet be implemented. Please check back for updates and feel free to contribute!

## Contributing
As this is a work in progress, contributions are welcome. Please feel free to submit issues and pull requests.
