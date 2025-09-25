import { createServer, Server as HTTPServer } from 'http';
import app from './app';

import config from './config';
import { Server } from 'socket.io';
import { initSocket } from './app/utils/socket';
import seedSuperAdmin from './app/DB';

const port = config.port || 5000;

async function main() {
  const server: HTTPServer = createServer(app).listen(port, () => {
    console.log('Sever is running on port ', port);
    seedSuperAdmin();
  });

  const io = initSocket(server);

  io.on('connection', socket => {
    console.log('User connected:', socket.id);
    socket.on('register', (userId: string) => {
      socket.join(userId);
      console.log(`User ${userId} joined their personal room`);
    });
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
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
