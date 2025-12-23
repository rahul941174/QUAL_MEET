import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log(`🚀 Auth Service running on port ${PORT}`);
});


