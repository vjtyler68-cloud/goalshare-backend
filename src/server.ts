import { createServer, Server as HTTPServer } from 'http';
import app from './app';
import config from './config';
// import seedSuperAdmin from './app/DB';
import { setupWebSocket } from './app/middlewares/webSocket';

const port = config.port || 5000;

async function main() {
  const server: HTTPServer = createServer(app);

  server.listen(port, async () => {
    console.log('Server is running on port ', port);
    // seedSuperAdmin();

    try {
      await setupWebSocket(server);
    
    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
      // Optionally close server on failure
      server.close(() => process.exit(1));
    }
  });

  const exitHandler = () => {
    if (server) {
      server.close(() => {
        console.info('Server closed!');
      });
    }
    process.exit(1);
  };

  process.on('uncaughtException', error => {
    console.log(error);
    exitHandler();
  });

  process.on('unhandledRejection', error => {
    console.log(error);
    exitHandler();
  });
}

main();
