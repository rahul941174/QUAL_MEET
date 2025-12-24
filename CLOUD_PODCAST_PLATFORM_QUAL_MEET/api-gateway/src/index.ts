import app from "./app";
import { PORT } from "./config/env";


app.listen(PORT, () => {
  console.log(`🚀 API gateway running on port ${PORT}`);
});


