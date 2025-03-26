import * as path from 'path';

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  database: {
    path: process.env.DATABASE_PATH || path.join(process.cwd(), 'data/db.sqlite'),
  },
});
