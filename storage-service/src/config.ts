interface MinioConfig {
  accessKey: string;
  secretKey: string;
  host: string;
  port: number;
}
interface Config {
  host: string;
  port: number;
  allowOrigin: string;
  storage: MinioConfig;
}

const config: Config = {
  host: process.env.STORAGE_SERVICE_HOST || "localhost",
  port: Number(process.env.STORAGE_SERVICE_PORT) || 8090,
  allowOrigin: process.env.ACCESS_CONTROL_ALLOW_ORIGIN || "*",
  storage: {
    accessKey: process.env.MINIO_ACCESS_KEY || "minio",
    secretKey: process.env.MINIO_SECRET_KEY || "minio123",
    host: process.env.MINIO_HOST || "localhost",
    port: Number(process.env.MINIO_PORT) || 9000,
  },
};

export default config;
