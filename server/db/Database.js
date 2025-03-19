import { connect } from "mongoose";
import process from "process";

const connectDatabase = () => {
  connect(process.env.DB_URL).then((data) => {
    console.log(`mongod connected with server: ${data.connection.host}`);
  });
};

export default connectDatabase;
