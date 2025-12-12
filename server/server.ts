import app from "./src/app";
import { config } from "./src/config/config";
import connectDB from "./src/config/db";

const startServer = async () => {
  // Connect database
  await connectDB();

  const port = Number(config.port) || 4000;

  app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
  });
};

startServer();
