import path from 'path';
import dotenv from 'dotenv';

const rootDir = path.resolve('.');
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env.local') });

const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
