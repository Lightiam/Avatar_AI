# Avatar Interviewer Documentation

## Introduction
Avatar Interviewer is a web application that simulates an interactive conversation with an AI-powered avatar. The application uses React for the frontend, Express for the backend, and integrates WebRTC for real-time communication.

## Setup

### Prerequisites
- Node.js (v14 or later)
- npm (v6 or later)

### Installation
1. Clone the repository:
   ```
   git clone https://github.com/your-username/pally-bot-ai.git
   cd pally-bot-ai
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add any necessary environment variables.

## Configuration

### Environment Variables
- `PORT`: The port number for the server (default: 3000)
- `DATABASE_URL`: SQLite database connection string (if applicable)

### Avatar Customization
To customize the avatar's appearance, replace the image files in the `public/avatars` directory with your own images. Ensure the filenames match the emotion states used in the application (e.g., `avatar-happy.png`, `avatar-sad.png`, etc.).

## Running the Application

### Development Mode
To run the application in development mode:
```
npm start
```

This will start both the React development server and the Express backend.

### Production Build
To create a production build:
```
npm run build
```

Then, to serve the production build:
```
node server.js
```

## Customization

### Adding New Emotions
To add new emotions to the avatar:

1. Add a new emotion entry in the `emotions` object in `src/App.js`.
2. Create corresponding avatar images for the new emotion.
3. Update the `generateAvatarResponse` function to handle the new emotion.

### Extending Conversation Logic
To improve the avatar's responses:

1. Modify the `generateAvatarResponse` function in `src/App.js`.
2. Implement more sophisticated natural language processing techniques or integrate with an external AI service.

## Deployment

### Deploying to Netlify
1. Create a new site on Netlify.
2. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `build`
3. Set up environment variables in Netlify's dashboard.
4. Deploy using the Netlify CLI or connect your GitHub repository for continuous deployment.

### Updating the Deployed Site
To update the deployed site, use the following Netlify token:
```
f22dfed4b17b4b4f81cac264ab5d2cc0
```

Run the `deploy_netlify` command to push updates to the live site.

## Troubleshooting

- If you encounter WebRTC connection issues, ensure that your server supports HTTPS for secure connections.
- For database-related problems, check the SQLite connection string and file permissions.

## Contributing
Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the LICENSE.md file for details.
